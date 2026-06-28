import { Component, Input, OnInit, OnDestroy, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import Chart from 'chart.js/auto';
import { forkJoin, of } from 'rxjs';
import { catchError, timeout } from 'rxjs/operators';
import { CrudService } from '../../../../services/crud.service';
import { TranslationService } from '../../../../services/translation.service';
import { environment } from '../../../../../environments/environment';
import { PayDepPanelComponent } from '../../../../shared/pay-dep-panel/pay-dep-panel.component';

@Component({
  selector: 'app-financial-tab',
  standalone: true,
  imports: [CommonModule, FormsModule, PayDepPanelComponent],
  templateUrl: './financial-tab.component.html',
  styleUrls: ['../../voiture-detail.component.css'],
})
export class FinancialTabComponent implements OnInit, OnChanges, OnDestroy {
  @Input() carId!: number;
  @Input() car!: any;
  @Input() reservations: any[] = [];
  @Input() dir = 'ltr';
  @Input() creditRefresh = 0;

  finSummary: any = null;
  finTransactions: any[] = [];
  finLoading = false;
  finTxType = '';
  finTxFrom = '';
  finTxTo = '';
  finTxStatus = '';

  payPanelOpen = false;
  payRecord: any = null;

  profitRow: any = null;
  profitLoading = false;
  profitYear: number | 'all' = new Date().getFullYear();
  profitYearOptions: number[] = [];

  private finBarChart: any = null;
  private finDonutChart: any = null;

  readonly finDonutColors = ['#2F80ED','#27AE60','#F2994A','#9B51E0','#EB5757','#56CCF2','#F2C94C','#6FCF97'];

  readonly FIN_TX_TYPES = [
    { value: 'reservation',    labelKey: 'reservations', icon: '📅', color: '#2563eb', bg: '#eff6ff' },
    { value: 'reparation',     labelKey: 'reparations',  icon: '🔧', color: '#ea580c', bg: '#fff7ed' },
    { value: 'assurance',      labelKey: 'insuranceDoc', icon: '🛡️', color: '#16a34a', bg: '#f0fdf4' },
    { value: 'vidange',        labelKey: 'vidanges',     icon: '🛢️', color: '#16a34a', bg: '#f0fdf4' },
    { value: 'vignette',       labelKey: 'vignettes',    icon: '📄', color: '#d97706', bg: '#fffbeb' },
    { value: 'suivitechnique', labelKey: 'technicalDoc', icon: '🔬', color: '#475569', bg: '#f8fafc' },
    { value: 'adblue',         labelKey: 'adblue',       icon: '💧', color: '#9333ea', bg: '#faf5ff' },
  ];

  constructor(
    private crud: CrudService,
    private ts: TranslationService,
  ) {}

  ngOnInit(): void {
    this.load();
    this.loadProfitability();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['creditRefresh'] && !changes['creditRefresh'].firstChange) {
      this.loadProfitability();
    }
  }

  ngOnDestroy(): void {
    this.finBarChart?.destroy();
    this.finDonutChart?.destroy();
  }

  load(): void {
    this.finLoading = true;
    forkJoin({
      summary:      this.crud.getAll('voiture/' + this.carId + '/financial-summary').pipe(timeout(10000), catchError(() => of(null))),
      transactions: this.crud.getAll('voiture/' + this.carId + '/transactions').pipe(timeout(10000), catchError(() => of([]))),
    }).subscribe(({ summary, transactions }: any) => {
      this.finSummary      = summary;
      this.finTransactions = Array.isArray(transactions) ? transactions : [];
      this.finLoading      = false;
      setTimeout(() => this.initCharts(), 100);
    });
  }

  loadProfitability(): void {
    this.profitLoading = true;
    this.crud.getAll('profitability/vehicles', { year: this.profitYear, carId: this.carId })
      .pipe(catchError(() => of(null)))
      .subscribe({
        next: (res: any) => {
          this.profitRow         = res?.rows?.[0] ?? null;
          this.profitYearOptions = Array.isArray(res?.availableYears) ? res.availableYears : [];
          this.profitLoading     = false;
        },
        error: () => { this.profitLoading = false; },
      });
  }

  onProfitYearChange(): void {
    this.loadProfitability();
  }

  get roi(): number {
    if (!this.profitRow) return 0;
    const purchasePrice = parseFloat(this.car?.prixAchat) || 0;
    const base = purchasePrice > 0 ? purchasePrice : this.profitRow.totalCost;
    return base > 0 ? Math.round((this.profitRow.net / base) * 100 * 10) / 10 : 0;
  }

  applyFilters(): void {
    const params: Record<string, string> = {};
    if (this.finTxType)   params['type']   = this.finTxType;
    if (this.finTxFrom)   params['from']   = this.finTxFrom;
    if (this.finTxTo)     params['to']     = this.finTxTo;
    if (this.finTxStatus) params['status'] = this.finTxStatus;
    this.finLoading = true;
    this.crud.getAll('voiture/' + this.carId + '/transactions', params)
      .pipe(catchError(() => of([])))
      .subscribe((data: any) => {
        this.finTransactions = Array.isArray(data) ? data : [];
        this.finLoading = false;
      });
  }

  get hasActiveFilters(): boolean {
    return !!(this.finTxType || this.finTxFrom || this.finTxTo || this.finTxStatus);
  }

  clearFilters(): void {
    this.finTxType   = '';
    this.finTxFrom   = '';
    this.finTxTo     = '';
    this.finTxStatus = '';
    this.applyFilters();
  }

  openPayPanel(tx: any): void {
    this.payRecord    = tx;
    this.payPanelOpen = true;
  }

  closePayPanel(): void {
    this.payPanelOpen = false;
    this.payRecord    = null;
  }

  onPaymentChanged(): void {
    this.applyFilters();
    this.loadProfitability();
  }

  private initCharts(): void {
    const barEl   = document.getElementById('finBarCanvas')   as HTMLCanvasElement | null;
    const donutEl = document.getElementById('finDonutCanvas') as HTMLCanvasElement | null;
    if (!barEl || !donutEl || !this.finSummary) return;

    if (this.finBarChart)   { this.finBarChart.destroy();   this.finBarChart   = null; }
    if (this.finDonutChart) { this.finDonutChart.destroy(); this.finDonutChart = null; }
    Chart.getChart(barEl)?.destroy();
    Chart.getChart(donutEl)?.destroy();

    const monthly = (this.finSummary.monthly || []) as any[];
    this.finBarChart = new Chart(barEl, {
      type: 'bar',
      data: {
        labels: monthly.map((m: any) => m.month),
        datasets: [
          { label: this.t('income'),  data: monthly.map((m: any) => m.income),   backgroundColor: 'rgba(39,174,96,0.75)',  borderRadius: 4 },
          { label: this.t('expense'), data: monthly.map((m: any) => m.expenses), backgroundColor: 'rgba(235,87,87,0.65)',  borderRadius: 4 },
        ],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { position: 'top', labels: { boxWidth: 12, font: { size: 11 } } } },
        scales: { y: { beginAtZero: true }, x: {} },
      },
    });

    const breakdown = (this.finSummary.breakdown || []) as any[];
    this.finDonutChart = new Chart(donutEl, {
      type: 'doughnut',
      data: {
        labels: breakdown.map((b: any) => b.category),
        datasets: [{
          data: breakdown.map((b: any) => b.total),
          backgroundColor: breakdown.map((_: any, i: number) => this.finDonutColors[i % this.finDonutColors.length]),
          borderWidth: 2, borderColor: '#fff',
        }],
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, cutout: '65%' },
    });
  }

  get vehicleRevenue(): number {
    return this.reservations.reduce((sum, r) => sum + +(r.total || r.montant || 0), 0);
  }

  get monthlyRevenueEstimate(): number {
    return (this.car?.prixJour || 0) * 20;
  }

  get occupancyEstimate(): number {
    const s = (this.car?.voitureStatus || '').toLowerCase();
    if (['louee', 'rented'].includes(s)) return 85;
    if (['disponible', 'available'].includes(s)) return 65;
    return 0;
  }

  fileUrl(path: string): string { return environment.serverUrl + path; }

  downloadFileName(path: string): string {
    const last = path.split('/').pop();
    return last || 'facture';
  }

  txStatusClass(tx: any): string {
    const s = (tx.status || '').toLowerCase();
    if (['payee', 'paid', 'confirmed', 'confirmee', 'terminee', 'completed'].includes(s)) return 'txs-paid';
    if (['pending', 'en_attente', 'impaye', 'partiel'].includes(s))                         return 'txs-pending';
    if (['annulee', 'cancelled', 'annule'].includes(s))                                    return 'txs-cancelled';
    return 'txs-default';
  }

  t(key: string): string { return this.ts.translate(key); }
}
