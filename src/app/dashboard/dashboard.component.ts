import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { CrudService } from '../services/crud.service';
import { TranslationService } from '../services/translation.service';
import { of } from 'rxjs';
import { catchError } from 'rxjs/operators';

interface MonthBar { label: string; revenue: number; expenses: number; revenueH: number; expensesH: number; }

interface DocAlert {
  carId: number;
  carLabel: string;
  immatriculation: string;
  docType: 'assurance' | 'vignette' | 'visite';
  date: Date;
  daysOverOrLeft: number;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
  loading = true;

  // KPI
  totalExpenses = 0;
  totalRevenue = 0;
  occupancyRate = 0;
  activeBookings = 0;
  totalCars = 0;
  totalClients = 0;

  // Fleet
  availableCars = 0;
  bookedCars = 0;
  maintenanceCars = 0;

  // Payment distribution
  paidCount = 0;
  unpaidCount = 0;
  partialCount = 0;

  // Charts
  monthBars: MonthBar[] = [];
  bookingMonthBars: { label: string; count: number; h: number }[] = [];

  // Recent bookings
  recentContracts: any[] = [];
  recentReservations: any[] = [];

  expiredAlerts: DocAlert[] = [];
  dueThisMonthAlerts: DocAlert[] = [];

  // Compliance KPIs (derived from car.compliance)
  compliantCount  = 0;
  warningCount    = 0;
  criticalCount   = 0;
  blockedCount    = 0;
  expiringSoon30: { car: any; doc: string; days: number }[] = [];
  critical7Days:  { car: any; doc: string; days: number }[] = [];

  carsInRepair: { car: any; repair: any }[] = [];
  oilDueSoon: any[] = [];
  oilOverdue: any[] = [];

  topCars: any[]    = [];
  bottomCars: any[] = [];
  profitLoading = true;
  readonly currentYear = new Date().getFullYear();

  creditsActive    = 0;
  creditsDue       = 0;
  creditsOverdue   = 0;
  creditDebtTotal  = 0;

  private allClients: any[] = [];
  private allVoitures: any[] = [];

  private cachedRevenueByMonth: any[] = [];
  private cachedExpensesByMonth: any[] = [];
  private cachedBookingsByMonth: any[] = [];

  dir = 'ltr';

  private monthNames: Record<string, string[]> = {
    en: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],
    fr: ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'],
    ar: ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'],
  };

  constructor(
    private crud: CrudService,
    private ts: TranslationService,
  ) {}

  ngOnInit() {
    this.ts.direction$.subscribe(d => this.dir = d);
    this.ts.currentLang$.subscribe(() => {
      if (this.cachedRevenueByMonth.length || this.cachedBookingsByMonth.length) {
        this.monthBars        = this.buildMonthBarsFromAgg(this.cachedRevenueByMonth, this.cachedExpensesByMonth);
        this.bookingMonthBars = this.buildBookingBarsFromAgg(this.cachedBookingsByMonth);
      }
    });
    this.loadAll();
    this.loadProfitability();
  }

  loadProfitability() {
    this.profitLoading = true;
    this.crud.getAll('profitability/vehicles', { year: this.currentYear })
      .pipe(catchError(() => of(null)))
      .subscribe({
        next: (res: any) => {
          const rows: any[] = res?.rows ?? [];
          this.topCars    = rows.slice(0, 5);
          this.bottomCars = [...rows].reverse().slice(0, 5);
          this.profitLoading = false;
        },
        error: () => { this.profitLoading = false; },
      });
  }

  fmt(n: number): string {
    if (Math.abs(n) >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
    if (Math.abs(n) >= 1_000)     return (n / 1_000).toFixed(0) + 'k';
    return n.toFixed(0);
  }

  loadAll() {
    this.loading = true;
    this.crud.getAll('dashboard/aggregate').pipe(catchError(() => of(null))).subscribe({
      next: (agg: any) => {
        if (!agg) { this.loading = false; return; }

        // KPIs from backend
        const kpi = agg.kpi ?? {};
        this.totalCars       = kpi.totalCars       ?? 0;
        this.totalClients    = kpi.totalClients     ?? 0;
        this.availableCars   = kpi.availableCars    ?? 0;
        this.bookedCars      = kpi.bookedCars       ?? 0;
        this.maintenanceCars = kpi.maintenanceCars  ?? 0;
        this.occupancyRate   = kpi.occupancyRate    ?? 0;
        this.activeBookings  = kpi.activeBookings   ?? 0;
        this.totalRevenue    = kpi.totalRevenue     ?? 0;
        this.totalExpenses   = kpi.totalExpenses    ?? 0;

        // Payment distribution
        const pd = agg.paymentDistribution ?? {};
        this.paidCount    = pd.paidCount    ?? 0;
        this.partialCount = pd.partialCount ?? 0;
        this.unpaidCount  = pd.unpaidCount  ?? 0;

        // Recent
        this.recentReservations = agg.recentReservations ?? [];
        this.recentContracts    = agg.recentContracts    ?? [];

        // Cache for language-change rebuilds
        this.cachedRevenueByMonth  = agg.revenueByMonth  ?? [];
        this.cachedExpensesByMonth = agg.expensesByMonth ?? [];
        this.cachedBookingsByMonth = agg.bookingsByMonth ?? [];

        // Month bars from pre-computed data
        this.monthBars        = this.buildMonthBarsFromAgg(this.cachedRevenueByMonth, this.cachedExpensesByMonth);
        this.bookingMonthBars = this.buildBookingBarsFromAgg(this.cachedBookingsByMonth);

        // Credits
        const cr = agg.credits ?? {};
        this.creditsActive   = cr.active      ?? 0;
        this.creditsOverdue  = cr.overdue     ?? 0;
        this.creditsDue      = cr.monthlyDue  ?? 0;
        this.creditDebtTotal = cr.debtTotal   ?? 0;

        // Compliance
        const comp = agg.compliance ?? {};
        this.compliantCount   = comp.compliant    ?? 0;
        this.warningCount     = comp.warning      ?? 0;
        this.criticalCount    = comp.critical     ?? 0;
        this.blockedCount     = comp.blocked      ?? 0;
        this.expiringSoon30   = comp.expiringSoon30 ?? [];
        this.critical7Days    = comp.critical7Days  ?? [];

        // Cars in repair + oil
        this.carsInRepair = (agg.carsInRepair ?? []).map((r: any) => ({
          car: { id: r.carId, marque: r.marque, modele: r.modele },
          repair: { description: r.description, dateFin: r.dateFin }
        }));
        this.oilDueSoon = agg.oilReminders?.dueSoon ?? [];
        this.oilOverdue = agg.oilReminders?.overdue ?? [];

        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  private toArray(r: any): any[] {
    return Array.isArray(r) ? r : (r?.data ?? r?.['hydra:member'] ?? []);
  }

  private buildMonthBarsFromAgg(revenueRows: any[], expenseRows: any[]): MonthBar[] {
    const lang   = this.ts.getCurrentLanguage();
    const labels = this.monthNames[lang] || this.monthNames['en'];
    const today  = new Date();
    const bars: MonthBar[] = [];

    for (let i = 11; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const y = d.getFullYear(); const m = d.getMonth() + 1; // SQL months are 1-based

      const rev = revenueRows.find((r: any) => +r.yr === y && +r.mo === m);
      const exp = expenseRows.find((e: any) => +e.yr === y && +e.mo === m);

      bars.push({
        label:    labels[m - 1],
        revenue:  parseFloat(rev?.revenue ?? 0),
        expenses: parseFloat(exp?.expenses ?? 0),
        revenueH: 0, expensesH: 0,
      });
    }

    const maxVal = Math.max(...bars.map(b => Math.max(b.revenue, b.expenses)), 1);
    bars.forEach(b => {
      b.revenueH  = Math.round((b.revenue  / maxVal) * 100);
      b.expensesH = Math.round((b.expenses / maxVal) * 100);
    });
    return bars;
  }

  private buildBookingBarsFromAgg(bookingRows: any[]) {
    const lang   = this.ts.getCurrentLanguage();
    const labels = this.monthNames[lang] || this.monthNames['en'];
    const today  = new Date();
    const bars: { label: string; count: number; h: number }[] = [];

    for (let i = 11; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const y = d.getFullYear(); const m = d.getMonth() + 1;

      const row   = bookingRows.find((r: any) => +r.yr === y && +r.mo === m);
      const count = +(row?.count ?? 0);
      bars.push({ label: labels[m - 1], count, h: 0 });
    }

    const maxCount = Math.max(...bars.map(b => b.count), 1);
    bars.forEach(b => b.h = Math.round((b.count / maxCount) * 100));
    return bars;
  }

  private buildMonthBars(_r: any[], _e: any[]): MonthBar[] { return []; }
  private buildBookingBars(_r: any[]): { label: string; count: number; h: number }[] { return []; }

  get paymentTotal() { return Math.max(this.paidCount + this.unpaidCount + this.partialCount, 1); }
  get paidPct()    { return Math.round((this.paidCount    / this.paymentTotal) * 100); }
  get unpaidPct()  { return Math.round((this.unpaidCount  / this.paymentTotal) * 100); }
  get partialPct() { return Math.round((this.partialCount / this.paymentTotal) * 100); }

  clientName(r: any): string {
    const id = r.clientId || r.client?.id;
    const c = this.allClients.find((x: any) => x.id === id);
    return c ? `${c.nom} ${c.prenom || ''}`.trim() : (r.client?.nom || `#${id || '?'}`);
  }

  voitureLabel(r: any): string {
    const id = r.voitureId || r.voiture?.id;
    const v = this.allVoitures.find((x: any) => x.id === id);
    return v ? `${v.marque} ${v.modele}` : (r.voiture?.marque || `#${id || '?'}`);
  }

  reservationStatus(r: any): string {
    const today = new Date();
    const start = new Date(r.dateDebut);
    const end = new Date(r.dateFin);
    if (end < today) return 'done';
    if (start <= today && end >= today) return 'active';
    return 'upcoming';
  }

  private buildDocAlerts(cars: any[]): void {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const thisYear = today.getFullYear();
    const thisMonth = today.getMonth();

    const expired: DocAlert[] = [];
    const dueThisMonth: DocAlert[] = [];

    // Compliance KPI reset
    this.compliantCount = 0; this.warningCount = 0; this.criticalCount = 0; this.blockedCount = 0;
    this.expiringSoon30 = []; this.critical7Days = [];
    const docLabels: Record<string, string> = { vignette: 'Vignette', assurance: 'Assurance', visite: 'Visite tech.' };

    for (const car of cars) {
      const label = `${car.marque || ''} ${car.modele || ''}`.trim();

      // Compliance KPIs from car.compliance
      if (car.compliance) {
        const overall = car.compliance.overall;
        if (overall === 'VALID')         this.compliantCount++;
        else if (overall === 'WARNING')  this.warningCount++;
        else if (overall === 'CRITICAL') this.criticalCount++;
        else if (overall !== 'NOT_REQUIRED') this.blockedCount++;

        for (const key of ['vignette', 'assurance', 'visite'] as const) {
          const info = car.compliance[key];
          if (!info || info.daysRemaining === null) continue;
          if (info.status === 'NOT_REQUIRED') continue;
          if (info.daysRemaining >= 0 && info.daysRemaining <= 30) {
            this.expiringSoon30.push({ car, doc: docLabels[key], days: info.daysRemaining });
          }
          if (info.daysRemaining >= 0 && info.daysRemaining <= 7) {
            this.critical7Days.push({ car, doc: docLabels[key], days: info.daysRemaining });
          }
        }
      }

    }

    this.expiredAlerts = expired.sort((a, b) => a.daysOverOrLeft - b.daysOverOrLeft);
    this.dueThisMonthAlerts = dueThisMonth.sort((a, b) => a.daysOverOrLeft - b.daysOverOrLeft);
    this.expiringSoon30.sort((a, b) => a.days - b.days);
    this.critical7Days.sort((a, b) => a.days - b.days);
  }

  private buildCarsInRepair(cars: any[], reparations: any[]): void {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const active = reparations.filter(r => {
      if (!r.dateFin) return true;
      const fin = new Date(r.dateFin);
      fin.setHours(23, 59, 59, 999);
      return fin >= today;
    });
    this.carsInRepair = active.map(r => {
      const carId = r.voitureId ?? r.voiture?.id;
      const car = cars.find(c => c.id === carId) ?? r.voiture ?? null;
      return { car, repair: r };
    }).filter(x => x.car);
  }

  docTypeLabel(type: string): string {
    const map: Record<string, string> = { assurance: 'insuranceDoc', vignette: 'vignetteDoc', visite: 'technicalDoc' };
    return this.t(map[type] || type);
  }

  t(key: string) { return this.ts.translate(key); }
}
