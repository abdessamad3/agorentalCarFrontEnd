import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router, RouterModule } from '@angular/router';
import { CrudService } from '../../services/crud.service';
import { TranslationService } from '../../services/translation.service';
import { AuthService } from '../../services/auth.service';
import { UploadBtnComponent } from '../../shared/btn/upload-btn.component';
import { environment } from '../../../environments/environment';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

type ExpiredDocType = 'cin' | 'passeport' | 'permis';

interface ClientDoc {
  id: number;
  documentType: string;
  originalName: string;
  url: string;
  uploadedAt: string;
}

@Component({
  selector: 'app-reservation-create',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule, UploadBtnComponent],
  templateUrl: './reservation-create.component.html',
  styleUrls: ['./reservation-create.component.css']
})
export class ReservationCreateComponent implements OnInit {
  form: FormGroup;
  dir = 'ltr';
  isSubmitting = false;
  submitError = '';

  clients: any[] = [];
  voitures: any[] = [];
  accessoires: any[] = [];
  reservations: any[] = [];

  clientSearch = '';
  showClientDropdown = false;
  filteredClients: any[] = [];
  selectedClient: any = null;
  showAddClientModal = false;
  newClientForm: FormGroup;
  addingClient = false;

  expiryWarningDismissed = false;
  uploadedDocTypes = new Set<ExpiredDocType>();
  expiredDocUpdates: Record<ExpiredDocType, { expiration: string; issueDate: string }> = {
    cin:       { expiration: '', issueDate: '' },
    passeport: { expiration: '', issueDate: '' },
    permis:    { expiration: '', issueDate: '' },
  };
  savingDocType: ExpiredDocType | null = null;
  clientDocs: ClientDoc[] = [];
  private static readonly DOC_DATE_FIELDS: Record<ExpiredDocType, { expiration: string; issueDate: string }> = {
    cin:       { expiration: 'cinExpiration',       issueDate: 'cinDelivreLe' },
    passeport: { expiration: 'passeportExpiration', issueDate: 'passeportDelivreLe' },
    permis:    { expiration: 'permisExpiration',    issueDate: 'permisDelivreLe' },
  };

  debtWarningDismissed = false;
  debtConfirmRequired = false;
  overrideDebtWarning = false;

  selectedVoiture: any = null;

  selectedAccessoires: Set<number> = new Set();

  get numberOfDays(): number {
    const start = this.form.get('dateDebut')?.value;
    const end = this.form.get('dateFin')?.value;
    if (!start || !end) return 0;
    const diff = new Date(end).getTime() - new Date(start).getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }

  get dailyRate(): number {
    return this.selectedVoiture?.prixJour || 0;
  }

  get vehicleTotal(): number {
    return this.dailyRate * this.numberOfDays;
  }

  get accessoryTotal(): number {
    return this.voitures.length === 0 ? 0 :
      Array.from(this.selectedAccessoires)
        .map(id => this.accessoires.find((a: any) => a.id === id))
        .filter(Boolean)
        .reduce((s, a: any) => s + (parseFloat(a.prix || 0) * this.numberOfDays), 0);
  }

  get totalAmount(): number {
    return this.vehicleTotal + this.accessoryTotal;
  }

  get isComplianceBlocked(): boolean {
    const overall = this.selectedVoiture?.compliance?.overall;
    return overall === 'EXPIRED' || overall === 'UNKNOWN';
  }

  get complianceBlockDocs(): string {
    if (!this.selectedVoiture?.compliance) return '';
    const c = this.selectedVoiture.compliance;
    const labels: Record<string, string> = { vignette: 'Vignette', assurance: 'Assurance', visite: 'Visite technique' };
    return ['vignette', 'assurance', 'visite']
      .filter(k => c[k]?.status === 'EXPIRED' || c[k]?.status === 'UNKNOWN')
      .map(k => labels[k]).join(', ');
  }

  get remaining(): number {
    const paid = parseFloat(this.form.get('montantPaye')?.value || 0);
    return this.totalAmount - paid;
  }

  constructor(
    private fb: FormBuilder,
    private crud: CrudService,
    private ts: TranslationService,
    private router: Router,
    private http: HttpClient,
    private auth: AuthService,
  ) {
    this.form = this.fb.group({
      clientId:   [null, Validators.required],
      voitureId:  [null, Validators.required],
      dateDebut:  ['', Validators.required],
      dateFin:    ['', Validators.required],
      reservationStatus: ['pending'],
      modePaiement: ['especes'],
      montantPaye: [0, [Validators.min(0)]],
      notes:      [''],
    });

    this.newClientForm = this.fb.group({
      nom:      ['', Validators.required],
      prenom:   [''],
      telephone:[''],
      cin:      [''],
    });
  }

  ngOnInit() {
    this.ts.direction$.subscribe(d => this.dir = d);
    this.loadData();

    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    this.form.patchValue({
      dateDebut: today.toISOString().slice(0, 16),
      dateFin: tomorrow.toISOString().slice(0, 16),
    });
  }

  loadData() {
    forkJoin({
      voitures:     this.crud.getAll('voiture').pipe(catchError(() => of([]))),
      accessoires:  this.crud.getAll('accessoire').pipe(catchError(() => of([]))),
      reservations: this.crud.getAll('reservation').pipe(catchError(() => of([]))),
    }).subscribe(({ voitures, accessoires, reservations }) => {
      this.voitures = Array.isArray(voitures) ? voitures : (voitures as any)?.data ?? [];
      this.accessoires  = Array.isArray(accessoires)  ? accessoires  : (accessoires  as any)?.data ?? [];
      this.reservations = Array.isArray(reservations) ? reservations : (reservations as any)?.data ?? [];
    });

    this.crud.getAll('client').pipe(catchError(() => of([]))).subscribe(r => {
      this.clients = Array.isArray(r) ? r : (r as any)?.data ?? [];
      this.filteredClients = this.clients;
    });
  }

  onClientSearch() {
    const q = this.clientSearch.toLowerCase();
    this.filteredClients = q
      ? this.clients.filter(c => `${c.nom} ${c.prenom}`.toLowerCase().includes(q) || (c.telephone || '').includes(q))
      : this.clients;
    this.showClientDropdown = true;
  }

  selectClient(client: any) {
    this.selectedClient = client;
    this.clientSearch = `${client.nom} ${client.prenom || ''}`.trim();
    this.form.patchValue({ clientId: client.id });
    this.showClientDropdown = false;
    this.expiryWarningDismissed = false;
    this.uploadedDocTypes.clear();
    this.resetExpiredDocUpdates();
    this.loadClientDocs();
    this.debtWarningDismissed = false;
    this.debtConfirmRequired = false;
    this.overrideDebtWarning = false;
  }

  private loadClientDocs(): void {
    if (!this.selectedClient) { this.clientDocs = []; return; }
    this.http.get<ClientDoc[]>(`${environment.apiUrl}/client/${this.selectedClient.id}/documents`).subscribe({
      next: (docs) => this.clientDocs = docs,
      error: () => this.clientDocs = [],
    });
  }

  /** Existing uploaded files for one expired doc type — lets staff open/download what the
   *  client already provided before deciding whether a fresh photo is actually needed. */
  docsOf(type: ExpiredDocType): ClientDoc[] {
    return this.clientDocs.filter(d => d.documentType === type);
  }

  trackByDocId(_: number, doc: ClientDoc): number {
    return doc.id;
  }

  isImageDoc(doc: ClientDoc): boolean {
    return /\.(jpg|jpeg|png|webp)$/i.test(doc.originalName);
  }

  openClientDoc(doc: ClientDoc): void {
    window.open(environment.apiUrl.replace('/api', '') + doc.url, '_blank');
  }

  private resetExpiredDocUpdates(): void {
    this.expiredDocUpdates = {
      cin:       { expiration: '', issueDate: '' },
      passeport: { expiration: '', issueDate: '' },
      permis:    { expiration: '', issueDate: '' },
    };
  }

  /** Stable identity for *ngFor — expiredClientDocs returns a fresh array/objects on every
   *  read, so without a string-keyed trackBy, Angular's default identity diffing would
   *  destroy+recreate the row (including the focused date input) on every change-detection
   *  pass, and destroying a focused input fires blur, which triggers another CD pass —
   *  an infinite loop that froze the tab with no console error. */
  trackByDocType(_: number, doc: { type: ExpiredDocType; label: string }): string {
    return doc.type;
  }

  /** Soft warning only (per business decision) — does not block reservation creation. */
  get expiredClientDocs(): { type: ExpiredDocType; label: string }[] {
    if (!this.selectedClient) return [];
    const docs: { type: ExpiredDocType; label: string }[] = [];
    if (this.selectedClient.cinExpired)       docs.push({ type: 'cin', label: 'CIN' });
    if (this.selectedClient.passeportExpired) docs.push({ type: 'passeport', label: this.t('passeport') });
    if (this.selectedClient.permisExpired)    docs.push({ type: 'permis', label: this.t('permisConduire') });
    return docs;
  }

  get showExpiryWarning(): boolean {
    return !this.expiryWarningDismissed && this.expiredClientDocs.length > 0;
  }

  dismissExpiryWarning(): void {
    this.expiryWarningDismissed = true;
  }

  /** Informational only — purely a heads-up so staff know before they start filling out the
   *  form. The actual gate (staff blocked / manager must confirm) is enforced server-side at
   *  submit time, since that's where the configured threshold and role check live. */
  get showDebtWarning(): boolean {
    return !this.debtWarningDismissed && (this.selectedClient?.outstandingDebt ?? 0) > 0;
  }

  dismissDebtWarning(): void {
    this.debtWarningDismissed = true;
  }

  get isManagerOrAdmin(): boolean {
    return this.auth.hasAnyRole('ROLE_MANAGER', 'ROLE_ADMIN');
  }

  onExpiredDocFiles(files: File[], type: ExpiredDocType): void {
    if (!this.selectedClient || !files.length) return;
    files.forEach(file => {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('documentType', type);
      this.http.post(`${environment.apiUrl}/client/${this.selectedClient.id}/documents`, fd).subscribe({
        next: () => { this.uploadedDocTypes.add(type); this.loadClientDocs(); },
      });
    });
  }

  clearClient() {
    this.selectedClient = null;
    this.clientSearch = '';
    this.form.patchValue({ clientId: null });
    this.expiryWarningDismissed = false;
    this.uploadedDocTypes.clear();
    this.resetExpiredDocUpdates();
    this.clientDocs = [];
    this.debtWarningDismissed = false;
    this.debtConfirmRequired = false;
    this.overrideDebtWarning = false;
  }

  /** Updates the client's expiration/issue date for one expired document type, then re-fetches
   *  the canonical client so expiredClientDocs reflects the backend's authoritative isExpired()
   *  check — a doc only drops off the warning once the new expiration date is genuinely future. */
  saveExpiredDocDates(type: ExpiredDocType): void {
    if (!this.selectedClient) return;
    const upd = this.expiredDocUpdates[type];
    const fields = ReservationCreateComponent.DOC_DATE_FIELDS[type];
    const payload: any = {};
    if (upd.expiration) payload[fields.expiration] = upd.expiration;
    if (upd.issueDate)  payload[fields.issueDate] = upd.issueDate;
    if (!Object.keys(payload).length) return;

    this.savingDocType = type;
    this.crud.update('client', this.selectedClient.id, payload).subscribe({
      next: () => {
        this.crud.getById('client', this.selectedClient.id).subscribe({
          next: (fresh: any) => {
            this.selectedClient = fresh;
            this.expiredDocUpdates[type] = { expiration: '', issueDate: '' };
            this.savingDocType = null;
          },
          error: () => { this.savingDocType = null; },
        });
      },
      error: () => { this.savingDocType = null; },
    });
  }

  openAddClient() { this.showAddClientModal = true; this.newClientForm.reset(); }
  closeAddClient() { this.showAddClientModal = false; }

  saveNewClient() {
    if (this.newClientForm.invalid) return;
    this.addingClient = true;
    this.crud.create('client', this.newClientForm.value).subscribe({
      next: (created: any) => {
        this.clients.unshift(created);
        this.selectClient(created);
        this.closeAddClient();
        this.addingClient = false;
      },
      error: () => { this.addingClient = false; }
    });
  }

  isVoitureConflicted(voitureId: number): boolean {
    const start = this.form.get('dateDebut')?.value;
    const end   = this.form.get('dateFin')?.value;
    if (!start || !end || !voitureId) return false;
    const s = new Date(start); s.setHours(0, 0, 0, 0);
    const e = new Date(end);   e.setHours(23, 59, 59, 999);
    return this.reservations.some(r => {
      const rId = r.voiture?.id ?? r.voitureId;
      if (rId !== voitureId) return false;
      const st = (r.reservationStatus || r.statut || '').toLowerCase();
      if (['cancelled', 'annulee', 'annule'].includes(st)) return false;
      const rs = new Date(r.dateDebut); rs.setHours(0, 0, 0, 0);
      const re = new Date(r.dateFin);   re.setHours(23, 59, 59, 999);
      return s <= re && e >= rs;
    });
  }

  isVignetteExpired(voiture: any): boolean {
    const status = voiture.compliance?.vignette?.status;
    if (status) return status === 'EXPIRED';
    return voiture.voitureStatus === 'hors_service';
  }

  selectVoiture(voiture: any) {
    if (this.isVoitureConflicted(voiture.id)) return;
    if (this.isVignetteExpired(voiture)) return;
    this.selectedVoiture = voiture;
    this.form.patchValue({ voitureId: voiture.id });
    this.submitError = '';
  }

  toggleAccessoire(id: number) {
    if (this.selectedAccessoires.has(id)) {
      this.selectedAccessoires.delete(id);
    } else {
      this.selectedAccessoires.add(id);
    }
  }

  isAccessoireSelected(id: number): boolean {
    return this.selectedAccessoires.has(id);
  }

  onDateChange() {
    const start = this.form.get('dateDebut')?.value;
    const end = this.form.get('dateFin')?.value;
    if (start && end && new Date(end) <= new Date(start)) {
      const newEnd = new Date(start);
      newEnd.setDate(newEnd.getDate() + 1);
      this.form.patchValue({ dateFin: newEnd.toISOString().slice(0, 16) });
    }
  }

  submit() {
    if (this.form.invalid || !this.selectedVoiture) return;
    if (this.isVoitureConflicted(this.selectedVoiture.id)) {
      this.submitError = this.t('carAlreadyReserved');
      return;
    }
    this.isSubmitting = true;
    this.submitError = '';
    this.debtConfirmRequired = false;

    const payload = {
      ...this.form.value,
      montant: this.totalAmount,
      total: this.totalAmount,
      accessoireIds: Array.from(this.selectedAccessoires),
      overrideDebtWarning: this.overrideDebtWarning,
    };

    this.crud.create('reservation', payload).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.router.navigate(['/reservation']);
      },
      error: (err: any) => {
        this.isSubmitting = false;
        const code = err?.error?.error;
        if (code === 'debt_blocked') {
          this.submitError = err.error.message || this.t('debtBlocked');
        } else if (code === 'debt_warning') {
          // Only a manager/admin reaches this branch (staff get debt_blocked instead) — show
          // the confirm-and-retry control instead of a dead-end error.
          this.submitError = err.error.message || this.t('debtWarningConfirm');
          this.debtConfirmRequired = true;
        } else {
          this.submitError = this.ts.translate('loadError');
        }
      }
    });
  }

  /** Manager/admin explicitly acknowledging the debt warning — resubmits with the override
   *  flag set, which the backend logs for accountability. */
  confirmDebtOverrideAndSubmit(): void {
    this.overrideDebtWarning = true;
    this.debtConfirmRequired = false;
    this.submit();
  }

  t(key: string) { return this.ts.translate(key); }
}
