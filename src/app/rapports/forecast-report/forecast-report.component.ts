import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { map } from 'rxjs/operators';
import { safe, toArr } from '../../shared/utils/rx.utils';
import { CrudService } from '../../services/crud.service';
import { TranslationService } from '../../services/translation.service';

export interface MonthPoint {
  label: string;
  year: number;
  month: number;
  revenue: number;
  expenses: number;
  profit: number;
  isForecast: boolean;
}

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function isoYM(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function linearTrend(values: number[]): { slope: number; intercept: number } {
  const n = values.length;
  if (n === 0) return { slope: 0, intercept: 0 };
  const xs = Array.from({ length: n }, (_, i) => i);
  const sumX  = xs.reduce((a, b) => a + b, 0);
  const sumY  = values.reduce((a, b) => a + b, 0);
  const sumXY = xs.reduce((s, x, i) => s + x * values[i], 0);
  const sumX2 = xs.reduce((s, x) => s + x * x, 0);
  const denom = n * sumX2 - sumX * sumX;
  if (denom === 0) return { slope: 0, intercept: sumY / n };
  const slope     = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;
  return { slope, intercept };
}

@Component({
  selector: 'app-forecast-report',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './forecast-report.component.html',
  styleUrls: ['../../shared/styles/reports.css'],
})
export class ForecastReportComponent implements OnInit {
  loading = true;
  dir = 'ltr';
  historyMonths = 12;
  forecastMonths = 6;
  points: MonthPoint[] = [];

  private revenueStatuses = [
    'confirmed','confirmee','active','en_cours','encours','completed','terminee','done','termine',
  ];

  constructor(private crud: CrudService, private ts: TranslationService) {}

  ngOnInit() {
    this.ts.direction$.subscribe(d => this.dir = d);
    this.load();
  }

  load() {
    this.loading = true;
    forkJoin({
      reservations: safe(this.crud.getAll('reservation', { limit: 3000 })),
      depenses:     safe(this.crud.getAll('depense',     { limit: 3000 })),
      reparations:  safe(this.crud.getAll('reparation',  { limit: 2000 })),
    }).pipe(
      map(({ reservations, depenses, reparations }: any) => {
        const resList  = toArr(reservations);
        const expList  = toArr(depenses);
        const repList  = toArr(reparations);

        // Build monthly aggregates from history
        const revMap: Map<string, number> = new Map();
        const expMap: Map<string, number> = new Map();

        for (const r of resList) {
          if (!this.revenueStatuses.includes((r.reservationStatus ?? r.statut ?? '').toLowerCase())) continue;
          const d = new Date(r.dateDebut ?? r.creeAu ?? 0);
          if (isNaN(d.getTime())) continue;
          const key = isoYM(d);
          revMap.set(key, (revMap.get(key) ?? 0) + parseFloat(r.total ?? 0));
        }
        for (const e of [...expList, ...repList]) {
          const d = new Date(e.date ?? e.creeAu ?? 0);
          if (isNaN(d.getTime())) continue;
          const key = isoYM(d);
          expMap.set(key, (expMap.get(key) ?? 0) + parseFloat(e.montant ?? 0));
        }

        // Build last N months
        const now     = new Date();
        const history: MonthPoint[] = [];
        for (let i = this.historyMonths - 1; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const key = isoYM(d);
          const revenue  = revMap.get(key) ?? 0;
          const expenses = expMap.get(key) ?? 0;
          history.push({
            label: `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`,
            year: d.getFullYear(), month: d.getMonth(),
            revenue, expenses, profit: revenue - expenses, isForecast: false,
          });
        }

        // Compute linear trends
        const revValues = history.map(h => h.revenue);
        const expValues = history.map(h => h.expenses);
        const revTrend  = linearTrend(revValues);
        const expTrend  = linearTrend(expValues);

        // Seasonal factor: ratio of same month previous year vs yearly average
        const seasonalRev: number[] = Array(12).fill(1);
        const seasonalExp: number[] = Array(12).fill(1);
        const prevYearRevByMonth: number[] = Array(12).fill(0);
        const prevYearExpByMonth: number[] = Array(12).fill(0);
        const prevYear = now.getFullYear() - 1;
        for (let m = 0; m < 12; m++) {
          const key = `${prevYear}-${String(m + 1).padStart(2, '0')}`;
          prevYearRevByMonth[m] = revMap.get(key) ?? 0;
          prevYearExpByMonth[m] = expMap.get(key) ?? 0;
        }
        const avgPrevRev = prevYearRevByMonth.reduce((a, b) => a + b, 0) / 12;
        const avgPrevExp = prevYearExpByMonth.reduce((a, b) => a + b, 0) / 12;
        for (let m = 0; m < 12; m++) {
          seasonalRev[m] = avgPrevRev > 0 ? prevYearRevByMonth[m] / avgPrevRev : 1;
          seasonalExp[m] = avgPrevExp > 0 ? prevYearExpByMonth[m] / avgPrevExp : 1;
        }

        // Forecast
        const n = history.length;
        const forecast: MonthPoint[] = [];
        for (let i = 0; i < this.forecastMonths; i++) {
          const idx = n + i;
          const d   = new Date(now.getFullYear(), now.getMonth() + 1 + i, 1);
          const seasonal_r = seasonalRev[d.getMonth()];
          const seasonal_e = seasonalExp[d.getMonth()];
          const baseRev = Math.max(0, revTrend.intercept + revTrend.slope * idx);
          const baseExp = Math.max(0, expTrend.intercept + expTrend.slope * idx);
          const revenue  = Math.round(baseRev * seasonal_r);
          const expenses = Math.round(baseExp * seasonal_e);
          forecast.push({
            label: `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`,
            year: d.getFullYear(), month: d.getMonth(),
            revenue, expenses, profit: revenue - expenses, isForecast: true,
          });
        }

        return [...history, ...forecast];
      })
    ).subscribe({
      next: pts => { this.points = pts; this.loading = false; },
      error: ()  => { this.loading = false; },
    });
  }

  get maxRevenue(): number { return Math.max(...this.points.map(p => p.revenue), 1); }
  get maxExpenses(): number { return Math.max(...this.points.map(p => p.expenses), 1); }
  get maxBar(): number { return Math.max(this.maxRevenue, this.maxExpenses, 1); }

  get historicalPoints(): MonthPoint[] { return this.points.filter(p => !p.isForecast); }
  get forecastPoints():   MonthPoint[] { return this.points.filter(p =>  p.isForecast); }

  get totalForecastRevenue(): number  { return this.forecastPoints.reduce((s, p) => s + p.revenue, 0); }
  get totalForecastExpenses(): number { return this.forecastPoints.reduce((s, p) => s + p.expenses, 0); }
  get totalForecastProfit(): number   { return this.totalForecastRevenue - this.totalForecastExpenses; }

  get lastHistoricalRevenue(): number {
    const h = this.historicalPoints;
    return h.length ? h[h.length - 1].revenue : 0;
  }

  get forecastGrowthPct(): number {
    const last = this.lastHistoricalRevenue;
    const firstForecast = this.forecastPoints[0]?.revenue ?? 0;
    if (last === 0) return 0;
    return Math.round(((firstForecast - last) / last) * 100);
  }

  barH(value: number): number {
    return this.maxBar > 0 ? Math.round((value / this.maxBar) * 160) : 0;
  }

  fmt(n: number): string {
    return n.toLocaleString('fr-MA', { maximumFractionDigits: 0 }) + ' MAD';
  }
}
