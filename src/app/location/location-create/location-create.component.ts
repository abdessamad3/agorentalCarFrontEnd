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

type ExpiredDocType = 'cin' | 'passeport' | 'permis';

interface ClientDoc {
  id: number; documentType: string; originalName: string; url: string; uploadedAt: string;
}

interface LocationOption {
  label: string;
  type: 'airport' | 'train' | 'city';
}

const MOROCCO_LOCATIONS: LocationOption[] = [
  // Airports
  { label: 'Aéroport Mohammed V – Casablanca', type: 'airport' },
  { label: 'Aéroport Marrakech-Ménara', type: 'airport' },
  { label: 'Aéroport Agadir Al Massira', type: 'airport' },
  { label: 'Aéroport Fès-Saïs', type: 'airport' },
  { label: 'Aéroport Rabat-Salé', type: 'airport' },
  { label: 'Aéroport Ibn Battuta – Tanger', type: 'airport' },
  { label: 'Aéroport Oujda-Angads', type: 'airport' },
  { label: 'Aéroport Nador-El Aroui', type: 'airport' },
  { label: 'Aéroport Essaouira-Mogador', type: 'airport' },
  { label: 'Aéroport Ouarzazate', type: 'airport' },
  { label: 'Aéroport Al Hoceïma', type: 'airport' },
  { label: 'Aéroport Laâyoune-Hassan I', type: 'airport' },
  { label: 'Aéroport Dakhla', type: 'airport' },
  { label: 'Aéroport Béni Mellal', type: 'airport' },
  // Train stations
  { label: 'Gare Casa-Voyageurs', type: 'train' },
  { label: 'Gare Casa-Port', type: 'train' },
  { label: 'Gare Casa-Oasis', type: 'train' },
  { label: 'Gare Rabat-Ville', type: 'train' },
  { label: 'Gare Rabat-Agdal', type: 'train' },
  { label: 'Gare Salé', type: 'train' },
  { label: 'Gare Marrakech', type: 'train' },
  { label: 'Gare Fès', type: 'train' },
  { label: 'Gare Meknès', type: 'train' },
  { label: 'Gare Tanger-Ville', type: 'train' },
  { label: 'Gare Kénitra', type: 'train' },
  { label: 'Gare El Jadida', type: 'train' },
  { label: 'Gare Safi', type: 'train' },
  { label: 'Gare Oujda', type: 'train' },
  { label: 'Gare Settat', type: 'train' },
  { label: 'Gare Mohammedia', type: 'train' },
  // Cities
  { label: 'Casablanca', type: 'city' },
  { label: 'Rabat', type: 'city' },
  { label: 'Marrakech', type: 'city' },
  { label: 'Fès', type: 'city' },
  { label: 'Tanger', type: 'city' },
  { label: 'Agadir', type: 'city' },
  { label: 'Meknès', type: 'city' },
  { label: 'Oujda', type: 'city' },
  { label: 'Kénitra', type: 'city' },
  { label: 'Tétouan', type: 'city' },
  { label: 'Safi', type: 'city' },
  { label: 'El Jadida', type: 'city' },
  { label: 'Béni Mellal', type: 'city' },
  { label: 'Nador', type: 'city' },
  { label: 'Errachidia', type: 'city' },
  { label: 'Ouarzazate', type: 'city' },
  { label: 'Essaouira', type: 'city' },
  { label: 'Laâyoune', type: 'city' },
  { label: 'Dakhla', type: 'city' },
  { label: 'Al Hoceïma', type: 'city' },
  { label: 'Tiznit', type: 'city' },
  { label: 'Taroudant', type: 'city' },
  { label: 'Chefchaouen', type: 'city' },
  { label: 'Ifrane', type: 'city' },
  { label: 'Khénifra', type: 'city' },
  { label: 'Guelmim', type: 'city' },
  { label: 'Zagora', type: 'city' },
  { label: 'Asilah', type: 'city' },
  // Small cities
  { label: 'Salé', type: 'city' },
  { label: 'Temara', type: 'city' },
  { label: 'Mohammedia', type: 'city' },
  { label: 'Settat', type: 'city' },
  { label: 'Berrechid', type: 'city' },
  { label: 'Khouribga', type: 'city' },
  { label: 'Youssoufia', type: 'city' },
  { label: 'Sidi Kacem', type: 'city' },
  { label: 'Sidi Slimane', type: 'city' },
  { label: 'Sidi Bennour', type: 'city' },
  { label: 'Souk el Arbaa', type: 'city' },
  { label: 'Larache', type: 'city' },
  { label: 'Ksar el Kebir', type: 'city' },
  { label: 'Fnideq', type: 'city' },
  { label: 'Martil', type: 'city' },
  { label: "M'diq", type: 'city' },
  { label: 'Taza', type: 'city' },
  { label: 'Guercif', type: 'city' },
  { label: 'Taourirt', type: 'city' },
  { label: 'Berkane', type: 'city' },
  { label: 'Oued Zem', type: 'city' },
  { label: 'Fquih Ben Salah', type: 'city' },
  { label: 'Azilal', type: 'city' },
  { label: 'Demnate', type: 'city' },
  { label: 'Kelaa des Sraghna', type: 'city' },
  { label: 'Chichaoua', type: 'city' },
  { label: 'Midelt', type: 'city' },
  { label: 'Azrou', type: 'city' },
  { label: 'Rich', type: 'city' },
  { label: 'Goulmima', type: 'city' },
  { label: 'Tinghir', type: 'city' },
  { label: 'Boumalne Dades', type: 'city' },
  { label: "Kelaat M'Gouna", type: 'city' },
  { label: 'Merzouga', type: 'city' },
  { label: 'Rissani', type: 'city' },
  { label: 'Erfoud', type: 'city' },
  { label: 'Alnif', type: 'city' },
  { label: 'Mhamid el Ghizlane', type: 'city' },
  { label: 'Foum Zguid', type: 'city' },
  { label: 'Tata', type: 'city' },
  { label: 'Akka', type: 'city' },
  { label: 'Sidi Ifni', type: 'city' },
  { label: 'Ait Melloul', type: 'city' },
  { label: 'Inzegane', type: 'city' },
  { label: 'Biougra', type: 'city' },
  { label: 'Tan-Tan', type: 'city' },
  { label: 'Tarfaya', type: 'city' },
  { label: 'Smara', type: 'city' },
  { label: 'Boujdour', type: 'city' },
  { label: 'Missour', type: 'city' },
  { label: 'Boulemane', type: 'city' },
  { label: 'Imouzzer Kandar', type: 'city' },
  { label: 'Sefrou', type: 'city' },
  { label: 'Jerada', type: 'city' },
  { label: 'Figuig', type: 'city' },
];

@Component({
  selector: 'app-location-create',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, UploadBtnComponent],
  templateUrl: './location-create.component.html',
  styleUrls: ['./location-create.component.css']
})
export class LocationCreateComponent implements OnInit {
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
        return s !== 'brouillon' && s !== 'setup' && s !== 'vendu' && s !== 'vendue';
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

  onClientSearch() {
    const q = this.clientSearch.toLowerCase();
    this.filteredClients = q
      ? this.clients.filter(c => (c.nom || '').toLowerCase().includes(q) || (c.telephone || '').includes(q))
      : this.clients;
    this.showClientDropdown = true;
  }

  selectClient(c: any) {
    this.selectedClient         = c;
    this.clientSearch           = c.nom;
    this.showClientDropdown     = false;
    this.expiryWarningDismissed = false;
    this.uploadedDocTypes.clear();
    this.resetExpiredDocUpdates();
    this.loadClientDocs();
  }

  clearClient() {
    this.selectedClient         = null;
    this.clientSearch           = '';
    this.showClientDropdown     = false;
    this.expiryWarningDismissed = false;
    this.uploadedDocTypes.clear();
    this.resetExpiredDocUpdates();
    this.clientDocs             = [];
  }

  private filterLocations(q: string): LocationOption[] {
    if (!q.trim()) return MOROCCO_LOCATIONS.slice(0, 8);
    const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    const qn = norm(q);
    return MOROCCO_LOCATIONS.filter(l => norm(l.label).includes(qn)).slice(0, 12);
  }

  locIcon(type: string) {
    return type === 'airport' ? '✈️' : type === 'train' ? '🚉' : '🏙️';
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
  }

  toggleAccessoire(id: number) {
    this.selectedAccessoireIds.has(id)
      ? this.selectedAccessoireIds.delete(id)
      : this.selectedAccessoireIds.add(id);
  }

  onDateDebutChange() {
    if (this.dateDebut) {
      const next = new Date(this.dateDebut);
      next.setDate(next.getDate() + 1);
      this.dateFin = next.toISOString().slice(0, 16);
    }
    this.clearBookedVehicle();
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

  get vehicleTotal(): number {
    return (this.selectedVoiture?.prixJour ?? 0) * this.numberOfDays;
  }

  get accessoryTotal(): number {
    return Array.from(this.selectedAccessoireIds)
      .map(id => this.accessoires.find((a: any) => a.id === id))
      .filter(Boolean)
      .reduce((s, a: any) => s + parseFloat(a.prix ?? 0) * this.numberOfDays, 0);
  }

  get totalAmount(): number { return this.vehicleTotal + this.accessoryTotal; }

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

    const payload = {
      clientId:          this.selectedClient.id,
      voitureId:         this.selectedVoiture.id,
      dateDebut:         this.dateDebut,
      dateFin:           this.dateFin,
      total:             this.totalAmount.toFixed(2),
      prixParJour:       this.selectedVoiture.prixJour ?? 0,
      modePaiement:      this.modePaiement,
      montantPaye:       this.montantPaye,
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
