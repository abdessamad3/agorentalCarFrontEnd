import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { CompanyService } from '../services/company.service';
import { ToastService } from '../services/toast.service';
import { TranslationService } from '../services/translation.service';
import { TranslatePipe } from '../pipes/translate.pipe';
import { environment } from '../../environments/environment';

type Tab = 'general' | 'localization' | 'rental' | 'notifications';

@Component({
  selector: 'app-parametres',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslatePipe, RouterLink],
  templateUrl: './parametres.component.html',
  styleUrls: ['../shared/styles/crud-list.css', './parametres.component.css']
})
export class ParametresComponent implements OnInit {
  activeTab: Tab = 'general';
  isSaving = false;
  saveSuccess = false;
  testEmailStatus: '' | 'sending' | 'sent' | 'error' = '';
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
    this.form = this.fb.group({
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

  save() {
    if (!this.selectedBureauId) return;
    this.isSaving = true;
    this.http.put<any>(`${this.apiUrl}/${this.selectedBureauId}`, this.form.value).subscribe({
      next: (data) => {
        this.isSaving = false;
        this.saveSuccess = true;
        setTimeout(() => (this.saveSuccess = false), 3000);
        if (data.bureauNom && this.selectedBureauId) {
          this.companyService.updateBureauName(this.selectedBureauId, data.bureauNom);
        }
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
