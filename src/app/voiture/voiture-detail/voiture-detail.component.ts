import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { switchMap, forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { VoitureService } from '../../services/voiture.service';
import { CrudService } from '../../services/crud.service';
import { TranslationService } from '../../services/translation.service';
import { environment } from '../../../environments/environment';

const PLACEHOLDER = `data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAwIiBoZWlnaHQ9IjUwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iODAwIiBoZWlnaHQ9IjUwMCIgZmlsbD0iI2VkZjJmNyIvPjx0ZXh0IHg9IjQwMCIgeT0iMjUwIiBmaWxsPSIjYTBhZWMwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkb21pbmFudC1iYXNlbGluZT0ibWlkZGxlIiBmb250LXNpemU9IjgwIj7wn5qlPC90ZXh0Pjwvc3ZnPg==`;

@Component({
  selector: 'app-voiture-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, ReactiveFormsModule],
  templateUrl: './voiture-detail.component.html',
  styleUrls: ['./voiture-detail.component.css']
})
export class VoitureDetailComponent implements OnInit {
  car: any = null;
  loading = true;
  error = '';
  dir = 'ltr';
  activeTab = 0;

  // Gallery
  images: string[] = [];
  activeImg = 0;
  lightboxOpen = false;

  // Status change
  showStatusPicker = false;
  newStatus = '';
  isUpdating = false;

  // More actions dropdown
  showMoreActions = false;

  // Edit modal
  editModalOpen = false;
  isSubmitting = false;
  editImageFile: File | null = null;
  editImagePreview: string | null = null;
  editGallery: { id: number; path: string }[] = [];

  // Toast
  toast: { message: string; type: 'error' | 'success' } | null = null;
  private toastTimer: any;
  editForm!: FormGroup;

  // Reservation history
  reservations: any[] = [];
  reparations: any[] = [];
  clients: any[] = [];
  loadingReservations = false;
  reservationSearch = '';

  readonly FUEL_OPTIONS = ['Essence', 'Diesel', 'Hybride', 'Electrique'];

  readonly TABS = [
    { key: 'overview',       labelKey: 'overview',       icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
    { key: 'technical',      labelKey: 'technicalSpecs', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z' },
    { key: 'financial',      labelKey: 'financialInfo',  icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
    { key: 'administrative', labelKey: 'adminInfo',      icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
    { key: 'alerts',         labelKey: 'alertsPanel',    icon: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9' },
    { key: 'reservations',   labelKey: 'reservations',   icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
    { key: 'photos',         labelKey: 'photos',         icon: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z' },
  ];

  readonly ALL_STATUSES = [
    { value: 'archive', labelKey: 'archive', cls: 'st-dark' },
  ];

  constructor(
    private route: ActivatedRoute,
    private voitureService: VoitureService,
    private crud: CrudService,
    private ts: TranslationService,
    public router: Router,
    private fb: FormBuilder
  ) {
    this.editForm = this.fb.group({
      marque:                  ['', Validators.required],
      modele:                  ['', Validators.required],
      version:                 [''],
      annee:                   ['', Validators.required],
      immatNum1:               [''],
      immatLetter:             [''],
      immatNum2:               [''],
      vin:                     [''],
      typeCarburant:           ['Essence'],
      transmission:            ['Manuelle'],
      couleur:                 [''],
      places:                  [5],
      portes:                  [4],
      puissanceCv:             [''],
      categorie:               [''],
      climatisation:           [false],
      kilometrageActuel:       [0, Validators.min(0)],
      prixJour:                [0, [Validators.required, Validators.min(0)]],
      prixSemaine:             [0],
      prixMois:                [0],
      prixAchat:               [0],
      caution:                 [0],
      dateAchat:               [''],
      dateExpirationAssurance: [''],
      dateExpirationVignette:  [''],
      dateExpirationVisite:    [''],
      voitureStatus:           ['disponible'],
    });
  }

  ngOnInit(): void {
    this.ts.direction$.subscribe(d => this.dir = d);
    const id = +this.route.snapshot.paramMap.get('id')!;
    this.load(id);
  }

  load(id: number): void {
    this.loading = true;
    this.voitureService.getVoitureById(id).subscribe({
      next: (data) => {
        this.car = data;
        this.newStatus = data.voitureStatus || 'disponible';
        this.buildGallery();
        this.loading = false;
        this.loadSupportData(id);
      },
      error: () => {
        this.error = this.ts.translate('loadError');
        this.loading = false;
      }
    });
  }

  loadSupportData(carId: number): void {
    this.loadingReservations = true;
    forkJoin({
      reservations: this.crud.getAll('reservation').pipe(catchError(() => of([]))),
      clients:      this.crud.getAll('client').pipe(catchError(() => of([]))),
      reparations:  this.crud.getAll('reparation').pipe(catchError(() => of([]))),
    }).subscribe(({ reservations, clients, reparations }) => {
      const allRes = Array.isArray(reservations) ? reservations : (reservations as any)?.data ?? [];
      const allRep = Array.isArray(reparations)  ? reparations  : (reparations  as any)?.data ?? [];
      this.clients      = Array.isArray(clients) ? clients : (clients as any)?.data ?? [];
      this.reservations = allRes.filter((r: any) => r.voitureId === carId || r.voiture?.id === carId);
      this.reparations  = allRep.filter((r: any) => (r.voitureId ?? r.voiture?.id) === carId);
      this.loadingReservations = false;
    });
  }

  buildGallery(): void {
    this.images = [];
    if (this.car.image) {
      const url = this.car.image.startsWith('http') ? this.car.image : environment.serverUrl + this.car.image;
      this.images.push(url);
    }
    if (Array.isArray(this.car.images)) {
      this.car.images.forEach((img: string) => {
        const url = img.startsWith('http') ? img : environment.serverUrl + img;
        if (!this.images.includes(url)) this.images.push(url);
      });
    }
    if (this.images.length === 0) this.images = [PLACEHOLDER];
    this.activeImg = 0;
  }

  // ── Gallery ───────────────────────────────────────────────────────────────
  prevImg(): void { this.activeImg = (this.activeImg - 1 + this.images.length) % this.images.length; }
  nextImg(): void { this.activeImg = (this.activeImg + 1) % this.images.length; }
  openLightbox(i: number): void { this.activeImg = i; this.lightboxOpen = true; }
  closeLightbox(): void { this.lightboxOpen = false; }

  @HostListener('document:keydown', ['$event'])
  onKey(e: KeyboardEvent): void {
    if (this.lightboxOpen) {
      if (e.key === 'ArrowRight') this.nextImg();
      if (e.key === 'ArrowLeft')  this.prevImg();
      if (e.key === 'Escape')     this.closeLightbox();
    }
    if (e.key === 'Escape') {
      this.showStatusPicker = false;
      this.showMoreActions  = false;
      if (this.editModalOpen) this.closeEditModal();
    }
  }

  @HostListener('document:click', ['$event'])
  onDocClick(e: MouseEvent): void {
    const t = e.target as HTMLElement;
    if (!t.closest('.status-section'))    this.showStatusPicker = false;
    if (!t.closest('.more-actions-wrap')) this.showMoreActions  = false;
  }

  // ── Status ────────────────────────────────────────────────────────────────
  private readonly MANUAL_STATUSES = ['vendu', 'archive'];

  get effectiveStatus(): string {
    if (!this.car) return 'disponible';
    const stored = (this.car.voitureStatus || '').toLowerCase();
    if (this.MANUAL_STATUSES.includes(stored)) return stored;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const hasExpiredDoc = ['dateExpirationAssurance', 'dateExpirationVignette', 'dateExpirationVisite']
      .some(f => this.car[f] && new Date(this.car[f]) < today);
    if (hasExpiredDoc) return 'hors_service';

    const hasActiveRepair = this.reparations.some(r => {
      if (!r.dateFin) return true;
      const fin = new Date(r.dateFin);
      fin.setHours(23, 59, 59, 999);
      return fin >= today;
    });
    if (hasActiveRepair) return 'maintenance';

    const cancelledStatuses = ['annulee', 'annule', 'cancelled'];
    const isActive = this.reservations.some(r => {
      if (cancelledStatuses.includes((r.reservationStatus || r.statut || '').toLowerCase())) return false;
      const start = new Date(r.dateDebut);
      const end   = new Date(r.dateFin);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      return today >= start && today <= end;
    });
    return isActive ? 'louee' : 'disponible';
  }

  statusClass(s: string): string {
    const map: Record<string, string> = {
      disponible: 'st-green', louee: 'st-blue', maintenance: 'st-orange',
      hors_service: 'st-red', vendu: 'st-gray', archive: 'st-dark',
    };
    return map[s] ?? 'st-gray';
  }

  changeStatus(val: string): void {
    if (val === 'archive' && this.effectiveStatus !== 'disponible') return;
    this.newStatus = val;
    this.showStatusPicker = false;
    this.isUpdating = true;
    this.voitureService.updateVoiture(this.car.id, { voitureStatus: val }).subscribe({
      next: () => {
        this.car.voitureStatus = val;
        this.isUpdating = false;
        this.showToast(this.t('save'), 'success');
      },
      error: () => { this.isUpdating = false; }
    });
  }

  // ── Alert helpers ─────────────────────────────────────────────────────────
  daysUntil(dateStr?: string): number | null {
    if (!dateStr) return null;
    return Math.floor((new Date(dateStr).getTime() - Date.now()) / 86400000);
  }
  isExpired(dateStr?: string): boolean  { const d = this.daysUntil(dateStr); return d !== null && d < 0; }
  isExpiring(dateStr?: string): boolean { const d = this.daysUntil(dateStr); return d !== null && d >= 0 && d <= 30; }

  alertLevel(dateStr?: string): 'danger' | 'warning' | '' {
    if (this.isExpired(dateStr))  return 'danger';
    if (this.isExpiring(dateStr)) return 'warning';
    return '';
  }

  get docAlerts(): { icon: string; name: string; field: string; date: string; level: 'danger' | 'warning' | '' }[] {
    if (!this.car) return [];
    return [
      { icon: '🛡️', name: 'insuranceDoc', field: 'dateExpirationAssurance' },
      { icon: '📄', name: 'vignetteDoc',   field: 'dateExpirationVignette'  },
      { icon: '🔬', name: 'technicalDoc',  field: 'dateExpirationVisite'    },
    ].map(d => ({ ...d, date: this.car[d.field] || '', level: this.alertLevel(this.car[d.field]) }));
  }

  get activeAlerts() { return this.docAlerts.filter(a => a.level !== ''); }
  get hasDangerAlert(): boolean { return this.activeAlerts.some(a => a.level === 'danger'); }
  isDanger(level: string):  boolean { return level === 'danger';  }
  isWarning(level: string): boolean { return level === 'warning'; }

  // ── Reservation helpers ───────────────────────────────────────────────────
  get filteredReservations(): any[] {
    if (!this.reservationSearch.trim()) return this.reservations;
    const q = this.reservationSearch.toLowerCase();
    return this.reservations.filter(r =>
      this.getClientName(r).toLowerCase().includes(q) ||
      (r.statut || r.reservationStatus || '').toLowerCase().includes(q)
    );
  }

  getClientName(r: any): string {
    const id = r.clientId || r.client?.id;
    const c  = this.clients.find(c => c.id === id);
    if (c) return `${c.prenom || ''} ${c.nom}`.trim();
    return r.client?.nom || `#${id || '?'}`;
  }

  reservationStatusClass(r: any): string {
    const s = (r.reservationStatus || r.statut || '').toLowerCase();
    if (['confirmed', 'confirmee'].includes(s))                     return 'rs-confirmed';
    if (['en_cours', 'active', 'encours'].includes(s))              return 'rs-active';
    if (['terminee', 'completed', 'done', 'termine'].includes(s))   return 'rs-done';
    if (['annulee', 'cancelled', 'annule'].includes(s))             return 'rs-cancelled';
    return 'rs-pending';
  }

  reservationStatusLabel(r: any): string {
    const s = (r.reservationStatus || r.statut || '').toLowerCase();
    const map: Record<string, string> = {
      confirmed: this.t('confirmed'), confirmee: this.t('confirmed'),
      en_cours: this.t('inProgress'), active: this.t('inProgress'),
      terminee: this.t('done'), completed: this.t('done'), done: this.t('done'),
      annulee: this.t('cancelled'), cancelled: this.t('cancelled'),
      en_attente: this.t('pending'),
    };
    return map[s] || s;
  }

  reservationDuration(r: any): number {
    if (!r.dateDebut || !r.dateFin) return 0;
    const diff = new Date(r.dateFin).getTime() - new Date(r.dateDebut).getTime();
    return Math.max(1, Math.ceil(diff / 86400000));
  }

  get vehicleRevenue(): number {
    return this.reservations.reduce((sum, r) => sum + +(r.total || r.montant || 0), 0);
  }

  get monthlyRevenueEstimate(): number {
    return this.car ? (this.car.prixJour || 0) * 20 : 0;
  }

  get occupancyEstimate(): number {
    if (!this.car) return 0;
    if (this.effectiveStatus === 'louee')      return 85;
    if (this.effectiveStatus === 'disponible') return 65;
    return 0;
  }

  // ── Edit modal ────────────────────────────────────────────────────────────
  openEditModal(): void {
    if (!this.car) return;
    this.editForm.patchValue({
      marque: this.car.marque || '',              modele: this.car.modele || '',
      version: this.car.version || '',            annee: this.car.annee || '',
      ...this.parsePlate(this.car.immatriculation || ''),
      vin: this.car.vin || '',
      typeCarburant: this.car.typeCarburant || 'Essence',
      transmission: this.car.transmission || 'Manuelle',
      couleur: this.car.couleur || '',            places: this.car.places || 5,
      portes: this.car.portes || 4,               puissanceCv: this.car.puissanceCv || '',
      categorie: this.car.categorie || '',        climatisation: this.car.climatisation || false,
      kilometrageActuel: this.car.kilometrageActuel || 0,
      prixJour: this.car.prixJour || 0,           prixSemaine: this.car.prixSemaine || 0,
      prixMois: this.car.prixMois || 0,           prixAchat: this.car.prixAchat || 0,
      caution: this.car.caution || 0,             dateAchat: this.car.dateAchat || '',
      dateExpirationAssurance: this.car.dateExpirationAssurance || '',
      dateExpirationVignette: this.car.dateExpirationVignette || '',
      dateExpirationVisite: this.car.dateExpirationVisite || '',
      voitureStatus: this.car.voitureStatus || 'disponible',
    });
    this.editGallery = Array.isArray(this.car.galleryImages)
      ? this.car.galleryImages.map((g: any) => ({ id: g.id, path: this.imgUrlFor(g.path) }))
      : [];
    this.editImageFile    = null;
    this.editImagePreview = null;
    this.editModalOpen    = true;
  }

  closeEditModal(): void {
    this.editModalOpen    = false;
    this.isSubmitting     = false;
    this.editImageFile    = null;
    this.editImagePreview = null;
    this.editGallery      = [];
  }

  showToast(message: string, type: 'error' | 'success' = 'error'): void {
    clearTimeout(this.toastTimer);
    this.toast = { message, type };
    this.toastTimer = setTimeout(() => { this.toast = null; }, 4000);
  }

  private apiError(err: any): string {
    return err?.error?.error || err?.error?.message || err?.message || 'Erreur';
  }

  filterDigits(el: EventTarget | null): void {
    if (!el) return;
    const input = el as HTMLInputElement;
    input.value = input.value.replace(/\D/g, '');
  }

  filterLetter(el: EventTarget | null): void {
    if (!el) return;
    const input = el as HTMLInputElement;
    input.value = input.value.replace(/[^a-zA-Z]/g, '').toUpperCase();
  }

  private parsePlate(plate: string): { immatNum1: string; immatLetter: string; immatNum2: string } {
    const parts = (plate || '').split('-');
    return { immatNum1: parts[0] || '', immatLetter: parts[1] || '', immatNum2: parts[2] || '' };
  }

  private buildPlate(): string {
    const { immatNum1, immatLetter, immatNum2 } = this.editForm.value;
    return [immatNum1, (immatLetter || '').toUpperCase(), immatNum2].filter(Boolean).join('-');
  }

  saveEdit(): void {
    if (this.editForm.invalid || !this.car) return;
    this.isSubmitting = true;
    const id        = this.car.id;
    const imageFile = this.editImageFile;
    const { immatNum1, immatLetter, immatNum2, ...formRest } = this.editForm.value;
    const payload = { ...formRest, immatriculation: this.buildPlate() };
    this.voitureService.updateVoiture(id, payload).pipe(
      switchMap(() => imageFile ? this.voitureService.updateVoitureImage(id, imageFile) : of(null))
    ).subscribe({
      next: () => { this.closeEditModal(); this.load(id); this.showToast(this.t('save'), 'success'); },
      error: (err) => { this.isSubmitting = false; this.showToast(this.apiError(err)); }
    });
  }

  onEditImageSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file  = input.files?.[0];
    if (!file) return;
    this.editImageFile = file;
    const reader = new FileReader();
    reader.onload = (e) => this.editImagePreview = e.target?.result as string;
    reader.readAsDataURL(file);
    input.value = '';
  }

  addGalleryImage(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file  = input.files?.[0];
    if (!file || !this.car) return;
    this.voitureService.addVoitureImage(this.car.id, file).subscribe({
      next: (res) => { this.editGallery.push({ id: res.id, path: this.imgUrlFor(res.image) }); },
      error: (err) => { this.showToast(this.apiError(err)); }
    });
    input.value = '';
  }

  removeGalleryImage(imgId: number): void {
    if (!this.car) return;
    this.voitureService.deleteVoitureImage(this.car.id, imgId).subscribe({
      next: () => { this.editGallery = this.editGallery.filter(i => i.id !== imgId); },
      error: (err) => { this.showToast(this.apiError(err)); }
    });
  }

  imgUrlFor(img?: string): string {
    if (!img) return '';
    if (img.startsWith('http') || img.startsWith('data:')) return img;
    return environment.serverUrl + img;
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  readonly placeholderImg = PLACEHOLDER;
  get imgUrl(): string   { return this.images[this.activeImg] || PLACEHOLDER; }
  get carTitle(): string { return this.car ? `${this.car.marque} ${this.car.modele}` : ''; }
  t(key: string): string { return this.ts.translate(key); }
  fmt(v: any): string    { if (v === null || v === undefined || v === '') return '—'; return String(v); }
}
