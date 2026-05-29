import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { switchMap, of, forkJoin } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { VoitureService } from '../../services/voiture.service';
import { CrudService } from '../../services/crud.service';
import { TranslationService } from '../../services/translation.service';
import { environment } from '../../../environments/environment';

const PLACEHOLDER = `data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjI1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjI1MCIgZmlsbD0iI2VkZjJmNyIvPjx0ZXh0IHg9IjIwMCIgeT0iMTI1IiBmaWxsPSIjYTBhZWMwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkb21pbmFudC1iYXNlbGluZT0ibWlkZGxlIiBmb250LXNpemU9IjYwIj7wn5qlPC90ZXh0Pjwvc3ZnPg==`;

@Component({
  selector: 'app-voiture-list',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterLink],
  templateUrl: './voiture-list.component.html',
  styleUrls: ['./voiture-list.component.css']
})
export class VoitureListComponent implements OnInit {
  voitures: any[] = [];
  reservations: any[] = [];
  reparations: any[] = [];
  loading = true;
  error = '';
  page = 1;
  limit = 12;
  total = 0;
  pages = 0;
  dir = 'ltr';
  viewMode: 'grid' | 'table' = 'grid';

  searchQuery = '';
  statusFilter = 'all';
  fuelFilter = '';
  transmissionFilter = '';
  categoryFilter = '';
  dateFrom = '';
  dateTo = '';

  stats = { total: 0, disponible: 0, louee: 0, maintenance: 0, horsService: 0, vendu: 0, archive: 0 };

  modalMode: 'edit' | 'delete' | 'status' | null = null;
  selectedVoiture: any = null;
  isSubmitting = false;
  deleteId: number | null = null;
  deleteError = '';

  editImageFile: File | null = null;
  editImagePreview: string | null = null;
  editGallery: { id: number; path: string }[] = [];

  toast: { message: string; type: 'error' | 'success' } | null = null;
  private toastTimer: any;

  editForm: FormGroup;

  readonly STATUS_TABS = [
    { key: 'all',         labelKey: 'all',         icon: '🚗' },
    { key: 'disponible',  labelKey: 'disponible',   icon: '✅' },
    { key: 'louee',       labelKey: 'louee',        icon: '🔑' },
    { key: 'maintenance', labelKey: 'maintenance',  icon: '🔧' },
    { key: 'hors_service',labelKey: 'horsService',  icon: '⛔' },
    { key: 'vendu',       labelKey: 'vendu',        icon: '💰' },
    { key: 'archive',     labelKey: 'archive',      icon: '📦' },
  ];

  readonly FUEL_OPTIONS = ['Essence','Diesel','Hybride','Electrique'];
  readonly TRANSMISSION_OPTIONS = ['Manuelle','Automatique'];

  readonly ALL_STATUSES = [
    { value: 'archive', label: 'archive' },
  ];

  newStatus = '';

  constructor(
    private voitureService: VoitureService,
    private crud: CrudService,
    private ts: TranslationService,
    private fb: FormBuilder,
    public router: Router,
    private route: ActivatedRoute
  ) {
    this.editForm = this.fb.group({
      marque:            ['', Validators.required],
      modele:            ['', Validators.required],
      version:           [''],
      annee:             ['', Validators.required],
      immatNum1:         [''],
      immatLetter:       [''],
      immatNum2:         [''],
      vin:               [''],
      typeCarburant:     ['Essence'],
      transmission:      ['Manuelle'],
      couleur:           [''],
      places:            [5],
      portes:            [4],
      puissanceCv:       [''],
      categorie:         [''],
      climatisation:     [false],
      kilometrageActuel: [0, Validators.min(0)],
      prixJour:          [0, [Validators.required, Validators.min(0)]],
      prixSemaine:       [0],
      prixMois:          [0],
      prixAchat:         [0],
      caution:           [0],
      dateAchat:         [''],
      dateExpirationAssurance: [''],
      dateExpirationVignette:  [''],
      dateExpirationVisite:    [''],
      voitureStatus:     ['disponible'],
    });
  }

  ngOnInit(): void {
    this.ts.direction$.subscribe(d => this.dir = d);
    const editId = this.route.snapshot.queryParamMap.get('edit');
    this.loadCars(editId ? +editId : undefined);
  }

  loadCars(openEditId?: number): void {
    this.loading = true;
    this.error = '';
    forkJoin({
      cars:         this.voitureService.getVoitures(this.page, this.limit, '', this.dateFrom, this.dateTo),
      reservations: this.crud.getAll('reservations').pipe(catchError(() => of([]))),
      reparations:  this.crud.getAll('reparation').pipe(catchError(() => of([])))
    }).subscribe({
      next: ({ cars, reservations, reparations }) => {
        let data: any[] = [];
        if (Array.isArray(cars)) {
          data = cars;
          this.total = data.length;
          this.pages = 1;
        } else if (cars?.data) {
          data = cars.data;
          this.total = cars.meta?.total ?? data.length;
          this.pages = cars.meta?.pages ?? 1;
        }
        this.reservations = Array.isArray(reservations) ? reservations : (reservations?.data ?? []);
        this.reparations  = Array.isArray(reparations)  ? reparations  : (reparations?.data  ?? []);
        this.voitures = data.map(v => ({ ...v, _img: this.imgUrl(v.image) }));
        this.calcStats();
        this.loading = false;
        if (openEditId) {
          const car = this.voitures.find(v => v.id === openEditId);
          if (car) this.openEdit(car);
          this.router.navigate([], { queryParams: {}, replaceUrl: true });
        }
      },
      error: () => {
        this.loading = false;
        this.error = this.ts.translate('loadError');
      }
    });
  }

  private readonly MANUAL_STATUSES = ['vendu', 'archive'];

  effectiveStatus(v: any): string {
    const stored = (v.voitureStatus || '').toLowerCase();
    if (this.MANUAL_STATUSES.includes(stored)) return stored;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const hasExpiredDoc = ['dateExpirationAssurance', 'dateExpirationVignette', 'dateExpirationVisite']
      .some(f => v[f] && new Date(v[f]) < today);
    if (hasExpiredDoc) return 'hors_service';

    const hasActiveRepair = this.reparations.some(r => {
      if ((r.voitureId ?? r.voiture?.id) !== v.id) return false;
      if (!r.dateFin) return true;
      const fin = new Date(r.dateFin);
      fin.setHours(23, 59, 59, 999);
      return fin >= today;
    });
    if (hasActiveRepair) return 'maintenance';

    const cancelledStatuses = ['annulee', 'annule', 'cancelled'];
    const isActive = this.reservations.some(r => {
      if ((r.voitureId ?? r.voiture?.id) !== v.id) return false;
      if (cancelledStatuses.includes((r.reservationStatus || r.statut || '').toLowerCase())) return false;
      const start = new Date(r.dateDebut);
      const end   = new Date(r.dateFin);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      return today >= start && today <= end;
    });
    return isActive ? 'louee' : 'disponible';
  }

  status(v: any): string { return this.effectiveStatus(v); }

  calcStats(): void {
    const all = this.voitures;
    this.stats = {
      total:      all.length,
      disponible: all.filter(v => this.effectiveStatus(v) === 'disponible').length,
      louee:      all.filter(v => this.effectiveStatus(v) === 'louee').length,
      maintenance:all.filter(v => this.effectiveStatus(v) === 'maintenance').length,
      horsService:all.filter(v => this.effectiveStatus(v) === 'hors_service').length,
      vendu:      all.filter(v => this.effectiveStatus(v) === 'vendu').length,
      archive:    all.filter(v => this.effectiveStatus(v) === 'archive').length,
    };
  }

  get filtered(): any[] {
    let list = this.voitures;
    if (this.statusFilter !== 'all')    list = list.filter(v => this.status(v) === this.statusFilter.toLowerCase());
    if (this.fuelFilter)                list = list.filter(v => (v.typeCarburant || '').toLowerCase() === this.fuelFilter.toLowerCase());
    if (this.transmissionFilter)        list = list.filter(v => (v.transmission || '').toLowerCase() === this.transmissionFilter.toLowerCase());
    if (this.categoryFilter)            list = list.filter(v => (v.categorie || '').toLowerCase() === this.categoryFilter.toLowerCase());
    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      list = list.filter(v =>
        `${v.marque} ${v.modele} ${v.annee} ${v.immatriculation || ''} ${v.couleur || ''}`.toLowerCase().includes(q)
      );
    }
    return list;
  }

  get hasActiveFilters(): boolean {
    return !!(this.searchQuery.trim() || this.fuelFilter || this.transmissionFilter || this.categoryFilter || this.statusFilter !== 'all');
  }

  get categoryOptions(): string[] {
    const cats = new Set<string>(this.voitures.map(v => v.categorie).filter(Boolean));
    return Array.from(cats).sort();
  }

  resetFilters(): void {
    this.searchQuery = '';
    this.fuelFilter = '';
    this.transmissionFilter = '';
    this.categoryFilter = '';
    this.statusFilter = 'all';
  }

  imgUrl(img?: string): string {
    if (!img) return PLACEHOLDER;
    if (img.startsWith('http') || img.startsWith('data:')) return img;
    return environment.serverUrl + img;
  }

  // ── Alert helpers ────────────────────────────────────────────────────────

  daysUntil(dateStr?: string): number | null {
    if (!dateStr) return null;
    return Math.floor((new Date(dateStr).getTime() - Date.now()) / 86400000);
  }

  isExpired(dateStr?: string): boolean {
    const d = this.daysUntil(dateStr);
    return d !== null && d < 0;
  }

  isExpiring(dateStr?: string): boolean {
    const d = this.daysUntil(dateStr);
    return d !== null && d >= 0 && d <= 30;
  }

  alertCount(car: any): number {
    return ['dateExpirationAssurance','dateExpirationVignette','dateExpirationVisite']
      .filter(f => this.isExpired(car[f]) || this.isExpiring(car[f])).length;
  }

  alertLevel(car: any): 'danger' | 'warning' | '' {
    const fields = ['dateExpirationAssurance','dateExpirationVignette','dateExpirationVisite'];
    if (fields.some(f => this.isExpired(car[f]))) return 'danger';
    if (fields.some(f => this.isExpiring(car[f]))) return 'warning';
    return '';
  }

  statusClass(s: string): string {
    const map: Record<string, string> = {
      disponible: 'st-green', louee: 'st-blue', maintenance: 'st-orange',
      hors_service: 'st-red', vendu: 'st-gray', archive: 'st-dark',
    };
    return map[(s || '').toLowerCase()] ?? 'st-gray';
  }

  statusLabel(s: string): string {
    const normalized = (s || '').toLowerCase();
    const keyMap: Record<string, string> = {
      disponible: 'disponible', louee: 'louee', maintenance: 'maintenance',
      hors_service: 'horsService', vendu: 'vendu', archive: 'archive',
    };
    return this.t(keyMap[normalized] ?? normalized);
  }

  // ── Date availability ────────────────────────────────────────────────────

  get datesActive(): boolean { return !!(this.dateFrom && this.dateTo); }

  onDateFilterChange(): void {
    if (this.dateFrom && this.dateTo && new Date(this.dateFrom) <= new Date(this.dateTo)) {
      this.page = 1;
      this.loadCars();
    } else if (!this.dateFrom && !this.dateTo) {
      this.page = 1;
      this.loadCars();
    }
  }

  clearDateFilter(): void {
    this.dateFrom = '';
    this.dateTo = '';
    this.page = 1;
    this.loadCars();
  }

  availabilityClass(car: any): string {
    if (!car.availabilityForPeriod) return '';
    return car.availabilityForPeriod === 'disponible' ? 'avail-green' : 'avail-red';
  }

  availabilityLabel(car: any): string {
    if (!car.availabilityForPeriod) return '';
    return this.t(car.availabilityForPeriod === 'disponible' ? 'availableForPeriod' : 'bookedForPeriod');
  }

  filterDigits(el: EventTarget | null): void {
    if (!el) return;
    (el as HTMLInputElement).value = (el as HTMLInputElement).value.replace(/\D/g, '');
  }

  filterLetter(el: EventTarget | null): void {
    if (!el) return;
    (el as HTMLInputElement).value = (el as HTMLInputElement).value.replace(/[^a-zA-Z]/g, '').toUpperCase();
  }

  private parsePlate(plate: string): { immatNum1: string; immatLetter: string; immatNum2: string } {
    const parts = (plate || '').split('-');
    return { immatNum1: parts[0] || '', immatLetter: parts[1] || '', immatNum2: parts[2] || '' };
  }

  private buildPlate(): string {
    const { immatNum1, immatLetter, immatNum2 } = this.editForm.value;
    return [immatNum1, (immatLetter || '').toUpperCase(), immatNum2].filter(Boolean).join('-');
  }

  statCount(key: string): number {
    if (key === 'all') return this.stats.total;
    return (this.stats as any)[key === 'hors_service' ? 'horsService' : key] ?? 0;
  }

  // ── Modals ───────────────────────────────────────────────────────────────

  openEdit(car: any): void {
    this.selectedVoiture = car;
    this.editForm.patchValue({
      marque: car.marque || '', modele: car.modele || '', version: car.version || '',
      annee: car.annee || '', ...this.parsePlate(car.immatriculation || ''), vin: car.vin || '',
      typeCarburant: car.typeCarburant || 'Essence', transmission: car.transmission || 'Manuelle',
      couleur: car.couleur || '', places: car.places || 5, portes: car.portes || 4,
      puissanceCv: car.puissanceCv || '', categorie: car.categorie || '',
      climatisation: car.climatisation || false, kilometrageActuel: car.kilometrageActuel || 0,
      prixJour: car.prixJour || 0, prixSemaine: car.prixSemaine || 0,
      prixMois: car.prixMois || 0, prixAchat: car.prixAchat || 0,
      caution: car.caution || 0, dateAchat: car.dateAchat || '',
      dateExpirationAssurance: car.dateExpirationAssurance || '',
      dateExpirationVignette: car.dateExpirationVignette || '',
      dateExpirationVisite: car.dateExpirationVisite || '',
      voitureStatus: car.voitureStatus || 'disponible',
    });
    this.editGallery = Array.isArray(car.galleryImages)
      ? car.galleryImages.map((g: any) => ({ id: g.id, path: this.imgUrl(g.path) }))
      : [];
    this.modalMode = 'edit';
  }

  openDelete(id: number): void { this.deleteId = id; this.modalMode = 'delete'; }

  openStatus(car: any): void {
    this.selectedVoiture = car;
    this.newStatus = car.voitureStatus || 'disponible';
    this.modalMode = 'status';
  }

  closeModal(): void {
    this.modalMode = null; this.selectedVoiture = null;
    this.deleteId = null; this.isSubmitting = false; this.deleteError = '';
    this.editImageFile = null; this.editImagePreview = null; this.editGallery = [];
  }

  showToast(message: string, type: 'error' | 'success' = 'error'): void {
    clearTimeout(this.toastTimer);
    this.toast = { message, type };
    this.toastTimer = setTimeout(() => { this.toast = null; }, 4000);
  }

  private apiError(err: any): string {
    return err?.error?.error || err?.error?.message || err?.message || 'Erreur';
  }

  removeGalleryImage(imgId: number): void {
    if (!this.selectedVoiture) return;
    this.voitureService.deleteVoitureImage(this.selectedVoiture.id, imgId).subscribe({
      next: () => { this.editGallery = this.editGallery.filter(i => i.id !== imgId); },
      error: (err) => { this.showToast(this.apiError(err)); }
    });
  }

  addGalleryImage(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file || !this.selectedVoiture) return;
    this.voitureService.addVoitureImage(this.selectedVoiture.id, file).subscribe({
      next: (res) => { this.editGallery.push({ id: res.id, path: this.imgUrl(res.image) }); },
      error: (err) => { this.showToast(this.apiError(err)); }
    });
    input.value = '';
  }

  onEditImageSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.editImageFile = file;
    const reader = new FileReader();
    reader.onload = (e) => this.editImagePreview = e.target?.result as string;
    reader.readAsDataURL(file);
    input.value = '';
  }

  @HostListener('document:keydown.escape') onEscape() { this.closeModal(); }

  // ── Actions ──────────────────────────────────────────────────────────────

  saveEdit(): void {
    if (this.editForm.invalid || !this.selectedVoiture) return;
    this.isSubmitting = true;
    const id = this.selectedVoiture.id;
    const imageFile = this.editImageFile;
    const { immatNum1, immatLetter, immatNum2, ...rest } = this.editForm.value;
    const payload = { ...rest, immatriculation: this.buildPlate() };
    this.voitureService.updateVoiture(id, payload).pipe(
      switchMap(() => imageFile ? this.voitureService.updateVoitureImage(id, imageFile) : of(null))
    ).subscribe({
      next: () => { this.closeModal(); this.loadCars(); },
      error: (err) => { this.isSubmitting = false; this.showToast(this.apiError(err)); }
    });
  }

  confirmDelete(): void {
    if (!this.deleteId) return;
    this.deleteError = '';
    this.voitureService.deleteVoiture(this.deleteId).subscribe({
      next: () => {
        this.closeModal();
        if (this.filtered.length === 1 && this.page > 1) this.page--;
        this.loadCars();
      },
      error: (err) => {
        const msg = err?.error?.message || err?.error?.error || '';
        this.deleteError = msg.toLowerCase().includes('foreign key') || msg.toLowerCase().includes('constraint')
          ? this.ts.translate('cannotDelete')
          : this.ts.translate('loadError');
      }
    });
  }

  archiveSelected(): void {
    if (!this.deleteId) return;
    this.voitureService.updateVoiture(this.deleteId, { voitureStatus: 'archive' }).subscribe({
      next: () => { this.closeModal(); this.loadCars(); },
      error: () => { this.isSubmitting = false; }
    });
  }

  confirmStatus(): void {
    if (!this.selectedVoiture || !this.newStatus) return;
    if (this.newStatus === 'archive' && this.status(this.selectedVoiture) !== 'disponible') return;
    this.isSubmitting = true;
    this.voitureService.updateVoiture(this.selectedVoiture.id, { voitureStatus: this.newStatus }).subscribe({
      next: () => { this.closeModal(); this.loadCars(); },
      error: () => { this.isSubmitting = false; }
    });
  }

  duplicate(car: any): void {
    const payload = { ...car };
    delete payload.id;
    payload.immatriculation = '';
    payload.vin = '';
    payload.voitureStatus = 'disponible';
    this.voitureService.createVoiture(this.toFormData(payload)).subscribe({
      next: () => this.loadCars()
    });
  }

  private toFormData(obj: any): FormData {
    const fd = new FormData();
    Object.entries(obj).forEach(([k, v]) => {
      if (v !== null && v !== undefined) fd.append(k, String(v));
    });
    return fd;
  }

  onPreviousPage(): void { if (this.page > 1)          { this.page--; this.loadCars(); } }
  onNextPage():     void { if (this.page < this.pages) { this.page++; this.loadCars(); } }

  t(key: string): string { return this.ts.translate(key); }
}
