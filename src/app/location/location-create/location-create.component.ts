import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { CrudService } from '../../services/crud.service';
import { ToastService } from '../../services/toast.service';
import { TranslationService } from '../../services/translation.service';
import { UploadBtnComponent } from '../../shared/btn/upload-btn.component';
import { forkJoin, of } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { complianceSeverity } from '../../shared/utils/compliance.utils';
import { environment } from '../../../environments/environment';
import { LocationOption, filterMoroccoLocations, locationIcon } from '../../shared/data/morocco-locations';

type ExpiredDocType = 'cin' | 'passeport' | 'permis';

interface ClientDoc {
  id: number; documentType: string; originalName: string; url: string; uploadedAt: string;
}

@Component({
  selector: 'app-location-create',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, UploadBtnComponent],
  templateUrl: './location-create.component.html',
  styleUrls: ['./location-create.component.css']
})
export class LocationCreateComponent implements OnInit {
  /** Mirrors the backend's VehicleLifecycleState::blocksRental() -- a car in any of these
   *  states cannot start a new rental. Previously only 'brouillon'/'setup'/'vendu'/'vendue'
   *  were excluded here, so maintenance/hors_service/decommissioned/archive cars were
   *  still selectable. */
  private static readonly BLOCKING_STATUSES = new Set([
    'brouillon', 'setup', 'maintenance', 'hors_service', 'decommissioned', 'vendu', 'vendue', 'archive',
  ]);

  clients: any[]      = [];
  voitures: any[]     = [];
  accessoires: any[]  = [];
  reservations: any[] = [];

  clientSearch       = '';
  filteredClients: any[] = [];
  selectedClient: any   = null;
  showClientDropdown    = false;

  selectedVoiture: any  = null;
  selectedAccessoireIds: Set<number> = new Set();

  dateDebut  = '';
  dateFin    = '';
  lieuLivraison = '';
  lieuRetour    = '';
  modePaiement  = 'especes';
  montantPaye   = 0;
  remiseMontant: number | null = null;
  remiseMotif    = '';

  /** Server-computed live preview -- the only source of truth for pricing (seasonal rate
   *  rules live server-side). Never sent as-is on submit; the backend independently
   *  recomputes the real total from voitureId/dates/accessoireIds/remiseMontant, so this
   *  can never become the saved total even if tampered with client-side. */
  preview: { prixParJour: number; nbJours: number; accessoireTotal: number; total: number } | null = null;
  previewLoading = false;
  private previewTimer: any = null;

  showLivraisonDropdown = false;
  showRetourDropdown    = false;
  filteredLivraison: LocationOption[] = [];
  filteredRetour: LocationOption[]    = [];

  // Inline new client form
  showNewClientForm = false;
  newClient = { nom: '', telephone: '', cin: '', permisConduite: '' };
  savingClient = false;

  // Expired docs warning (same logic as reservation-create)
  expiryWarningDismissed = false;
  uploadedDocTypes = new Set<ExpiredDocType>();
  expiredDocUpdates: Record<ExpiredDocType, { expiration: string }> = {
    cin:       { expiration: '' },
    passeport: { expiration: '' },
    permis:    { expiration: '' },
  };
  savingDocType: ExpiredDocType | null = null;
  clientDocs: ClientDoc[] = [];

  // Outstanding debt warning (same logic as reservation-create) — informational
  // only, never blocks booking creation.
  debtWarningDismissed = false;

  get showDebtWarning(): boolean {
    return !this.debtWarningDismissed && (this.selectedClient?.outstandingDebt ?? 0) > 0;
  }

  dismissDebtWarning(): void {
    this.debtWarningDismissed = true;
  }

  private static readonly DOC_DATE_FIELDS: Record<ExpiredDocType, string> = {
    cin:       'cinExpiration',
    passeport: 'passeportExpiration',
    permis:    'permisExpiration',
  };

  private isDocExpiredOrSoon(expired: boolean, dateStr: string | null | undefined): boolean {
    if (expired) return true;
    if (!dateStr) return false;
    const exp = new Date(dateStr);
    const now = new Date(); now.setHours(0, 0, 0, 0);
    const limit = new Date(now); limit.setDate(limit.getDate() + 30);
    return exp > now && exp <= limit;
  }

  get expiredClientDocs(): { type: ExpiredDocType; label: string }[] {
    if (!this.selectedClient) return [];
    const c = this.selectedClient;
    const docs: { type: ExpiredDocType; label: string }[] = [];
    if (this.isDocExpiredOrSoon(c.cinExpired,       c.cinExpiration))       docs.push({ type: 'cin',       label: 'CIN' });
    if (this.isDocExpiredOrSoon(c.passeportExpired, c.passeportExpiration)) docs.push({ type: 'passeport', label: 'Passport' });
    if (this.isDocExpiredOrSoon(c.permisExpired,    c.permisExpiration))    docs.push({ type: 'permis',    label: 'Driver Licence' });
    return docs;
  }

  get showExpiryWarning(): boolean {
    return !this.expiryWarningDismissed && this.expiredClientDocs.length > 0;
  }

  dismissExpiryWarning(): void { this.expiryWarningDismissed = true; }

  private loadClientDocs(): void {
    if (!this.selectedClient) { this.clientDocs = []; return; }
    this.http.get<ClientDoc[]>(`${environment.apiUrl}/client/${this.selectedClient.id}/documents`).subscribe({
      next: docs => this.clientDocs = docs,
      error: ()   => this.clientDocs = [],
    });
  }

  docsOf(type: ExpiredDocType): ClientDoc[] {
    return this.clientDocs.filter(d => d.documentType === type);
  }

  trackByDocId(_: number, doc: ClientDoc): number { return doc.id; }

  trackByDocType(_: number, doc: { type: ExpiredDocType }): string { return doc.type; }

  isImageDoc(doc: ClientDoc): boolean {
    return /\.(jpg|jpeg|png|webp)$/i.test(doc.originalName);
  }

  openClientDoc(doc: ClientDoc): void {
    window.open(environment.apiUrl.replace('/api', '') + doc.url, '_blank');
  }

  get today(): string {
    return new Date().toISOString().substring(0, 10);
  }

  private resetExpiredDocUpdates(): void {
    this.expiredDocUpdates = {
      cin:       { expiration: '' },
      passeport: { expiration: '' },
      permis:    { expiration: '' },
    };
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

  saveExpiredDocDates(type: ExpiredDocType): void {
    if (!this.selectedClient) return;
    const upd    = this.expiredDocUpdates[type];
    const field  = LocationCreateComponent.DOC_DATE_FIELDS[type];
    const payload: any = {};
    if (upd.expiration) payload[field] = upd.expiration;
    if (!Object.keys(payload).length) return;
    this.savingDocType = type;
    this.crud.update('client', this.selectedClient.id, payload).subscribe({
      next: () => {
        this.crud.getById('client', this.selectedClient.id).subscribe({
          next: (fresh: any) => {
            this.selectedClient = fresh;
            this.expiredDocUpdates[type] = { expiration: '' };
            this.savingDocType = null;
          },
          error: () => { this.savingDocType = null; },
        });
      },
      error: () => { this.savingDocType = null; },
    });
  }

  isSubmitting = false;

  constructor(
    private crud: CrudService,
    private toast: ToastService,
    private ts: TranslationService,
    private http: HttpClient,
    public  router: Router,
    private route: ActivatedRoute,
  ) {}

  t(key: string) { return this.ts.translate(key); }

  ngOnInit() {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    this.dateDebut = now.toISOString().slice(0, 16);
    this.dateFin   = tomorrow.toISOString().slice(0, 16);

    forkJoin({
      voitures:     this.crud.getAll('voiture').pipe(catchError(() => of([]))),
      accessoires:  this.crud.getAll('accessoire').pipe(catchError(() => of([]))),
      reservations: this.crud.getAll('reservation').pipe(catchError(() => of([]))),
    }).subscribe(({ voitures, accessoires, reservations }) => {
      const allCars: any[] = Array.isArray(voitures) ? voitures : (voitures as any)?.data ?? [];
      this.voitures = allCars.filter((v: any) => {
        const s = (v.effectiveStatus || v.voitureStatus || '').toLowerCase();
        return !LocationCreateComponent.BLOCKING_STATUSES.has(s);
      });
      this.accessoires  = Array.isArray(accessoires)  ? accessoires  : (accessoires  as any)?.data ?? [];
      this.reservations = Array.isArray(reservations) ? reservations : (reservations as any)?.data ?? [];

      const preselectedId = this.route.snapshot.queryParamMap.get('voitureId');
      if (preselectedId) {
        const car = this.voitures.find((v: any) => v.id === +preselectedId);
        if (car) this.selectVoiture(car);
      }
    });

    this.crud.getPage('client').pipe(catchError(() => of({ data: [] } as any))).subscribe((r: any) => {
      this.clients = r?.data ?? [];
      this.filteredClients = this.clients;
    });
  }

  searchingClients = false;
  private clientSearchTimer: any = null;

  /** Was filtering the first 100 clients loaded at page init -- a client created earlier
   *  than that simply could never be found, no matter what was typed, and with no feedback
   *  that anything was wrong. Now does a real, debounced server-side search. */
  onClientSearch() {
    this.showClientDropdown = true;
    clearTimeout(this.clientSearchTimer);
    const q = this.clientSearch.trim();
    if (!q) { this.filteredClients = this.clients; this.searchingClients = false; return; }

    this.clientSearchTimer = setTimeout(() => {
      this.searchingClients = true;
      this.crud.getPage('client', { search: q, limit: 20 }).pipe(catchError(() => of({ data: [] } as any))).subscribe((r: any) => {
        this.filteredClients = r?.data ?? [];
        this.searchingClients = false;
      });
    }, 300);
  }

  selectClient(c: any) {
    this.selectedClient         = c;
    this.clientSearch           = c.nom;
    this.showClientDropdown     = false;
    this.expiryWarningDismissed = false;
    this.debtWarningDismissed   = false;
    this.uploadedDocTypes.clear();
    this.resetExpiredDocUpdates();
    this.loadClientDocs();
  }

  clearClient() {
    this.selectedClient         = null;
    this.clientSearch           = '';
    this.showClientDropdown     = false;
    this.expiryWarningDismissed = false;
    this.debtWarningDismissed   = false;
    this.uploadedDocTypes.clear();
    this.resetExpiredDocUpdates();
    this.clientDocs             = [];
  }

  private filterLocations(q: string): LocationOption[] {
    return filterMoroccoLocations(q);
  }

  locIcon(type: string) {
    return locationIcon(type);
  }

  onLivraisonFocus() {
    this.filteredLivraison = this.filterLocations(this.lieuLivraison);
    this.showLivraisonDropdown = true;
  }
  onLivraisonInput() {
    this.filteredLivraison = this.filterLocations(this.lieuLivraison);
    this.showLivraisonDropdown = true;
  }
  selectLivraison(loc: LocationOption) {
    this.lieuLivraison = loc.label;
    this.showLivraisonDropdown = false;
  }
  hideLivraison() { setTimeout(() => { this.showLivraisonDropdown = false; }, 150); }

  onRetourFocus() {
    this.filteredRetour = this.filterLocations(this.lieuRetour);
    this.showRetourDropdown = true;
  }
  onRetourInput() {
    this.filteredRetour = this.filterLocations(this.lieuRetour);
    this.showRetourDropdown = true;
  }
  selectRetour(loc: LocationOption) {
    this.lieuRetour = loc.label;
    this.showRetourDropdown = false;
  }
  hideRetour() { setTimeout(() => { this.showRetourDropdown = false; }, 150); }

  selectVoiture(v: any) {
    this.selectedVoiture = this.selectedVoiture?.id === v.id ? null : v;
    this.refreshPreview();
  }

  toggleAccessoire(id: number) {
    this.selectedAccessoireIds.has(id)
      ? this.selectedAccessoireIds.delete(id)
      : this.selectedAccessoireIds.add(id);
    this.refreshPreview();
  }

  onDateDebutChange() {
    if (this.dateDebut) {
      const next = new Date(this.dateDebut);
      next.setDate(next.getDate() + 1);
      this.dateFin = next.toISOString().slice(0, 16);
    }
    this.clearBookedVehicle();
    this.refreshPreview();
  }

  onDateFinChange() {
    this.refreshPreview();
  }

  onRemiseChange() {
    this.refreshPreview();
  }

  refreshPreview(): void {
    clearTimeout(this.previewTimer);
    if (!this.selectedVoiture || !this.dateDebut || !this.dateFin) { this.preview = null; return; }

    this.previewTimer = setTimeout(() => {
      this.previewLoading = true;
      this.http.post(`${environment.apiUrl}/reservation/preview-total`, {
        voitureId: this.selectedVoiture.id,
        dateDebut: this.dateDebut,
        dateFin:   this.dateFin,
        accessoireIds: Array.from(this.selectedAccessoireIds),
        remiseMontant: this.remiseMontant || null,
      }).subscribe({
        next: (r: any) => { this.preview = r; this.previewLoading = false; },
        error: () => { this.previewLoading = false; },
      });
    }, 250);
  }

  clearBookedVehicle() {
    if (this.selectedVoiture && !this.isAvailable(this.selectedVoiture)) {
      this.selectedVoiture = null;
    }
  }

  get numberOfDays(): number {
    if (!this.dateDebut || !this.dateFin) return 0;
    const diff = new Date(this.dateFin).getTime() - new Date(this.dateDebut).getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }

  get effectiveDailyRate(): number {
    return this.preview?.prixParJour ?? (this.selectedVoiture?.prixJour ?? 0);
  }

  get accessoryTotal(): number {
    return this.preview?.accessoireTotal ?? 0;
  }

  get totalAmount(): number { return this.preview?.total ?? 0; }

  get remaining(): number { return this.totalAmount - (this.montantPaye ?? 0); }

  get canSubmit(): boolean {
    return !!(this.selectedClient && this.selectedVoiture && this.dateDebut && this.dateFin && this.numberOfDays > 0);
  }

  createClient() {
    if (!this.newClient.nom) { this.toast.show(this.t('nameRequired'), 'error'); return; }
    this.savingClient = true;
    this.crud.rawPost('client', this.newClient).subscribe({
      next: (c: any) => {
        this.clients.unshift(c);
        this.filteredClients = this.clients;
        this.selectClient(c);
        this.showNewClientForm = false;
        this.newClient = { nom: '', telephone: '', cin: '', permisConduite: '' };
        this.savingClient = false;
        this.toast.show(this.t('clientCreated'), 'success');
      },
      error: () => { this.toast.show(this.t('saveError'), 'error'); this.savingClient = false; }
    });
  }

  submit() {
    if (!this.canSubmit) return;
    this.isSubmitting = true;

    // total/prixParJour are never sent -- the backend computes the authoritative total
    // itself (ReservationPricingService), same figures the preview above already showed.
    const payload = {
      clientId:          this.selectedClient.id,
      voitureId:         this.selectedVoiture.id,
      dateDebut:         this.dateDebut,
      dateFin:           this.dateFin,
      modePaiement:      this.modePaiement,
      montantPaye:       this.montantPaye,
      remiseMontant:     this.remiseMontant || null,
      remiseMotif:       this.remiseMotif || null,
      lieuLivraison:     this.lieuLivraison || null,
      lieuRetour:        this.lieuRetour    || null,
      accessoireIds:     Array.from(this.selectedAccessoireIds),
      reservationStatus: 'confirmee',
    };

    this.crud.rawPost('reservation', payload).pipe(
      switchMap((res: any) => {
        const resId = res?.id ?? res?.reservation?.id;
        return this.crud.rawPost('contrat', { reservationId: resId }).pipe(
          catchError(() => of(null)),
          switchMap(() => of(resId))
        );
      })
    ).subscribe({
      next: (resId: number) => {
        this.isSubmitting = false;
        this.toast.show(this.t('dossierCreated'), 'success');
        this.router.navigate(['/location', resId]);
      },
      error: (err: any) => {
        this.toast.show(err?.error?.message ?? this.t('saveError'), 'error');
        this.isSubmitting = false;
      }
    });
  }

  complianceClass(v: any): string {
    const s = v?.compliance?.overall;
    const sev = complianceSeverity(s);
    if (sev === 'ok')      return 'cpl-valid';
    if (sev === 'warning') return 'cpl-warning';
    if (sev === 'danger')  return s === 'EXPIRED' ? 'cpl-expired' : 'cpl-critical';
    return 'cpl-unknown';
  }

  isAvailable(v: any): boolean {
    if (!this.dateDebut || !this.dateFin) {
      const s = (v.effectiveStatus || v.voitureStatus || '').toLowerCase();
      return s === 'disponible';
    }
    const startSel = new Date(this.dateDebut);
    const endSel   = new Date(this.dateFin);
    return !this.reservations.some(r => {
      const rId = r.voiture?.id ?? r.voitureId;
      if (rId !== v.id) return false;
      const st = (r.reservationStatus || r.statut || '').toLowerCase();
      if (['cancelled', 'annulee', 'annule'].includes(st)) return false;
      const rs = new Date(r.dateDebut);
      const re = new Date(r.dateFin);
      return rs < endSel && re > startSel;
    });
  }
}
