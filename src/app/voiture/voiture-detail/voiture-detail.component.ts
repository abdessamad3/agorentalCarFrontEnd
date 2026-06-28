import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { switchMap, forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { VoitureService } from '../../services/voiture.service';
import { CrudService } from '../../services/crud.service';
import { TranslationService } from '../../services/translation.service';
import { EventBusService } from '../../services/event-bus.service';
import { environment } from '../../../environments/environment';
import { daysUntil as daysUntilUtil } from '../../shared/utils/date.utils';
import { complianceSeverity as complianceSeverityUtil, complianceScore as complianceScoreUtil, ComplianceSeverity } from '../../shared/utils/compliance.utils';
import { OverviewTabComponent }    from './tabs/overview-tab/overview-tab.component';
import { FinancialTabComponent }   from './tabs/financial-tab/financial-tab.component';
import { HistoryTabComponent }     from './tabs/history-tab/history-tab.component';
import { DocumentsTabComponent }   from './tabs/documents-tab/documents-tab.component';
import { ReadinessPanelComponent } from './readiness-panel/readiness-panel.component';
import { LifecyclePanelComponent, LifecycleState } from './lifecycle-panel/lifecycle-panel.component';
import { ConformiteTabComponent }  from './tabs/conformite-tab/conformite-tab.component';
import { TechnicalTabComponent }   from './tabs/technical-tab/technical-tab.component';
import { UploadBtnComponent }      from '../../shared/btn/upload-btn.component';
import { PaginatorComponent }      from '../../shared/paginator/paginator.component';

const PLACEHOLDER = `data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAwIiBoZWlnaHQ9IjUwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iODAwIiBoZWlnaHQ9IjUwMCIgZmlsbD0iI2VkZjJmNyIvPjx0ZXh0IHg9IjQwMCIgeT0iMjUwIiBmaWxsPSIjYTBhZWMwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkb21pbmFudC1iYXNlbGluZT0ibWlkZGxlIiBmb250LXNpemU9IjgwIj7wn5qlPC90ZXh0Pjwvc3ZnPg==`;

@Component({
  selector: 'app-voiture-detail',
  standalone: true,
  imports: [
    CommonModule, RouterLink, FormsModule, ReactiveFormsModule,
    OverviewTabComponent, FinancialTabComponent,
    HistoryTabComponent, DocumentsTabComponent,
    ReadinessPanelComponent, LifecyclePanelComponent, ConformiteTabComponent,
    TechnicalTabComponent, UploadBtnComponent, PaginatorComponent,
  ],
  templateUrl: './voiture-detail.component.html',
  styleUrls: ['./voiture-detail.component.css'],
})
export class VoitureDetailComponent implements OnInit {
  car: any = null;
  loading = true;
  error = '';
  dir = 'ltr';
  activeTab = 'overview';

  // Gallery
  images: string[] = [];
  activeImg = 0;
  lightboxOpen = false;

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

  // Support data — for tab badges and effectiveStatus
  reservations: any[] = [];
  reparations: any[] = [];
  vidanges: any[] = [];
  clients: any[] = [];
  loadingReservations = false;

  readonly FUEL_OPTIONS = ['Essence', 'Diesel', 'Hybride', 'Electrique'];
  readonly COVERAGE_TYPES = ['RC', 'Tous Risques', 'Tiers Étendu', 'Tiers Simple'];
  readonly MOROCCAN_INSURERS = [
    'Wafa Assurance', 'AXA Assurance Maroc', 'Allianz Maroc', 'Atlanta Assurance',
    'Saham Assurance', 'RMA Assurance', 'MCMA', 'MAMDA', 'Zurich Assurance Maroc',
    'Sanlam Maroc', 'CNIA Assurance', 'Essaada Assurance',
    'Maroc Assistance Internationale', 'Euler Hermes Acmar',
  ];

  readonly TABS = [
    { key: 'overview',      labelKey: 'overview',       icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
    { key: 'technical',     labelKey: 'technicalSpecs', icon: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
    { key: 'financial',     labelKey: 'financialInfo',  icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
    { key: 'reservations',  labelKey: 'reservations',   icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
    { key: 'conformite',    labelKey: 'conformite',     icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' },
    { key: 'sale',          labelKey: 'saleDecommission',   icon: 'M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138' },
    { key: 'maintenance',   labelKey: 'maintenance',    icon: 'M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z' },
    { key: 'history',       labelKey: 'history',        icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
    { key: 'credit',        labelKey: 'creditPayments', icon: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z' },
  ];

  // ── Sale flow ─────────────────────────────────────────────────────────────
  saleForm!: FormGroup;
  isRecordingSale  = false;
  saleError: string | null = null;
  saleRecord: any  = null;

  // ── Activate flow ─────────────────────────────────────────────────────────
  isActivating     = false;
  activateError: string | null = null;
  isMovingToSetup  = false;
  setupError: string | null = null;

  // ── Credit tab ────────────────────────────────────────────────────────────
  vehicleCredit: any = null;
  creditInstallments: any[] = [];
  loadingCredit = false;
  payingInstallment: number | null = null;
  cancelingInstallment: number | null = null;
  creditRefreshTick = 0;
  creditPage = 1;
  readonly creditPageSize = 20;

  get pagedCreditInstallments(): any[] {
    const start = (this.creditPage - 1) * this.creditPageSize;
    return this.creditInstallments.slice(start, start + this.creditPageSize);
  }

  constructor(
    private route: ActivatedRoute,
    private voitureService: VoitureService,
    private crud: CrudService,
    private ts: TranslationService,
    public router: Router,
    private fb: FormBuilder,
    private bus: EventBusService,
  ) {
    this.saleForm = this.fb.group({
      dateVente: [new Date().toISOString().substring(0, 10)],
      prixVente: [''],
      acheteur:  [''],
      notes:     [''],
    });

    this.editForm = this.fb.group({
      marque:            [''],
      modele:            [''],
      version:           [''],
      annee:             [''],
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
      kilometrageActuel: [0],
      prixJour:          [0],
      prixSemaine:       [0],
      prixMois:          [0],
      prixAchat:         [0],
      caution:           [0],
      dateAchat:         [''],
    });
  }

  ngOnInit(): void {
    this.ts.direction$.subscribe(d => this.dir = d);
    const id  = +this.route.snapshot.paramMap.get('id')!;
    const tab = this.route.snapshot.queryParamMap.get('tab');
    if (tab) this.activeTab = tab;
    this.load(id);
  }

  load(id: number): void {
    this.loading = true;
    this.voitureService.getVoitureById(id).subscribe({
      next: (data) => {
        this.car = data;
        this.buildGallery();
        this.loading = false;
        this.loadSupportData(id);
        const status = (data.effectiveStatus || data.voitureStatus || '').toLowerCase();
        if (status === 'vendu' || status === 'decommissioned') {
          this.loadSaleRecord(id);
        }
      },
      error: () => {
        this.error = this.ts.translate('loadError');
        this.loading = false;
      },
    });
  }

  reloadPhotos(): void { if (this.car) this.load(this.car.id); }

  loadSupportData(carId: number): void {
    this.loadingReservations = true;
    forkJoin({
      reservations: this.crud.getAll('reservation', { voitureId: carId }).pipe(catchError(() => of([]))),
      clients:      this.crud.getAll('client').pipe(catchError(() => of([]))),
      reparations:  this.crud.getAll('reparation', { voitureId: carId }).pipe(catchError(() => of([]))),
      vidanges:     this.crud.getAll('vidange', { voitureId: carId }).pipe(catchError(() => of([]))),
    }).subscribe(({ reservations, clients, reparations, vidanges }) => {
      const allRes = Array.isArray(reservations) ? reservations : (reservations as any)?.data ?? [];
      const allRep = Array.isArray(reparations)  ? reparations  : (reparations  as any)?.data ?? [];
      const allVid = Array.isArray(vidanges)      ? vidanges     : (vidanges     as any)?.data ?? [];
      this.clients      = Array.isArray(clients) ? clients : (clients as any)?.data ?? [];
      this.reservations = allRes.filter((r: any) => r.voitureId === carId || r.voiture?.id === carId);
      this.reparations  = allRep.filter((r: any) => (r.voitureId ?? r.voiture?.id) === carId);
      this.vidanges     = allVid.filter((v: any) => (v.voitureId ?? v.voiture?.id) === carId);
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
      this.showMoreActions = false;
      if (this.editModalOpen) this.closeEditModal();
    }
  }

  setActiveTab(key: string): void {
    this.activeTab = key;
    (document.querySelector('.page-content') as HTMLElement | null)?.scrollTo({ top: 0 });
    if (key === 'credit' && !this.vehicleCredit && this.car?.id) {
      this.loadCredit(this.car.id);
    }
  }

  loadCredit(carId: number): void {
    this.loadingCredit = true;
    this.crud.getAll('vehicle-credit', { voitureId: carId }).pipe(
      switchMap((res: any) => {
        const items = Array.isArray(res) ? res : (res?.data ?? []);
        if (!items.length) return of(null);
        return this.crud.getById('vehicle-credit', items[0].id);
      }),
      catchError(() => of(null))
    ).subscribe(full => {
      this.vehicleCredit = full;
      this.creditInstallments = full?.installments ?? [];
      this.creditPage = 1;
      this.loadingCredit = false;
    });
  }

  payInstallment(inst: any): void {
    this.payingInstallment = inst.id;
    this.crud.create('vehicle-credit-payment', {
      vehicleCreditId: this.vehicleCredit.id,
      installmentId:   inst.id,
      amount:          inst.amountDue,
      paymentType:     'scheduled',
      paymentDate:     new Date().toISOString().substring(0, 10),
    }).subscribe({
      next: () => {
        this.payingInstallment = null;
        this.refreshCredit();
        this.creditRefreshTick++;
        this.bus.paymentsChanged$.next();
      },
      error: () => { this.payingInstallment = null; },
    });
  }

  cancelInstallment(inst: any): void {
    if (!inst.paymentId) return;
    this.cancelingInstallment = inst.id;
    this.crud.remove('vehicle-credit-payment', inst.paymentId).subscribe({
      next: () => {
        this.cancelingInstallment = null;
        this.refreshCredit();
        this.creditRefreshTick++;
        this.bus.paymentsChanged$.next();
      },
      error: () => { this.cancelingInstallment = null; },
    });
  }

  private refreshCredit(): void {
    if (!this.car?.id) return;
    this.crud.getAll('vehicle-credit', { voitureId: this.car.id }).pipe(
      switchMap((res: any) => {
        const items = Array.isArray(res) ? res : (res?.data ?? []);
        if (!items.length) return of(null);
        return this.crud.getById('vehicle-credit', items[0].id);
      }),
      catchError(() => of(null))
    ).subscribe(full => {
      if (full) {
        this.vehicleCredit      = full;
        this.creditInstallments = full?.installments ?? [];
      }
    });
  }

  get creditMonthsRemaining(): number {
    if (!this.creditInstallments.length) return 0;
    return this.creditInstallments.filter(i => i.status !== 'paid').length;
  }

  get creditLastMonthRemainder(): number {
    if (!this.vehicleCredit) return 0;
    const last = this.creditInstallments[this.creditInstallments.length - 1];
    if (!last) return 0;
    const standard = this.vehicleCredit.monthlyInstallment ?? 0;
    return Math.abs(last.amountDue - standard) > 0.01 ? last.amountDue : 0;
  }

  @HostListener('document:click', ['$event'])
  onDocClick(e: MouseEvent): void {
    const t = e.target as HTMLElement;
    if (!t.closest('.more-actions-wrap')) this.showMoreActions = false;
  }

  // ── Lifecycle State (server-authoritative via FleetLifecycleManager) ────────

  get effectiveStatus(): string {
    if (!this.car) return 'brouillon';
    return (this.car.effectiveStatus || this.car.voitureStatus || 'brouillon').toLowerCase();
  }

  get lifecycleState(): LifecycleState {
    return this.effectiveStatus as LifecycleState;
  }

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

  get lifecycleLabel(): string {
    return this.effectiveStatus;
  }

  /** Returns true for terminal states where no actions are available */
  get isTerminalState(): boolean {
    return ['vendu', 'archive'].includes(this.effectiveStatus);
  }

  /** Returns true for states where new rentals/reservations are blocked */
  get isRentalBlocked(): boolean {
    return ['brouillon', 'setup', 'louee', 'maintenance', 'hors_service', 'decommissioned', 'vendu', 'archive'].includes(this.effectiveStatus);
  }

  /** Primary CTA label and route based on lifecycle state */
  get primaryAction(): { label: string; icon: string; route?: string; action?: string; color: string } | null {
    switch (this.effectiveStatus) {
      case 'disponible':
      case 'reserve':
        return { label: 'New Reservation', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z', route: '/reservation/create', color: 'ha-reserve' };
      case 'louee':
        return { label: 'Record Return', icon: 'M9 11l3 3L22 4M20.618 6.382A9 9 0 113.382 17.618', action: 'return', color: 'ha-primary' };
      case 'maintenance':
        return { label: 'Close Repair', icon: 'M5 13l4 4L19 7', action: 'close-repair', color: 'ha-warn' };
      case 'hors_service':
        return { label: 'Add Insurance', icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z', action: 'add-insurance', color: 'ha-danger' };
      case 'decommissioned':
        return { label: 'Enregistrer la vente', icon: 'M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138', action: 'goto-sale-tab', color: 'ha-danger' };
      case 'archive':
        return { label: 'Reactivate', icon: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15', action: 'reactivate', color: 'ha-primary' };
      default:
        return null;
    }
  }

  // ── Alert / compliance helpers (used in hero compliance bar) ──────────────
  daysUntil(dateStr?: string | null): number | null { return daysUntilUtil(dateStr); }
  isExpired(dateStr?: string):  boolean { const d = this.daysUntil(dateStr); return d !== null && d < 0; }
  isExpiring(dateStr?: string): boolean { const d = this.daysUntil(dateStr); return d !== null && d >= 0 && d <= 30; }

  alertLevel(dateStr?: string): 'danger' | 'warning' | '' {
    const days = this.daysUntil(dateStr);
    if (days === null) return '';
    if (days < 0)   return 'danger';
    if (days <= 7)  return 'danger';
    if (days <= 30) return 'warning';
    return '';
  }

  private complianceLevel(status: string): 'danger' | 'warning' | '' {
    const sev = complianceSeverityUtil(status);
    if (sev === 'danger') return 'danger';
    if (sev === 'warning') return 'warning';
    return '';
  }

  get docAlerts(): { icon: string; name: string; field: string; date: string; level: 'danger' | 'warning' | ''; status: string }[] {
    if (!this.car) return [];
    const c = this.car.compliance;
    if (!c) return [];
    return [
      { icon: '🛡️', name: 'insuranceDoc', field: 'assurance', date: c.assurance?.expiresAt || '', level: this.complianceLevel(c.assurance?.status), status: (c.assurance?.status || '').toUpperCase() },
      { icon: '📄', name: 'vignetteDoc',   field: 'vignette',  date: c.vignette?.expiresAt  || '', level: this.complianceLevel(c.vignette?.status),  status: (c.vignette?.status  || '').toUpperCase() },
      { icon: '🔬', name: 'technicalDoc',  field: 'visite',    date: c.visite?.expiresAt    || '', level: this.complianceLevel(c.visite?.status),    status: (c.visite?.status    || '').toUpperCase() },
    ];
  }

  get activeAlerts() { return this.docAlerts.filter(a => a.level !== ''); }
  get hasDangerAlert(): boolean { return this.activeAlerts.some(a => a.level === 'danger'); }
  isDanger(level: string):  boolean { return level === 'danger';  }
  isWarning(level: string): boolean { return level === 'warning'; }

  // ── Phase 2 — Health Score, Availability, Compliance Cards, Timeline ─────

  get healthScore(): number {
    const c = this.car?.compliance;
    const scoreOf = (s?: string): number => {
      const sev = complianceSeverityUtil(s);
      if (sev === 'ok')      return 100;
      if (sev === 'warning') return 55;
      if (sev === 'danger')  return 0;
      return 85; // neutral: unknown or not yet required
    };
    const insScore   = scoreOf(c?.assurance?.status);
    const vigScore   = scoreOf(c?.vignette?.status);
    const visitScore = scoreOf(c?.visite?.status);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const hasActiveRepair = this.reparations.some(r => {
      if (!r.dateFin) return true;
      const fin = new Date(r.dateFin); fin.setHours(23, 59, 59, 999);
      return fin >= today;
    });
    const repairScore = hasActiveRepair ? 25 : 100;
    const sixMonthsAgo = new Date(); sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const recentOil = this.vidanges.some((v: any) => {
      const d = v.dateVidange || v.date || v.createdAt;
      return d && new Date(d) >= sixMonthsAgo;
    });
    const oilScore = this.vidanges.length === 0 ? 70 : (recentOil ? 100 : 75);
    return Math.round(insScore * 0.25 + vigScore * 0.15 + visitScore * 0.15 + repairScore * 0.25 + oilScore * 0.20);
  }

  get healthScoreClass(): string {
    const s = this.healthScore;
    return s >= 80 ? 'hsc-good' : s >= 55 ? 'hsc-warn' : 'hsc-danger';
  }

  get nextBooking(): { date: Date; clientName: string } | null {
    const cancelled = ['annulee', 'annule', 'cancelled'];
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const upcoming = this.reservations
      .filter((r: any) => {
        if (cancelled.includes((r.reservationStatus || r.statut || '').toLowerCase())) return false;
        return new Date(r.dateDebut) > today;
      })
      .sort((a: any, b: any) => new Date(a.dateDebut).getTime() - new Date(b.dateDebut).getTime());
    if (!upcoming.length) return null;
    const r = upcoming[0];
    const client = this.clients.find((c: any) => c.id === (r.clientId ?? r.client?.id));
    return {
      date: new Date(r.dateDebut),
      clientName: client ? `${client.prenom ?? ''} ${client.nom ?? ''}`.trim() : '—',
    };
  }

  get occupancyRate(): number {
    const cancelled = ['annulee', 'annule', 'cancelled'];
    const endDate = new Date(); endDate.setHours(23, 59, 59, 999);
    const startDate = new Date(); startDate.setDate(startDate.getDate() - 29); startDate.setHours(0, 0, 0, 0);
    let rented = 0;
    let d = new Date(startDate);
    while (d <= endDate) {
      const ds = new Date(d); ds.setHours(0, 0, 0, 0);
      const de = new Date(d); de.setHours(23, 59, 59, 999);
      if (this.reservations.some((r: any) => {
        if (cancelled.includes((r.reservationStatus || r.statut || '').toLowerCase())) return false;
        return new Date(r.dateDebut) <= de && new Date(r.dateFin) >= ds;
      })) rented++;
      d = new Date(d.getTime() + 86400000);
    }
    return Math.round((rented / 30) * 100);
  }

  get complianceCards(): { key: string; label: string; icon: string; status: string; days: number | null; level: '' | 'warning' | 'danger' }[] {
    const c = this.car?.compliance;
    return [
      { key: 'assurance', label: 'Insurance',  icon: '🛡️' },
      { key: 'vignette',  label: 'Vignette',   icon: '🏷️' },
      { key: 'visite',    label: 'Inspection', icon: '🔬' },
    ].map(item => {
      const info = c?.[item.key];
      const status: string = info?.status ?? 'UNKNOWN';
      const expiresAt: string | null = info?.expiresAt ?? null;
      const days: number | null = info?.daysRemaining ?? daysUntilUtil(expiresAt);
      const sev = complianceSeverityUtil(status);
      const level: '' | 'warning' | 'danger' = sev === 'danger' ? 'danger' : sev === 'warning' ? 'warning' : '';
      return { ...item, status, days, level };
    });
  }

  get timelineEvents(): { date: Date; icon: string; title: string; subtitle: string; type: string }[] {
    const events: { date: Date; icon: string; title: string; subtitle: string; type: string }[] = [];
    this.reservations.forEach((r: any) => {
      if (!r.dateDebut) return;
      const client = this.clients.find((c: any) => c.id === (r.clientId ?? r.client?.id));
      const name = client ? `${client.prenom ?? ''} ${client.nom ?? ''}`.trim() : '';
      events.push({
        date: new Date(r.dateDebut),
        icon: '📅',
        title: name ? `Reservation — ${name}` : 'Reservation created',
        subtitle: `${new Date(r.dateDebut).toLocaleDateString('fr-FR')} → ${new Date(r.dateFin).toLocaleDateString('fr-FR')}`,
        type: 'reservation',
      });
    });
    this.reparations.forEach((r: any) => {
      const d = r.dateDebut || r.date || r.createdAt;
      if (!d) return;
      events.push({
        date: new Date(d),
        icon: '🔧',
        title: r.description || r.type || 'Repair performed',
        subtitle: [r.garage, r.montant ? r.montant + ' MAD' : ''].filter(Boolean).join(' · '),
        type: 'repair',
      });
    });
    this.vidanges.forEach((v: any) => {
      const d = v.dateVidange || v.date || v.createdAt;
      if (!d) return;
      events.push({
        date: new Date(d),
        icon: '🛢️',
        title: 'Oil change',
        subtitle: v.kilometrage ? `${(+v.kilometrage).toLocaleString('fr-FR')} km` : '',
        type: 'oil',
      });
    });
    return events
      .filter(e => !isNaN(e.date.getTime()))
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .slice(0, 8);
  }

  get vehicleAgeYears(): number {
    return new Date().getFullYear() - (this.car?.annee ?? new Date().getFullYear());
  }

  get complianceScore(): number {
    return complianceScoreUtil(this.car?.compliance, this.docAlerts);
  }

  get complianceStatusKey(): 'compliantStatus' | 'policyAlerts' | 'criticalStatus' {
    const overall = this.car?.compliance?.overall;
    if (overall === 'EXPIRED' || overall === 'CRITICAL') return 'criticalStatus';
    if (overall === 'WARNING') return 'policyAlerts';
    if (overall === 'VALID')   return 'compliantStatus';
    if (this.docAlerts.some(d => d.level === 'danger'))  return 'criticalStatus';
    if (this.docAlerts.some(d => d.level === 'warning')) return 'policyAlerts';
    return 'compliantStatus';
  }

  get expiredCount(): number { return this.docAlerts.filter(d => d.level === 'danger').length; }
  get expiringSoonCount(): number {
    const c = this.car?.compliance;
    if (c) {
      return ['vignette', 'assurance', 'visite'].filter(k => {
        const info = c[k];
        if (info?.status === 'NOT_REQUIRED') return false;
        return info?.status === 'CRITICAL' || (info?.status === 'WARNING' && info.daysRemaining <= 7);
      }).length;
    }
    return this.docAlerts.filter(d => {
      if (d.level !== 'warning') return false;
      const days = this.daysUntil(d.date);
      return days !== null && days <= 7;
    }).length;
  }
  get insuranceActive(): boolean {
    const status = this.car?.compliance?.assurance?.status;
    if (status) return status !== 'EXPIRED' && status !== 'CRITICAL';
    const ins = this.docAlerts.find(d => d.name === 'insuranceDoc');
    return ins ? ins.level !== 'danger' : true;
  }
  get currentTimeStr(): string {
    const n = new Date();
    return n.getHours().toString().padStart(2, '0') + ':' + n.getMinutes().toString().padStart(2, '0');
  }

  // ── Lifecycle Progress Bar ────────────────────────────────────────────────

  private lifecycleStepIndex(): number {
    switch (this.effectiveStatus) {
      case 'brouillon':      return 0;
      case 'setup':          return 1;
      case 'disponible':
      case 'reserve':
      case 'maintenance':
      case 'hors_service':   return 2;
      case 'louee':          return 3;
      case 'decommissioned': return 4;
      case 'vendu':
      case 'archive':        return 5;
      default:               return 0;
    }
  }

  get lifecycleSteps(): { label: string; sublabel: string; done: boolean; active: boolean }[] {
    const idx = this.lifecycleStepIndex();
    const steps = [
      { label: 'Purchased',   sublabel: 'Vehicle acquired'       },
      { label: 'Setup',       sublabel: 'Config & compliance'    },
      { label: 'Active Fleet',sublabel: 'Available for rental'   },
      { label: 'Rented',      sublabel: 'Generating revenue'     },
      { label: 'Decommission',sublabel: 'Exiting active fleet'   },
      { label: 'Sold',        sublabel: 'Fleet disposal complete' },
    ];
    return steps.map((s, i) => ({
      ...s,
      done:   i < idx,
      active: i === idx,
    }));
  }

  // ── Active Repair Count (for badge) ──────────────────────────────────────

  get activeRepairCount(): number {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    return this.reparations.filter(r => {
      if (r.statut === 'termine') return false;
      if (!r.dateFin) return true;
      const fin = new Date(r.dateFin); fin.setHours(23, 59, 59, 999);
      return fin >= today;
    }).length;
  }

  // ── Sale Preparation ──────────────────────────────────────────────────────

  get saleBlockers(): string[] {
    const blockers: string[] = [];
    const today = new Date(); today.setHours(0, 0, 0, 0);

    const activeRepairs = this.reparations.filter(r => {
      if (r.statut === 'termine') return false;
      if (!r.dateFin) return true;
      const fin = new Date(r.dateFin); fin.setHours(23, 59, 59, 999);
      return fin >= today;
    });
    if (activeRepairs.length > 0) {
      blockers.push(`${activeRepairs.length} active repair${activeRepairs.length > 1 ? 's' : ''} still in progress`);
    }

    const cancelled = ['annulee', 'annule', 'cancelled'];
    const futureRes = this.reservations.filter(r => {
      if (cancelled.includes((r.reservationStatus || r.statut || '').toLowerCase())) return false;
      return new Date(r.dateDebut) >= today;
    });
    if (futureRes.length > 0) {
      blockers.push(`${futureRes.length} upcoming reservation${futureRes.length > 1 ? 's' : ''} not yet served`);
    }

    if (this.effectiveStatus === 'louee') {
      blockers.push('Vehicle is currently on an active rental — cannot sell while rented');
    }

    const nonSellable = ['brouillon', 'setup', 'reserve', 'archive'];
    if (nonSellable.includes(this.effectiveStatus)) {
      blockers.push(`Vehicle is in "${this.lifecycleLabel}" state — must reach Available or Decommissioned first`);
    }

    return blockers;
  }

  get isSaleReady(): boolean {
    return this.saleBlockers.length === 0 && ['disponible', 'decommissioned'].includes(this.effectiveStatus);
  }

  // ── Decommission flow ─────────────────────────────────────────────────────

  showDecommissionModal = false;
  isDecommissioning     = false;
  decommissionError     = '';

  openDecommissionModal():  void { this.showDecommissionModal = true;  this.decommissionError = ''; }
  closeDecommissionModal(): void { this.showDecommissionModal = false; this.decommissionError = ''; }

  decommissionVehicle(): void {
    if (!this.car) return;
    this.isDecommissioning = true;
    this.decommissionError = '';
    this.voitureService.applyLifecycleEvent(this.car.id, 'vehicle.decommission_initiated').subscribe({
      next: () => {
        this.isDecommissioning = false;
        this.closeDecommissionModal();
        this.load(this.car.id);
      },
      error: (err: any) => {
        this.isDecommissioning = false;
        this.decommissionError = err?.error?.error || err?.error?.message || 'Mise hors service échouée.';
      },
    });
  }

  // ── Activation ───────────────────────────────────────────────────────────

  get canProceedToSetup(): boolean {
    if (this.effectiveStatus !== 'brouillon') return false;
    return !!(this.car?.immatriculation && (this.car?.kilometrageActuel ?? 0) > 0);
  }

  proceedToSetup(): void {
    if (!this.car || !this.canProceedToSetup) return;
    this.isMovingToSetup = true;
    this.setupError      = null;
    this.voitureService.applyLifecycleEvent(this.car.id, 'vehicle.setup_started').subscribe({
      next: () => { this.isMovingToSetup = false; this.load(this.car.id); },
      error: (err: any) => {
        this.isMovingToSetup = false;
        this.setupError = err?.error?.error || err?.error?.message || 'Transition échouée.';
      },
    });
  }

  get canActivate(): boolean {
    if (this.effectiveStatus !== 'setup') return false;
    const c = this.car?.compliance;
    if (!c) return false;
    const isOk = (status?: string) => { const sev = complianceSeverityUtil(status); return sev === 'ok' || sev === 'warning'; };
    const assOk = isOk(c.assurance?.status);
    const vigOk = isOk(c.vignette?.status);
    const age = new Date().getFullYear() - (this.car?.annee || new Date().getFullYear());
    const needsVisite = age >= 3;
    const visOk = !needsVisite || isOk(c.visite?.status);
    return !!(assOk && vigOk && visOk && this.car?.immatriculation && (this.car?.kilometrageActuel ?? 0) > 0);
  }

  activateVehicle(): void {
    if (!this.car || !this.canActivate) return;
    this.isActivating    = true;
    this.activateError   = null;
    this.voitureService.applyLifecycleEvent(this.car.id, 'vehicle.activated').subscribe({
      next: () => { this.isActivating = false; this.load(this.car.id); },
      error: (err: any) => {
        this.isActivating  = false;
        this.activateError = err?.error?.error || err?.error?.message || 'Activation échouée.';
      },
    });
  }

  // ── Sale flow ─────────────────────────────────────────────────────────────

  get saleStage(): 1 | 2 | 3 {
    if (this.effectiveStatus === 'vendu') return 3;
    if (this.effectiveStatus === 'decommissioned') return 2;
    return 1;
  }

  get estimatedProfit(): number | null {
    const sale = +(this.saleForm?.get('prixVente')?.value || 0);
    const purchase = +(this.car?.prixAchat || 0);
    if (!purchase || !sale) return null;
    return sale - purchase;
  }

  loadSaleRecord(voitureId: number): void {
    this.voitureService.getVenteForVoiture(voitureId).subscribe({
      next: (res: any) => {
        const items = Array.isArray(res) ? res : (res?.data ?? []);
        this.saleRecord = items.find((v: any) => v.voitureId === voitureId) ?? items[0] ?? null;
      },
      error: () => { this.saleRecord = null; },
    });
  }

  recordSale(): void {
    if (!this.car || this.isRecordingSale) return;
    const { dateVente, prixVente, acheteur, notes } = this.saleForm.value;
    if (!dateVente || !prixVente) {
      this.saleError = 'La date et le prix de vente sont requis.';
      return;
    }
    this.isRecordingSale = true;
    this.saleError = null;
    this.voitureService.recordSale({
      voitureId: this.car.id,
      dateVente,
      prixVente: +prixVente,
      acheteur:  acheteur || undefined,
      notes:     notes    || undefined,
    }).subscribe({
      next: () => { this.isRecordingSale = false; this.load(this.car.id); },
      error: (err: any) => {
        this.isRecordingSale = false;
        this.saleError = err?.error?.error || err?.error?.message || 'Enregistrement échoué.';
      },
    });
  }

  complianceTier(status: string | undefined): ComplianceSeverity {
    return complianceSeverityUtil(status);
  }

  blockerTab(blocker: string): string {
    if (blocker.includes('repair'))      return 'maintenance';
    if (blocker.includes('reservation')) return 'reservations';
    if (blocker.includes('rental'))      return 'reservations';
    return '';
  }

  // ── Onboarding action handlers ────────────────────────────────────────────

  isUpdating = false;

  onReadinessAction(action: string): void {
    if (action === 'edit-vehicle') { this.openEditModal(); return; }
    this.setActiveTab('conformite');
  }

  handlePrimaryAction(): void {
    const a = this.primaryAction;
    if (!a) return;
    if (a.action === 'goto-sale-tab') { this.setActiveTab('sale'); return; }
    if (a.route) { this.router.navigate([a.route]); return; }
  }

  // ── Edit modal ────────────────────────────────────────────────────────────
  openEditModal(): void {
    if (!this.car) return;
    this.editForm.patchValue({
      marque: this.car.marque || '',         modele: this.car.modele || '',
      version: this.car.version || '',       annee: this.car.annee || '',
      ...this.parsePlate(this.car.immatriculation || ''),
      vin: this.car.vin || '',
      typeCarburant: this.car.typeCarburant || 'Essence',
      transmission: this.car.transmission || 'Manuelle',
      couleur: this.car.couleur || '',       places: this.car.places || 5,
      portes: this.car.portes || 4,          puissanceCv: this.car.puissanceCv || '',
      categorie: this.car.categorie || '',   climatisation: this.car.climatisation || false,
      kilometrageActuel: this.car.kilometrageActuel || 0,
      prixJour: this.car.prixJour || 0,      prixSemaine: this.car.prixSemaine || 0,
      prixMois: this.car.prixMois || 0,      prixAchat: this.car.prixAchat || 0,
      caution: this.car.caution || 0,        dateAchat: this.car.dateAchat || '',
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

  saveEdit(): void {
    if (!this.car) return;
    this.isSubmitting = true;
    const id        = this.car.id;
    const imageFile = this.editImageFile;
    const { immatNum1, immatLetter, immatNum2, ...formRest } = this.editForm.value;
    const payload = { ...formRest, immatriculation: this.buildPlate() };
    this.voitureService.updateVoiture(id, payload).pipe(
      switchMap(() => imageFile ? this.voitureService.updateVoitureImage(id, imageFile) : of(null))
    ).subscribe({
      next: () => { this.closeEditModal(); this.load(id); this.showToast(this.t('save'), 'success'); },
      error: (err) => { this.isSubmitting = false; this.showToast(this.apiError(err)); },
    });
  }

  onEditImageSelect(file: File): void {
    this.editImageFile = file;
    const reader = new FileReader();
    reader.onload = (e) => this.editImagePreview = e.target?.result as string;
    reader.readAsDataURL(file);
  }

  addGalleryImage(file: File): void {
    if (!this.car) return;
    this.voitureService.addVoitureImage(this.car.id, file).subscribe({
      next: (res) => { this.editGallery.push({ id: res.id, path: this.imgUrlFor(res.image) }); },
      error: (err) => { this.showToast(this.apiError(err)); },
    });
  }

  removeGalleryImage(imgId: number): void {
    if (!this.car) return;
    this.voitureService.deleteVoitureImage(this.car.id, imgId).subscribe({
      next: () => { this.editGallery = this.editGallery.filter(i => i.id !== imgId); },
      error: (err) => { this.showToast(this.apiError(err)); },
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
