import { Component, OnInit, OnDestroy, AfterViewInit, ElementRef, ViewChild, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { safe, toArr } from '../shared/utils/rx.utils';
import { CrudService } from '../services/crud.service';
import { TranslationService } from '../services/translation.service';
import { AuthService } from '../services/auth.service';
import { daysUntil } from '../shared/utils/date.utils';

interface KPI { label: string; value: string; sub?: string; trend?: number; color: string; icon: string; link?: string; }
interface AlertRow { icon: string; text: string; urgency: 'critical' | 'warning' | 'info'; link: string; }

@Component({
  selector: 'app-executive',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './executive.component.html',
  styleUrls: ['../shared/styles/reports.css'],
})
export class ExecutiveComponent implements OnInit, OnDestroy, AfterViewInit {
  loading = true;
  dir = 'ltr';

  kpis: KPI[] = [];
  alerts: AlertRow[] = [];

  // Finance
  revenueThisMonth = 0;
  revenueLastMonth = 0;
  expensesThisMonth = 0;
  profitThisMonth = 0;
  outstanding = 0;
  collected = 0;

  // Fleet
  totalVehicles = 0;
  availableVehicles = 0;
  rentedVehicles = 0;
  maintenanceVehicles = 0;
  fleetUtilization = 0;

  // Operations
  activeReservations = 0;
  pendingReservations = 0;
  totalClients = 0;

  // Top vehicles
  topVehicles: { label: string; revenue: number; rentals: number }[] = [];

  // Expense breakdown by category
  expenseBreakdown: { label: string; amount: number }[] = [];

  // Date filter
  filterFrom = '';
  filterTo   = '';
  activePreset = 'all';
  filterStuck  = false;
  private rawResList: any[] = [];
  private rawExpList: any[] = [];
  private rawCarList: any[] = [];

  @ViewChild('filterSentinel') private filterSentinel!: ElementRef;
  private readonly onScroll = () => {
    if (!this.filterSentinel?.nativeElement) return;
    const rect  = (this.filterSentinel.nativeElement as HTMLElement).getBoundingClientRect();
    const stuck = rect.bottom <= 0;
    if (stuck !== this.filterStuck) { this.filterStuck = stuck; this.cdr.detectChanges(); }
  };

  // Monthly chart (last 6 months)
  monthBars: { label: string; revenue: number; expenses: number; rH: number; eH: number }[] = [];
  private rawMonths: { idx: number; year: number; revenue: number; expenses: number }[] = [];
  readonly monthKeys = ['mJan','mFeb','mMar','mApr','mMay','mJun','mJul','mAug','mSep','mOct','mNov','mDec'];
  selectedBarIdx: number | null = null;

  get selectedBar() { return this.selectedBarIdx !== null ? (this.monthBars[this.selectedBarIdx] ?? null) : null; }
  selectBar(i: number) { this.selectedBarIdx = this.selectedBarIdx === i ? null : i; }
  get arrow(): string { return this.dir === 'rtl' ? '←' : '→'; }

  // Compliance
  complianceAlerts = { overdue: 0, critical: 0, warning: 0 };

  private readonly revenueStatuses = [
    'confirmed','confirmee','active','en_cours','encours','completed','terminee','done','termine',
  ];

  get isAdmin(): boolean { return this.auth.hasRole('ROLE_ADMIN'); }

  constructor(
    private crud: CrudService,
    private ts: TranslationService,
    private auth: AuthService,
    private cdr: ChangeDetectorRef,
  ) {}

  t(key: string): string { return this.ts.translate(key); }

  ngAfterViewInit() {
    window.addEventListener('scroll', this.onScroll, { passive: true });
    document.querySelector('.page-content')?.addEventListener('scroll', this.onScroll, { passive: true });
  }

  ngOnDestroy() {
    window.removeEventListener('scroll', this.onScroll);
    document.querySelector('.page-content')?.removeEventListener('scroll', this.onScroll);
  }

  ngOnInit() {
    this.ts.direction$.subscribe(d => this.dir = d);
    this.ts.currentLang$.subscribe(() => {
      if (!this.loading) {
        this.rebuildMonthBars();
        this.rebuildKpis();
        this.rebuildAlerts();
      }
    });
    this.load();
  }

  private rebuildKpis(): void {
    const revTrend = this.revTrendPct;
    this.kpis = [
      {
        label: this.t('kpiRevenueThisMonth'), icon: '💰',
        value: this.fmt(this.revenueThisMonth),
        sub: `${revTrend >= 0 ? '+' : ''}${revTrend}% ${this.t('vsLastMonth')}`,
        trend: revTrend, color: '#276749', link: '/rapports/financial',
      },
      {
        label: this.t('kpiFleetUtil'), icon: '🚗',
        value: `${this.fleetUtilization}%`,
        sub: `${this.rentedVehicles} ${this.t('ofLabel')} ${this.totalVehicles} ${this.t('vehiclesRented')}`,
        trend: undefined, color: '#2b6cb0', link: '/rapports/fleet',
      },
      ...(this.isAdmin ? [{
        label: this.t('kpiActiveRes'), icon: '📅',
        value: String(this.activeReservations),
        sub: `${this.pendingReservations} ${this.t('pendingConfirmation')}`,
        color: '#553c9a', link: '/reservation',
      }] : []),
      {
        label: this.t('outstandingDebt'), icon: '📊',
        value: this.fmt(this.outstanding),
        sub: `${this.t('thCollected')}: ${this.fmt(this.collected)}`,
        color: this.outstanding > 10000 ? '#c53030' : '#dd6b20', link: '/paiement-client',
      },
      {
        label: this.t('kpiProfit'), icon: '📈',
        value: this.fmt(this.profitThisMonth),
        sub: `${this.t('revenue')} ${this.fmt(this.revenueThisMonth)} · ${this.t('expenses')} ${this.fmt(this.expensesThisMonth)}`,
        trend: this.profitThisMonth >= 0 ? 1 : -1,
        color: this.profitThisMonth >= 0 ? '#276749' : '#c53030', link: '/rapports/financial',
      },
      {
        label: this.t('kpiCompliance'), icon: '⚠️',
        value: String(this.complianceAlerts.overdue + this.complianceAlerts.critical),
        sub: `${this.complianceAlerts.overdue} ${this.t('overdueCount')} · ${this.complianceAlerts.warning} ${this.t('warningsCount')}`,
        color: this.complianceAlerts.overdue > 0 ? '#c53030' : '#dd6b20', link: '/compliance-center',
      },
    ];
  }

  private rebuildAlerts(): void {
    this.alerts = [];
    if (this.complianceAlerts.overdue > 0) {
      this.alerts.push({ icon: '🔴', text: `${this.complianceAlerts.overdue} ${this.t('alertOverdueDocs')}`, urgency: 'critical', link: '/compliance-center' });
    }
    if (this.pendingReservations > 0) {
      this.alerts.push({ icon: '🟡', text: `${this.pendingReservations} ${this.t('alertPendingRes')}`, urgency: 'warning', link: '/reservation' });
    }
    if (this.maintenanceVehicles > 0) {
      this.alerts.push({ icon: '🟠', text: `${this.maintenanceVehicles} ${this.t('alertInMaint')}`, urgency: 'warning', link: '/maintenance/planning' });
    }
    if (this.outstanding > 0) {
      this.alerts.push({ icon: '🔵', text: `${this.fmt(this.outstanding)} ${this.t('alertOutstanding')}`, urgency: 'info', link: '/paiement-client' });
    }
  }

  private rebuildMonthBars(): void {
    const bars = this.rawMonths.map(m => ({
      label: `${this.t(this.monthKeys[m.idx])} ${m.year}`,
      revenue: m.revenue, expenses: m.expenses, rH: 0, eH: 0,
    }));
    const maxBar = Math.max(...bars.map(b => Math.max(b.revenue, b.expenses)), 1);
    for (const b of bars) {
      b.rH = Math.round((b.revenue / maxBar) * 120);
      b.eH = Math.round((b.expenses / maxBar) * 120);
    }
    this.monthBars = bars;
  }

  private loadAll(endpoint: string, params: Record<string, any> = {}) {
    return this.crud.getPage<any>(endpoint, { ...params, page: 1 }).pipe(
      switchMap((r: any) => {
        const first: any[] = r?.data ?? [];
        const pages: number = r?.meta?.totalPages ?? r?.meta?.pages ?? 1;
        if (pages <= 1) return of(first);
        const rest$ = Array.from({ length: pages - 1 }, (_, i) =>
          this.crud.getPage<any>(endpoint, { ...params, page: i + 2 }).pipe(
            map((p: any) => p?.data ?? []),
            catchError(() => of([]))
          )
        );
        return forkJoin(rest$).pipe(map((chunks: any[][]) => [first, ...chunks].flat()));
      }),
      catchError(() => of([]))
    );
  }

  load() {
    this.loading = true;
    const now     = new Date();
    const thisYM  = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const prev    = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastYM  = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`;

    forkJoin({
      cars:         safe(this.crud.getAll('voiture', { limit: 500 })),
      reservations: this.loadAll('reservation'),
      depenses:     this.loadAll('depense'),
      clients:      this.loadAll('client'),
      assur:        this.loadAll('assurance'),
      vignettes:    this.loadAll('vignette'),
      suivis:       this.loadAll('suivi-technique'),
      vidanges:     this.loadAll('vidange'),
    }).pipe(
      map(({ cars, reservations, depenses, clients, assur, vignettes, suivis, vidanges }: any) => {
        const allCars  = toArr(cars);
        const carList  = this.isAdmin
          ? allCars
          : allCars.filter((c: any) => !['brouillon', 'setup'].includes((c.voitureStatus ?? '').toLowerCase()));
        const resList  = toArr(reservations);
        const expList  = toArr(depenses);
        const clientList = toArr(clients);
        const asList   = toArr(assur);
        const vigList  = toArr(vignettes);
        const suvList  = toArr(suivis);
        const vidList  = toArr(vidanges);

        // ── Fleet ────────────────────────────────────────────────
        this.totalVehicles       = carList.length;
        this.availableVehicles   = carList.filter((c: any) => ((c.effectiveStatus ?? c.voitureStatus) ?? '').toLowerCase() === 'disponible').length;
        this.maintenanceVehicles = carList.filter((c: any) => ((c.effectiveStatus ?? c.voitureStatus) ?? '').toLowerCase() === 'maintenance').length;

        // Count vehicles with an active reservation today (don't rely on voitureStatus being in sync)
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const activeStatuses = ['active','en_cours','confirmed','confirmee'];
        const rentedCarIds = new Set(
          toArr(reservations).filter((r: any) => {
            const status = (r.reservationStatus ?? r.statut ?? '').toLowerCase();
            if (!activeStatuses.includes(status)) return false;
            const start = new Date(r.dateDebut ?? 0); start.setHours(0, 0, 0, 0);
            const end   = new Date(r.dateFin   ?? 0); end.setHours(23, 59, 59, 999);
            return start <= today && end >= today;
          }).map((r: any) => r.voitureId ?? r.voiture?.id)
            .filter((id: any) => id != null)
        );
        this.rentedVehicles   = rentedCarIds.size;
        this.fleetUtilization = this.totalVehicles > 0
          ? Math.round((this.rentedVehicles / this.totalVehicles) * 100)
          : 0;

        // ── Reservations ─────────────────────────────────────────
        this.activeReservations  = resList.filter((r: any) =>
          ['active','en_cours','confirmed','confirmee'].includes((r.reservationStatus ?? r.statut ?? '').toLowerCase())
        ).length;
        this.pendingReservations = resList.filter((r: any) =>
          ['en_attente','pending'].includes((r.reservationStatus ?? r.statut ?? '').toLowerCase())
        ).length;
        this.totalClients = clientList.length || new Set(resList.map((r: any) => r.clientId ?? r.client?.id)).size;

        // ── Store raw data for date filtering ────────────────────
        this.rawResList = resList;
        this.rawExpList = expList;
        this.rawCarList = carList;

        // ── Monthly chart (last 6 months, always full data) ──────
        const revenueResAll = resList.filter((r: any) =>
          this.revenueStatuses.includes((r.reservationStatus ?? r.statut ?? '').toLowerCase())
        );
        const getYM = (r: any) => {
          const d = new Date(r.dateDebut ?? r.creeAu ?? 0);
          return isNaN(d.getTime()) ? '' : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        };
        const getExpYM = (e: any) => {
          const d = new Date(e.date ?? e.creeAu ?? 0);
          return isNaN(d.getTime()) ? '' : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        };
        this.rawMonths = [];
        for (let i = 5; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          const rev = revenueResAll.filter((r: any) => getYM(r) === ym)
            .reduce((s: number, r: any) => s + parseFloat(r.total ?? 0), 0);
          const exp = expList.filter((e: any) => getExpYM(e) === ym)
            .reduce((s: number, e: any) => s + parseFloat(e.montant ?? 0), 0);
          this.rawMonths.push({ idx: d.getMonth(), year: d.getFullYear(), revenue: rev, expenses: exp });
        }
        this.rebuildMonthBars();

        // ── Compliance alerts ────────────────────────────────────
        let overdue = 0, critical = 0, warning = 0;
        for (const a of [...asList, ...vigList]) {
          const days = daysUntil(a.dateFin ?? a.dateExpiration);
          if (days === null) continue;
          if (days < 0)    overdue++;
          else if (days <= 7)  critical++;
          else if (days <= 30) warning++;
        }
        for (const s of suvList) {
          const days = daysUntil(s.prochainDate ?? s.dateProchaine);
          if (days === null) continue;
          if (days < 0)    overdue++;
          else if (days <= 7)  critical++;
          else if (days <= 30) warning++;
        }
        for (const v of vidList) {
          const car = carList.find((c: any) => c.id === (v.voitureId ?? v.voiture?.id));
          const remKm = v.kmSuivant ? (v.kmSuivant - (car?.kilometrage ?? 0)) : null;
          if (remKm !== null && remKm <= 0)       overdue++;
          else if (remKm !== null && remKm <= 300) critical++;
          else if (remKm !== null && remKm <= 1000) warning++;
        }
        this.complianceAlerts = { overdue, critical, warning };

        // ── Apply date filter (computes revenue/expenses/outstanding/topVehicles/KPIs) ──
        this.applyDateFilter();
      })
    ).subscribe({
      next: () => { this.loading = false; },
      error: () => { this.loading = false; },
    });
  }

  setPreset(p: string): void {
    this.activePreset = p;
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const fmtDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    if (p === 'thisMonth') {
      this.filterFrom = fmtDate(new Date(now.getFullYear(), now.getMonth(), 1));
      this.filterTo   = fmtDate(now);
    } else if (p === 'lastMonth') {
      this.filterFrom = fmtDate(new Date(now.getFullYear(), now.getMonth() - 1, 1));
      this.filterTo   = fmtDate(new Date(now.getFullYear(), now.getMonth(), 0));
    } else if (p === 'thisYear') {
      this.filterFrom = fmtDate(new Date(now.getFullYear(), 0, 1));
      this.filterTo   = fmtDate(now);
    } else {
      this.filterFrom = '';
      this.filterTo   = '';
    }
    this.applyDateFilter();
  }

  onDateChange(): void {
    this.activePreset = '';
    this.applyDateFilter();
  }

  applyDateFilter(): void {
    if (!this.rawResList.length && !this.rawExpList.length) return;
    const from = this.filterFrom ? new Date(this.filterFrom) : null;
    const to   = this.filterTo   ? new Date(this.filterTo + 'T23:59:59') : null;
    const filtered = !!(from || to);
    const inRange = (dateStr: string): boolean => {
      if (!dateStr) return true;
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return true;
      if (from && d < from) return false;
      if (to   && d > to)   return false;
      return true;
    };
    this.recomputeFiltered(
      filtered ? this.rawResList.filter(r => inRange(r.dateDebut ?? '')) : this.rawResList,
      filtered ? this.rawExpList.filter(e => inRange(e.date ?? e.creeAu ?? '')) : this.rawExpList,
      filtered
    );
  }

  private recomputeFiltered(resList: any[], expList: any[], filtered: boolean): void {
    const revenueRes = resList.filter((r: any) =>
      this.revenueStatuses.includes((r.reservationStatus ?? r.statut ?? '').toLowerCase())
    );

    this.revenueThisMonth  = revenueRes.reduce((s, r) => s + parseFloat(r.total ?? 0), 0);
    this.revenueLastMonth  = 0;
    this.expensesThisMonth = expList.reduce((s, e) => s + parseFloat(e.montant ?? 0), 0);

    this.profitThisMonth = this.revenueThisMonth - this.expensesThisMonth;

    const activeRes = resList.filter((r: any) =>
      !['annulee', 'cancelled', 'annule'].includes((r.reservationStatus ?? r.statut ?? '').toLowerCase())
    );
    this.outstanding = activeRes
      .filter((r: any) => (r.total ?? 0) > 0)
      .reduce((s, r) => s + Math.max(0, parseFloat(r.total ?? 0) - parseFloat(r.montantPaye ?? 0)), 0);
    this.collected = activeRes.reduce((s, r) => s + parseFloat(r.montantPaye ?? 0), 0);

    const vehicleRevMap = new Map<number, { label: string; revenue: number; rentals: number }>();
    for (const r of revenueRes) {
      const vid = r.voitureId ?? r.voiture?.id;
      if (!vid) continue;
      const car = this.rawCarList.find((c: any) => c.id === vid);
      const label = car ? `${car.marque ?? ''} ${car.modele ?? ''}`.trim() : `#${vid}`;
      const existing = vehicleRevMap.get(vid) ?? { label, revenue: 0, rentals: 0 };
      vehicleRevMap.set(vid, { label, revenue: existing.revenue + parseFloat(r.total ?? 0), rentals: existing.rentals + 1 });
    }
    this.topVehicles = Array.from(vehicleRevMap.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 5);

    // Expense breakdown by category
    const catMap = new Map<string, number>();
    for (const e of expList) {
      const cat = (e.categorie || '').trim() || '—';
      catMap.set(cat, (catMap.get(cat) ?? 0) + parseFloat(e.montant ?? 0));
    }
    this.expenseBreakdown = Array.from(catMap.entries())
      .map(([label, amount]) => ({ label, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 4);

    this.rebuildKpis();
    this.rebuildAlerts();
  }

  get revTrendPct(): number {
    if (this.revenueLastMonth === 0) return 0;
    return Math.round(((this.revenueThisMonth - this.revenueLastMonth) / this.revenueLastMonth) * 100);
  }

  barPct(value: number, total: number): number {
    return total > 0 ? Math.round((value / total) * 100) : 0;
  }

  fmt(n: number): string {
    const lang = this.ts.getCurrentLanguage();
    const locale = lang === 'ar' ? 'ar-MA' : lang === 'fr' ? 'fr-MA' : 'en-US';
    return n.toLocaleString(locale, { maximumFractionDigits: 0 }) + ' MAD';
  }

  fmtFull(n: number): string {
    return n.toLocaleString('fr-MA', { maximumFractionDigits: 0 }) + ' MAD';
  }
}
