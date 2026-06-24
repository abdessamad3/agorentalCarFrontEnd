import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { CompanyService } from '../services/company.service';
import { ToastService } from '../services/toast.service';
import { TranslationService } from '../services/translation.service';
import { TranslatePipe } from '../pipes/translate.pipe';
import { environment } from '../../environments/environment';
import { UploadBtnComponent } from '../shared/btn/upload-btn.component';

type Tab = 'general' | 'localization' | 'rental' | 'notifications';

@Component({
  selector: 'app-parametres',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslatePipe, UploadBtnComponent],
  templateUrl: './parametres.component.html',
  styleUrls: ['../shared/styles/crud-list.css', './parametres.component.css']
})
export class ParametresComponent implements OnInit {
  activeTab: Tab = 'general';
  isSaving = false;
  saveSuccess = false;
  testEmailStatus: '' | 'sending' | 'sent' | 'error' = '';
  logoPreview: string | null = null;
  private logoFile: File | null = null;
  private blobUrl: string | null = null;
  showDeleteConfirm = false;

  bureaux: { id: number; nom: string }[] = [];
  selectedBureauId: number | null = null;

  tabs: { key: Tab; labelKey: string; icon: string }[] = [
    { key: 'general',       labelKey: 'general',       icon: '🏢' },
    { key: 'localization',  labelKey: 'localization',   icon: '🌍' },
    { key: 'rental',        labelKey: 'rentalRules',    icon: '📋' },
    { key: 'notifications', labelKey: 'notifications',  icon: '🔔' },
  ];

  form: FormGroup;

  isLoading = false;
  private readonly apiUrl = `${environment.apiUrl}/parametres`;

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private companyService: CompanyService,
    private toast: ToastService,
    private ts: TranslationService
  ) {
    this.logoPreview = companyService.getCurrentLogo();
    this.form = this.fb.group({
      companyName:  ['AGOCAR'],
      tradeName:    [''],
      ice:          [''],
      rc:           [''],
      cnss:         [''],
      taxId:        [''],
      address:      [''],
      city:         [''],
      region:       [''],
      postalCode:   [''],
      phone:        [''],
      email:        [''],
      website:      [''],
      whatsapp:     [''],

      currency:          ['MAD'],
      language:          ['fr'],
      dateFormat:        ['DD/MM/YYYY'],
      timezone:          ['Africa/Casablanca'],
      distanceUnit:      ['km'],
      vatRate:           [20],
      vatLabel:          ['TVA'],
      showVatBreakdown:  [true],

      minDuration:           [1],
      maxDuration:           [30],
      advanceBookingLimit:   [90],
      defaultPickupTime:     ['09:00'],
      defaultReturnTime:     ['09:00'],
      gracePeriod:           [1],
      defaultDeposit:        [2000],
      lateReturnFee:         [100],
      requireDeposit:        [true],
      allowPartialPayments:  [false],
      autoGenerateContract:  [true],
      autoGenerateInvoice:   [true],
      requireSignature:      [false],
      contractFooterNote:    [''],

      notifNewReservation:   [true],
      notifContractActivated:[true],
      notifReturnOverdue:    [true],
      notifPaymentReceived:  [true],
      notifMaintenanceDue:   [true],
      notifInsuranceExpiry:  [true],
      notifInspectionDue:    [true],
      adminAlertEmail:       [''],
      operationsEmail:       [''],
      financeAlertEmail:     [''],
    });
  }

  ngOnInit() {
    this.companyService.bureaux$.subscribe(list => {
      this.bureaux = list;
    });

    const loadFromApi = () => {
      this.http.get<any>(`${environment.apiUrl}/bureau`).subscribe({
        next: (res) => {
          const list: any[] = Array.isArray(res) ? res : (res?.data ?? []);
          const mapped = list.map(b => ({ id: b.id, nom: b.nom }));
          this.companyService.setBureaux(mapped);
          this.bureaux = mapped;
          if (this.bureaux.length > 0) {
            const savedId = this.companyService.getCurrentBureauId();
            const matched = savedId ? this.bureaux.find(b => b.id === savedId) : null;
            this.selectedBureauId = matched ? matched.id : this.bureaux[0].id;
            this.companyService.setCurrentBureau(this.selectedBureauId);
            this.loadSettings();
          }
        }
      });
    };

    const existing = this.companyService.getBureaux();
    if (existing.length > 0) {
      this.bureaux = existing;
      const savedId = this.companyService.getCurrentBureauId();
      const matched = savedId ? this.bureaux.find(b => b.id === savedId) : null;
      this.selectedBureauId = matched ? matched.id : this.bureaux[0].id;
      this.companyService.setCurrentBureau(this.selectedBureauId);
      this.loadSettings();
    } else {
      loadFromApi();
    }
  }

  loadSettings() {
    if (!this.selectedBureauId) return;
    this.isLoading = true;
    this.http.get<any>(`${this.apiUrl}/${this.selectedBureauId}`).subscribe({
      next: (data) => {
        this.form.patchValue(data);
        this.logoPreview = data.logo ?? null;
        this.companyService.setLogo(data.logo ?? null);
        if (data.companyName) {
          this.companyService.setCompanyName(data.companyName);
        }
        this.isLoading = false;
      },
      error: () => { this.isLoading = false; }
    });
  }

  onBureauChange(event: Event) {
    const select = event.target as HTMLSelectElement;
    this.selectedBureauId = +select.value;
    this.companyService.setCurrentBureau(this.selectedBureauId);
    this.loadSettings();
  }

  setTab(tab: Tab) {
    this.activeTab = tab;
  }

  onLogoChange(file: File) {
    if (!this.selectedBureauId) return;

    this.revokeBlobUrl();
    this.blobUrl = URL.createObjectURL(file);
    this.logoPreview = this.blobUrl;

    const fd = new FormData();
    fd.append('logoFile', file);
    this.http.post<{ logo: string }>(`${this.apiUrl}/${this.selectedBureauId}/logo`, fd).subscribe({
      next: (res) => {
        this.revokeBlobUrl();
        this.logoFile = null;
        this.logoPreview = res.logo;
        this.companyService.setLogo(res.logo);
      },
      error: () => {
        this.toast.show('Logo upload failed', 'error');
        this.revokeBlobUrl();
        this.logoPreview = this.companyService.getCurrentLogo();
      }
    });
  }

  removeLogo() {
    this.revokeBlobUrl();
    this.logoFile = null;
    this.logoPreview = null;
    this.companyService.setLogo(null);
  }

  private revokeBlobUrl() {
    if (this.blobUrl) {
      URL.revokeObjectURL(this.blobUrl);
      this.blobUrl = null;
    }
  }

  save() {
    if (!this.selectedBureauId) return;
    this.isSaving = true;
    const payload = { ...this.form.value, logo: this.logoPreview };
    this.http.put<any>(`${this.apiUrl}/${this.selectedBureauId}`, payload).subscribe({
      next: (data) => {
        this.isSaving = false;
        this.saveSuccess = true;
        setTimeout(() => (this.saveSuccess = false), 3000);
        if (data.companyName) {
          this.companyService.setCompanyName(data.companyName);
          if (this.selectedBureauId) {
            this.companyService.updateBureauName(this.selectedBureauId, data.bureauNom ?? data.companyName);
          }
        }
        this.logoPreview = data.logo ?? null;
        this.companyService.setLogo(data.logo ?? null);
        this.toast.show('Settings saved successfully', 'success');
      },
      error: () => {
        this.isSaving = false;
        this.toast.show('Failed to save settings', 'error');
      }
    });
  }

  sendTestEmail(): void {
    this.testEmailStatus = 'sending';
    this.http.post<any>(`${environment.apiUrl}/admin/test-email`, {}).subscribe({
      next: () => {
        this.testEmailStatus = 'sent';
        setTimeout(() => (this.testEmailStatus = ''), 5000);
      },
      error: () => {
        this.testEmailStatus = 'error';
        setTimeout(() => (this.testEmailStatus = ''), 5000);
      },
    });
  }

  confirmDelete() {
    this.showDeleteConfirm = true;
  }

  cancelDelete() {
    this.showDeleteConfirm = false;
  }
}
