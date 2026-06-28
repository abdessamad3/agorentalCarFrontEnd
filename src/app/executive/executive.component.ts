import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { forkJoin } from 'rxjs';
import { map } from 'rxjs/operators';
import { safe, toArr } from '../shared/utils/rx.utils';
import { CrudService } from '../services/crud.service';
import { TranslationService } from '../services/translation.service';
import { daysUntil } from '../shared/utils/date.utils';

interface KPI { label: string; value: string; sub?: string; trend?: number; color: string; icon: string; link?: string; }
interface AlertRow { icon: string; text: string; urgency: 'critical' | 'warning' | 'info'; link: string; }

@Component({
  selector: 'app-executive',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './executive.component.html',
  styleUrls: ['../shared/styles/reports.css'],
})
export class ExecutiveComponent implements OnInit {
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

  // Monthly chart (last 6 months)
  monthBars: { label: string; revenue: number; expenses: number; rH: number; eH: number }[] = [];

  // Compliance
  complianceAlerts = { overdue: 0, critical: 0, warning: 0 };

  private readonly revenueStatuses = [
    'confirmed','confirmee','active','en_cours','encours','completed','terminee','done','termine',
  ];

  constructor(private crud: CrudService, private ts: TranslationService) {}

  ngOnInit() {
    this.ts.direction$.subscribe(d => this.dir = d);
    this.load();
  }

  load() {
    this.loading = true;
    const now     = new Date();
    const thisYM  = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const prev    = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastYM  = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`;

    forkJoin({
      cars:         safe(this.crud.getAll('voiture',         { limit: 500 })),
      reservations: safe(this.crud.getAll('reservation',     { limit: 3000 })),
      depenses:     safe(this.crud.getAll('depense',         { limit: 2000 })),
      reparations:  safe(this.crud.getAll('reparation')),
      clients:      safe(this.crud.getAll('client',          { limit: 100 })),
      assur:        safe(this.crud.getAll('assurance',       { limit: 500 })),
      vignettes:    safe(this.crud.getAll('vignette',        { limit: 500 })),
      suivis:       safe(this.crud.getAll('suivi-technique', { limit: 500 })),
      vidanges:     safe(this.crud.getAll('vidange',         { limit: 500 })),
    }).pipe(
      map(({ cars, reservations, depenses, reparations, clients, assur, vignettes, suivis, vidanges }: any) => {
        const carList  = toArr(cars);
        const resList  = toArr(reservations);
        const expList  = toArr(depenses);
        const repList  = toArr(reparations);
        const clientList = toArr(clients);
        const asList   = toArr(assur);
        const vigList  = toArr(vignettes);
        const suvList  = toArr(suivis);
        const vidList  = toArr(vidanges);

        // ── Fleet ────────────────────────────────────────────────
        this.totalVehicles      = carList.length;
        this.availableVehicles  = carList.filter((c: any) => ['disponible','available'].includes((c.voitureStatus ?? '').toLowerCase())).length;
        this.rentedVehicles     = carList.filter((c: any) => ['louee','rented'].includes((c.voitureStatus ?? '').toLowerCase())).length;
        this.maintenanceVehicles = carList.filter((c: any) => (c.voitureStatus ?? '').toLowerCase() === 'maintenance').length;
        this.fleetUtilization   = this.totalVehicles > 0
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

        // ── Revenue ──────────────────────────────────────────────
        const revenueRes = resList.filter((r: any) =>
          this.revenueStatuses.includes((r.reservationStatus ?? r.statut ?? '').toLowerCase())
        );

        const getYM = (r: any) => {
          const d = new Date(r.dateDebut ?? r.creeAu ?? 0);
          return isNaN(d.getTime()) ? '' : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        };

        this.revenueThisMonth = revenueRes
          .filter((r: any) => getYM(r) === thisYM)
          .reduce((s: number, r: any) => s + parseFloat(r.total ?? 0), 0);

        this.revenueLastMonth = revenueRes
          .filter((r: any) => getYM(r) === lastYM)
          .reduce((s: number, r: any) => s + parseFloat(r.total ?? 0), 0);

        const getExpYM = (e: any) => {
          const d = new Date(e.date ?? e.creeAu ?? 0);
          return isNaN(d.getTime()) ? '' : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        };

        this.expensesThisMonth = [...expList, ...repList]
          .filter((e: any) => getExpYM(e) === thisYM)
          .reduce((s: number, e: any) => s + parseFloat(e.montant ?? 0), 0);

        this.profitThisMonth = this.revenueThisMonth - this.expensesThisMonth;

        // Outstanding / collected
        this.outstanding = resList
          .filter((r: any) => (r.total ?? 0) > 0)
          .reduce((s: number, r: any) => s + Math.max(0, parseFloat(r.total ?? 0) - parseFloat(r.montantPaye ?? 0)), 0);
        this.collected = resList
          .reduce((s: number, r: any) => s + parseFloat(r.montantPaye ?? 0), 0);

        // ── Top vehicles ─────────────────────────────────────────
        const vehicleRevMap: Map<number, { label: string; revenue: number; rentals: number }> = new Map();
        for (const r of revenueRes) {
          const vid = r.voitureId ?? r.voiture?.id;
          if (!vid) continue;
          const car = carList.find((c: any) => c.id === vid);
          const label = car ? `${car.marque ?? ''} ${car.modele ?? ''}`.trim() : `#${vid}`;
          const existing = vehicleRevMap.get(vid) ?? { label, revenue: 0, rentals: 0 };
          vehicleRevMap.set(vid, {
            label,
            revenue: existing.revenue + parseFloat(r.total ?? 0),
            rentals: existing.rentals + 1,
          });
        }
        this.topVehicles = Array.from(vehicleRevMap.values())
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 5);

        // ── Monthly chart (last 6 months) ─────────────────────
        const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        const monthBars = [];
        for (let i = 5; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          const rev = revenueRes.filter((r: any) => getYM(r) === ym)
            .reduce((s: number, r: any) => s + parseFloat(r.total ?? 0), 0);
          const exp = [...expList, ...repList].filter((e: any) => getExpYM(e) === ym)
            .reduce((s: number, e: any) => s + parseFloat(e.montant ?? 0), 0);
          monthBars.push({ label: `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`, revenue: rev, expenses: exp, rH: 0, eH: 0 });
        }
        const maxBar = Math.max(...monthBars.map(b => Math.max(b.revenue, b.expenses)), 1);
        for (const b of monthBars) {
          b.rH = Math.round((b.revenue / maxBar) * 120);
          b.eH = Math.round((b.expenses / maxBar) * 120);
        }
        this.monthBars = monthBars;

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

        // ── Build KPIs ───────────────────────────────────────────
        const revTrend = this.revenueLastMonth > 0
          ? Math.round(((this.revenueThisMonth - this.revenueLastMonth) / this.revenueLastMonth) * 100)
          : 0;

        this.kpis = [
          {
            label: 'Revenue This Month', icon: '💰',
            value: this.fmt(this.revenueThisMonth),
            sub: `${revTrend >= 0 ? '+' : ''}${revTrend}% vs last month`,
            trend: revTrend, color: '#276749', link: '/rapports/financial',
          },
          {
            label: 'Fleet Utilization', icon: '🚗',
            value: `${this.fleetUtilization}%`,
            sub: `${this.rentedVehicles} of ${this.totalVehicles} vehicles rented`,
            trend: undefined, color: '#2b6cb0', link: '/rapports/fleet',
          },
          {
            label: 'Active Reservations', icon: '📅',
            value: String(this.activeReservations),
            sub: `${this.pendingReservations} pending confirmation`,
            color: '#553c9a', link: '/reservation',
          },
          {
            label: 'Outstanding Debt', icon: '📊',
            value: this.fmt(this.outstanding),
            sub: `Collected: ${this.fmt(this.collected)}`,
            color: this.outstanding > 10000 ? '#c53030' : '#dd6b20', link: '/paiement-client',
          },
          {
            label: 'Profit This Month', icon: '📈',
            value: this.fmt(this.profitThisMonth),
            sub: `Revenue ${this.fmt(this.revenueThisMonth)} · Expenses ${this.fmt(this.expensesThisMonth)}`,
            trend: this.profitThisMonth >= 0 ? 1 : -1,
            color: this.profitThisMonth >= 0 ? '#276749' : '#c53030', link: '/rapports/financial',
          },
          {
            label: 'Compliance Alerts', icon: '⚠️',
            value: String(this.complianceAlerts.overdue + this.complianceAlerts.critical),
            sub: `${this.complianceAlerts.overdue} overdue · ${this.complianceAlerts.warning} warnings`,
            color: this.complianceAlerts.overdue > 0 ? '#c53030' : '#dd6b20', link: '/compliance-center',
          },
        ];

        // ── Build alerts ─────────────────────────────────────────
        this.alerts = [];
        if (this.complianceAlerts.overdue > 0) {
          this.alerts.push({ icon: '🔴', text: `${this.complianceAlerts.overdue} compliance documents are overdue`, urgency: 'critical', link: '/compliance-center' });
        }
        if (this.pendingReservations > 0) {
          this.alerts.push({ icon: '🟡', text: `${this.pendingReservations} reservations awaiting confirmation`, urgency: 'warning', link: '/reservation' });
        }
        if (this.maintenanceVehicles > 0) {
          this.alerts.push({ icon: '🟠', text: `${this.maintenanceVehicles} vehicle(s) in maintenance`, urgency: 'warning', link: '/maintenance/planning' });
        }
        if (this.outstanding > 0) {
          this.alerts.push({ icon: '🔵', text: `${this.fmt(this.outstanding)} in outstanding payments`, urgency: 'info', link: '/paiement-client' });
        }
      })
    ).subscribe({
      next: () => { this.loading = false; },
      error: () => { this.loading = false; },
    });
  }

  get revTrendPct(): number {
    if (this.revenueLastMonth === 0) return 0;
    return Math.round(((this.revenueThisMonth - this.revenueLastMonth) / this.revenueLastMonth) * 100);
  }

  barPct(value: number, total: number): number {
    return total > 0 ? Math.round((value / total) * 100) : 0;
  }

  fmt(n: number): string {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M MAD';
    if (n >= 1_000)     return (n / 1_000).toFixed(0) + 'K MAD';
    return n.toLocaleString('fr-MA', { maximumFractionDigits: 0 }) + ' MAD';
  }

  fmtFull(n: number): string {
    return n.toLocaleString('fr-MA', { maximumFractionDigits: 0 }) + ' MAD';
  }
}
