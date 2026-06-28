import { Component, Input, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { CrudService } from '../../../../services/crud.service';
import { TranslationService } from '../../../../services/translation.service';
import { daysUntil as daysUntilUtil } from '../../../../shared/utils/date.utils';
import { complianceScore as complianceScoreUtil } from '../../../../shared/utils/compliance.utils';

@Component({
  selector: 'app-overview-tab',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './overview-tab.component.html',
  styleUrls: ['../../voiture-detail.component.css'],
})
export class OverviewTabComponent implements OnInit, OnChanges {
  @Input() car!: any;
  @Input() carId!: number;
  @Input() reservations: any[] = [];
  @Input() effectiveStatusVal = 'disponible';
  @Input() docAlerts: any[] = [];
  @Input() dir = 'ltr';
  @Input() creditRefresh = 0;

  kpiLoading = false;
  profitCurrent: any = null;
  profitLastYear: any = null;
  finSummary: any = null;
  readonly currentYear = new Date().getFullYear();
  readonly Math = Math;

  constructor(private ts: TranslationService, private crud: CrudService) {}

  ngOnInit(): void {
    this.loadKpis();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['carId'] && !changes['carId'].firstChange) this.loadKpis();
    if (changes['creditRefresh'] && !changes['creditRefresh'].firstChange) this.loadKpis();
  }

  private loadKpis(): void {
    if (!this.carId) return;
    this.kpiLoading = true;
    forkJoin({
      current: this.crud.getAll('profitability/vehicles', { year: this.currentYear, carId: this.carId }).pipe(catchError(() => of(null))),
      last:    this.crud.getAll('profitability/vehicles', { year: this.currentYear - 1, carId: this.carId }).pipe(catchError(() => of(null))),
      summary: this.crud.getAll('voiture/' + this.carId + '/financial-summary').pipe(catchError(() => of(null))),
    }).subscribe(({ current, last, summary }: any) => {
      this.profitCurrent = current?.rows?.[0] ?? null;
      this.profitLastYear = last?.rows?.[0] ?? null;
      this.finSummary = summary;
      this.kpiLoading = false;
    });
  }

  get kpiRevenue(): number { return this.profitCurrent?.revenue ?? 0; }
  get kpiRevenueLastYear(): number { return this.profitLastYear?.revenue ?? 0; }
  get kpiExpenses(): number { return this.profitCurrent?.totalCost ?? 0; }
  get kpiExpensesLastYear(): number { return this.profitLastYear?.totalCost ?? 0; }
  get kpiProfit(): number { return this.profitCurrent?.net ?? 0; }
  get kpiProfitLastYear(): number { return this.profitLastYear?.net ?? 0; }

  /** % change vs last year; null when last year has no comparable data (avoids divide-by-zero / misleading infinite %). */
  yoyChange(current: number, last: number): number | null {
    if (!last) return null;
    return Math.round(((current - last) / Math.abs(last)) * 100);
  }

  get kpiOccupancy(): number { return this.finSummary?.occupancyRate ?? 0; }

  get kpiCompliance(): number { return complianceScoreUtil(this.car?.compliance, this.docAlerts); }

  get vehicleRevenue(): number {
    return this.reservations.reduce((sum, r) => sum + +(r.total || r.montant || 0), 0);
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

  daysUntil(dateStr?: string | null): number | null { return daysUntilUtil(dateStr); }

  t(key: string): string { return this.ts.translate(key); }
}
