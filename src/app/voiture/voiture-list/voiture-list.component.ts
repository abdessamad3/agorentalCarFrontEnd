import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { Subject, switchMap, of, forkJoin } from 'rxjs';
import { debounceTime, takeUntil, catchError } from 'rxjs/operators';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { ComplianceBadgeComponent } from '../../shared/compliance-badge/compliance-badge.component';
import { UploadBtnComponent } from '../../shared/btn/upload-btn.component';
import { VoitureService } from '../../services/voiture.service';
import { CrudService } from '../../services/crud.service';
import { TranslationService } from '../../services/translation.service';
import { AuthService } from '../../services/auth.service';
import { environment } from '../../../environments/environment';
import { complianceSeverity } from '../../shared/utils/compliance.utils';

const PLACEHOLDER = `data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjI1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjI1MCIgZmlsbD0iI2VkZjJmNyIvPjx0ZXh0IHg9IjIwMCIgeT0iMTI1IiBmaWxsPSIjYTBhZWMwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkb21pbmFudC1iYXNlbGluZT0ibWlkZGxlIiBmb250LXNpemU9IjYwIj7wn5qlPC90ZXh0Pjwvc3ZnPg==`;

@Component({
  selector: 'app-voiture-list',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterLink, ComplianceBadgeComponent, UploadBtnComponent],
  templateUrl: './voiture-list.component.html',
  styleUrls: ['./voiture-list.component.css']
})
export class VoitureListComponent implements OnInit, OnDestroy {
  voitures: any[] = [];
  reservations: any[] = [];
  private oilStatusMap: Map<number, { status: 'OK' | 'DUE_SOON' | 'OVERDUE' | 'UNKNOWN'; remainingKm: number | null; nextKm: number | null }> = new Map();
  loading = true;
  error = '';
  page = 1;
  limit = 20;
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

  stats = {
    total: 0, brouillon: 0, setup: 0, disponible: 0, reserve: 0,
    louee: 0, maintenance: 0, horsService: 0, decommissioned: 0, vendu: 0, archive: 0
  };

  get canManageVehicle(): boolean {
    return !this.auth.hasRole('ROLE_STAFF') && !this.auth.hasRole('ROLE_MANAGER');
  }

  modalMode: 'edit' | 'delete' | null = null;
  selectedVoiture: any = null;
  isSubmitting = false;
  deleteId: number | null = null;
  deleteError = '';

  editImageFile: File | null = null;
  editImagePreview: SafeUrl | null = null;
  editGallery: { id: number; path: string }[] = [];

  toast: { message: string; type: 'error' | 'success' } | null = null;
  private toastTimer: any;

  editForm: FormGroup;

  readonly STATUS_TABS = [
    { key: 'all',            labelKey: 'all'            },
    { key: 'brouillon',      labelKey: 'brouillon'      },
    { key: 'setup',          labelKey: 'setup'          },
    { key: 'disponible',     labelKey: 'disponible'     },
    { key: 'reserve',        labelKey: 'reserve'        },
    { key: 'louee',          labelKey: 'louee'          },
    { key: 'maintenance',    labelKey: 'maintenance'    },
    { key: 'hors_service',   labelKey: 'horsService'    },
    { key: 'decommissioned', labelKey: 'decommissioned' },
    { key: 'vendu',          labelKey: 'vendu'          },
    { key: 'archive',        labelKey: 'archive'        },
  ];

  readonly FUEL_OPTIONS = ['Essence','Diesel','Hybride','Electrique'];
  readonly TRANSMISSION_OPTIONS = ['Manuelle','Automatique'];

  constructor(
    private voitureService: VoitureService,
    private crud: CrudService,
    private ts: TranslationService,
    private fb: FormBuilder,
    public router: Router,
    private route: ActivatedRoute,
    private sanitizer: DomSanitizer,
    private auth: AuthService
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
    });
  }

  private searchSubject = new Subject<void>();
  private destroy$ = new Subject<void>();

  ngOnInit(): void {
    this.ts.direction$.subscribe(d => this.dir = d);
    this.searchSubject.pipe(
      debounceTime(300),
      switchMap(() => {
        this.loading = true; this.error = '';
        return this.carsObs().pipe(catchError(() => { this.error = this.ts.translate('loadError'); return of(null); }));
      }),
      takeUntil(this.destroy$)
    ).subscribe(r => { if (r) this.applyCarsResult(r); this.loading = false; });
    const editId = this.route.snapshot.queryParamMap.get('edit');
    this.loadCars(editId ? +editId : undefined);
  }

  ngOnDestroy() { this.destroy$.next(); this.destroy$.complete(); }

  private carsObs() {
    return forkJoin({
      cars:         this.voitureService.getVoitures(this.page, this.limit, this.searchQuery, this.dateFrom, this.dateTo),
      reservations: this.crud.getAll('reservation').pipe(catchError(() => of([]))),
      oilReminders: this.crud.getAll('dashboard/oil-reminders').pipe(catchError(() => of(null))),
    });
  }

  private applyCarsResult({ cars, reservations, oilReminders }: any, openEditId?: number) {
    let data: any[] = [];
    if (Array.isArray(cars)) { data = cars; this.total = data.length; this.pages = 1; }
    else if (cars?.data) { data = cars.data; this.total = cars.meta?.total ?? data.length; this.pages = cars.meta?.totalPages ?? cars.meta?.pages ?? 1; }
    this.reservations = Array.isArray(reservations) ? reservations : (reservations?.data ?? []);
    this.buildOilStatusMap(oilReminders, data);
    this.voitures = data.map((v: any) => ({ ...v, _img: this.imgUrl(v.image) }));
    this.calcStats();
    if (openEditId) {
      const car = this.voitures.find(v => v.id === openEditId);
      if (car) this.openEdit(car);
      this.router.navigate([], { queryParams: {}, replaceUrl: true });
    }
  }

  loadCars(openEditId?: number): void {
    this.loading = true; this.error = '';
    this.carsObs().subscribe({
      next: r  => { this.applyCarsResult(r, openEditId); this.loading = false; },
      error: () => { this.loading = false; this.error = this.ts.translate('loadError'); }
    });
  }

  private buildOilStatusMap(reminders: any, cars: any[]): void {
    this.oilStatusMap.clear();
    if (reminders?.all) {
      for (const item of reminders.all) {
        this.oilStatusMap.set(item.voitureId, {
          status: item.status,
          remainingKm: item.remainingKm,
          nextKm: item.nextOilChangeKm,
        });
      }
    }
    for (const car of cars) {
      if (!this.oilStatusMap.has(car.id)) {
        this.oilStatusMap.set(car.id, { status: 'UNKNOWN', remainingKm: null, nextKm: null });
      }
    }
  }

  oilStatus(carId: number): { status: 'OK' | 'DUE_SOON' | 'OVERDUE' | 'UNKNOWN'; remainingKm: number | null; nextKm: number | null } {
    return this.oilStatusMap.get(carId) ?? { status: 'UNKNOWN', remainingKm: null, nextKm: null };
  }

  // ── Status (server-authoritative) ────────────────────────────────────────

  effectiveStatus(v: any): string {
    return ((v.effectiveStatus || v.voitureStatus || 'brouillon') as string).toLowerCase();
  }

  calcStats(): void {
    const all = this.voitures;
    this.stats = {
      total:         this.total || all.length,
      brouillon:     all.filter(v => this.effectiveStatus(v) === 'brouillon').length,
      setup:         all.filter(v => this.effectiveStatus(v) === 'setup').length,
      disponible:    all.filter(v => this.effectiveStatus(v) === 'disponible').length,
      reserve:       all.filter(v => this.effectiveStatus(v) === 'reserve').length,
      louee:         all.filter(v => this.effectiveStatus(v) === 'louee').length,
      maintenance:   all.filter(v => this.effectiveStatus(v) === 'maintenance').length,
      horsService:   all.filter(v => this.effectiveStatus(v) === 'hors_service').length,
      decommissioned:all.filter(v => this.effectiveStatus(v) === 'decommissioned').length,
      vendu:         all.filter(v => this.effectiveStatus(v) === 'vendu').length,
      archive:       all.filter(v => this.effectiveStatus(v) === 'archive').length,
    };
  }

  get filtered(): any[] {
    let list = this.voitures;
    if (this.statusFilter !== 'all')    list = list.filter(v => this.effectiveStatus(v) === this.statusFilter.toLowerCase());
    if (this.fuelFilter)                list = list.filter(v => (v.typeCarburant || '').toLowerCase() === this.fuelFilter.toLowerCase());
    if (this.transmissionFilter)        list = list.filter(v => (v.transmission || '').toLowerCase() === this.transmissionFilter.toLowerCase());
    if (this.categoryFilter)            list = list.filter(v => (v.categorie || '').toLowerCase() === this.categoryFilter.toLowerCase());
    return list;
  }

  onSearch(): void { this.page = 1; this.searchSubject.next(); }

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
    this.page = 1;
    this.loadCars();
  }

  imgUrl(img?: string): string {
    if (!img) return PLACEHOLDER;
    if (img.startsWith('http') || img.startsWith('data:')) return img;
    return environment.serverUrl + img;
  }

  // ── Alert helpers ────────────────────────────────────────────────────────

  alertCount(car: any): number {
    const c = car.compliance;
    if (c) {
      return ['vignette', 'assurance', 'visite'].filter(k => {
        const sev = complianceSeverity(c[k]?.status);
        return sev === 'warning' || sev === 'danger';
      }).length;
    }
    return this.effectiveStatus(car) === 'hors_service' ? 1 : 0;
  }

  alertLevel(car: any): 'danger' | 'warning' | '' {
    const c = car.compliance;
    if (c) {
      const severities = ['vignette', 'assurance', 'visite'].map(k => complianceSeverity(c[k]?.status));
      if (severities.includes('danger')) return 'danger';
      if (severities.includes('warning')) return 'warning';
      return '';
    }
    return this.effectiveStatus(car) === 'hors_service' ? 'danger' : '';
  }

  compDotClass(status: string | undefined): string {
    const sev = complianceSeverity(status);
    if (sev === 'neutral') return 'dot-unknown';
    if (sev === 'ok')      return 'dot-ok';
    if (sev === 'warning') return 'dot-warn';
    return 'dot-critical';
  }

  // ── Status display ───────────────────────────────────────────────────────

  statusClass(s: string): string {
    const map: Record<string, string> = {
      brouillon:      'st-draft',
      setup:          'st-setup',
      disponible:     'st-green',
      reserve:        'st-teal',
      louee:          'st-blue',
      maintenance:    'st-orange',
      hors_service:   'st-red',
      decommissioned: 'st-brown',
      vendu:          'st-gray',
      archive:        'st-dark',
    };
    return map[(s || '').toLowerCase()] ?? 'st-gray';
  }

  statusLabel(s: string): string {
    const normalized = (s || '').toLowerCase();
    const keyMap: Record<string, string> = {
      brouillon:      'brouillon',
      setup:          'setup',
      disponible:     'disponible',
      reserve:        'reserve',
      louee:          'louee',
      maintenance:    'maintenance',
      hors_service:   'horsService',
      decommissioned: 'decommissioned',
      vendu:          'vendu',
      archive:        'archive',
    };
    return this.t(keyMap[normalized] ?? normalized);
  }

  statCount(key: string): number {
    if (key === 'all') return this.stats.total;
    return (this.stats as any)[key === 'hors_service' ? 'horsService' : key] ?? 0;
  }

  // ── Next booking ─────────────────────────────────────────────────────────

  nextBookingDate(carId: number): string | null {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const cancelled = ['annulee', 'annule', 'cancelled'];
    const upcoming = this.reservations
      .filter(r => {
        if ((r.voitureId ?? r.voiture?.id) !== carId) return false;
        if (cancelled.includes((r.reservationStatus || r.statut || '').toLowerCase())) return false;
        const start = new Date(r.dateDebut); start.setHours(0, 0, 0, 0);
        return start >= today;
      })
      .sort((a, b) => new Date(a.dateDebut).getTime() - new Date(b.dateDebut).getTime())[0];
    if (!upcoming) return null;
    return new Date(upcoming.dateDebut).toLocaleDateString('fr-MA', { day: '2-digit', month: 'short', year: 'numeric' });
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
    });
    this.editGallery = Array.isArray(car.galleryImages)
      ? car.galleryImages.map((g: any) => ({ id: g.id, path: this.imgUrl(g.path) }))
      : [];
    this.modalMode = 'edit';
  }

  openDelete(id: number): void { this.deleteId = id; this.modalMode = 'delete'; }

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

  addGalleryImage(file: File): void {
    if (!this.selectedVoiture) return;
    this.voitureService.addVoitureImage(this.selectedVoiture.id, file).subscribe({
      next: (res) => { this.editGallery.push({ id: res.id, path: this.imgUrl(res.image) }); },
      error: (err) => { this.showToast(this.apiError(err)); }
    });
  }

  onEditImageSelect(file: File): void {
    this.editImageFile = file;
    const reader = new FileReader();
    reader.onload = (e) => this.editImagePreview = this.sanitizer.bypassSecurityTrustUrl(e.target?.result as string);
    reader.readAsDataURL(file);
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

  duplicate(car: any): void {
    const COPY_FIELDS = ['marque','modele','version','annee','typeCarburant','transmission',
      'couleur','places','portes','puissanceCv','categorie','climatisation',
      'kilometrageActuel','prixJour','prixSemaine','prixMois','prixAchat','caution','dateAchat'];
    const fd = new FormData();
    COPY_FIELDS.forEach(k => {
      const v = car[k];
      if (v !== null && v !== undefined && v !== '') fd.append(k, String(v));
    });
    this.voitureService.createVoiture(fd).subscribe({ next: () => this.loadCars() });
  }

  onPreviousPage(): void { if (this.page > 1)          { this.page--; this.loadCars(); } }
  onNextPage():     void { if (this.page < this.pages) { this.page++; this.loadCars(); } }

  // ── PHASE 8: per-car health indicators ──────────────────────────────────

  readinessScore(car: any): number {
    const c = car.compliance;
    let score = 0; let total = 0;

    // Identity: plate + brand + model + year
    total++; if (car.immatriculation && car.marque && car.modele && car.annee) score++;
    // Pricing
    total++; if ((car.prixJour ?? 0) > 0) score++;
    // Insurance
    total++; if (complianceSeverity(c?.assurance?.status) === 'ok') score++;
    // Vignette
    total++; if (complianceSeverity(c?.vignette?.status) === 'ok') score++;
    // Inspection (only required for cars 3+ years old)
    const age = car.annee ? (new Date().getFullYear() - +car.annee) : 0;
    if (age >= 3) {
      total++;
      if (complianceSeverity(c?.visite?.status) === 'ok' || c?.visite?.status === 'NOT_REQUIRED') score++;
    }

    return total > 0 ? Math.round((score / total) * 100) : 0;
  }

  readinessClass(score: number): string {
    if (score >= 100) return 'rdy-full';
    if (score >= 60)  return 'rdy-mid';
    return 'rdy-low';
  }

  showReadiness(car: any): boolean {
    return ['brouillon', 'setup'].includes(this.effectiveStatus(car));
  }

  t(key: string): string { return this.ts.translate(key); }
}
