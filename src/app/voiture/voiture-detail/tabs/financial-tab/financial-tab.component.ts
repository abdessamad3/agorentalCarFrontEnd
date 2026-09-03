import { Component, Input, OnInit, OnDestroy, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FinancialExcelService } from '../../../../services/financial-excel.service';
import { StatusPipe } from '../../../../shared/pipes/status.pipe';
import Chart from 'chart.js/auto';
import { forkJoin, of } from 'rxjs';
import { catchError, timeout } from 'rxjs/operators';
import { CrudService } from '../../../../services/crud.service';
import { TranslationService } from '../../../../services/translation.service';
import { AuthService } from '../../../../services/auth.service';
import { environment } from '../../../../../environments/environment';
import { PayDepPanelComponent } from '../../../../shared/pay-dep-panel/pay-dep-panel.component';

@Component({
  selector: 'app-financial-tab',
  standalone: true,
  imports: [CommonModule, FormsModule, PayDepPanelComponent, StatusPipe],
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

  get isAdmin(): boolean { return this.auth.hasRole('ROLE_ADMIN'); }

  profitMonth: 'all' | number = 'all';

  get MONTH_NAMES(): string[] {
    const locale = this.ts.getCurrentLanguage() === 'ar' ? 'ar-MA'
                 : this.ts.getCurrentLanguage() === 'fr' ? 'fr-FR' : 'en-US';
    return Array.from({ length: 12 }, (_, i) =>
      new Intl.DateTimeFormat(locale, { month: 'short' }).format(new Date(2000, i, 1))
    );
  }

  get profitMonthName(): string {
    if (this.profitMonth === 'all') return '';
    return this.MONTH_NAMES[+this.profitMonth - 1] ?? '';
  }

  get monthlyRowForDisplay(): any {
    if (this.profitMonth === 'all' || !this.finSummary?.monthly?.length) return null;
    return (this.finSummary.monthly as any[])[+this.profitMonth - 1] ?? null;
  }

  get activeNet(): number {
    if (this.profitMonth !== 'all') {
      const m = this.monthlyRowForDisplay;
      return m ? Math.round((m.income || 0) - (m.expenses || 0)) : 0;
    }
    return this.profitRow?.net ?? 0;
  }

  constructor(
    private crud: CrudService,
    private ts: TranslationService,
    private auth: AuthService,
    private excelSvc: FinancialExcelService,
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

  exportExcel(): void {
    const user = this.auth.getStoredUser();
    const generatedBy = user?.email || user?.name || 'Unknown';
    this.excelSvc.export(
      this.finTransactions,
      this.car,
      this.carId,
      { type: this.finTxType, status: this.finTxStatus, from: this.finTxFrom, to: this.finTxTo },
      generatedBy,
    );
  }

  printReport(): void {
    const lang   = this.ts.getCurrentLanguage();
    const locale = lang === 'ar' ? 'ar-MA' : lang === 'fr' ? 'fr-FR' : 'en-US';
    const dir    = lang === 'ar' ? 'rtl' : 'ltr';

    const L = {
      title:          this.t('vehicleTransactionsReport'),
      registration:   this.t('registration'),
      records:        this.t('totalRecords'),
      activeFilters:  this.t('activeFilters'),
      summary:        this.t('summary').toUpperCase(),
      totalRecords:   this.t('totalRecords'),
      totalIncome:    this.t('totalIncome'),
      totalExpenses:  this.t('totalExpenses'),
      net:            this.t('netProfit'),
      transactions:   this.t('transactions').toUpperCase(),
      date:           this.t('date'),
      type:           this.t('type'),
      description:    this.t('description'),
      amount:         this.t('montant'),
      resStatus:      this.t('reservationStatusCol'),
      payStatus:      this.t('paymentStatus'),
      downloadPdf:    this.t('downloadPdf'),
      confidential:   this.t('reportConfidential'),
      filterType:     this.t('type'),
      filterStatus:   this.t('status'),
      filterFrom:     this.t('from'),
      filterTo:       this.t('to'),
      none:           this.t('none'),
    };

    const filterParts: string[] = [];
    if (this.finTxType)   filterParts.push(`${L.filterType}: ${this.finTxType}`);
    if (this.finTxStatus) filterParts.push(`${L.filterStatus}: ${this.finTxStatus}`);
    if (this.finTxFrom)   filterParts.push(`${L.filterFrom}: ${this.finTxFrom}`);
    if (this.finTxTo)     filterParts.push(`${L.filterTo}: ${this.finTxTo}`);
    const filterStr = filterParts.length ? filterParts.join(' &nbsp;|&nbsp; ') : L.none;

    const carName = [this.car?.marque, this.car?.modele].filter(Boolean).join(' ') || `Car #${this.carId}`;
    const plate   = this.car?.immatriculation || '—';
    const genDate = new Date().toLocaleString(locale);
    const fmt     = (n: number) => n.toLocaleString(locale, { minimumFractionDigits: 0, maximumFractionDigits: 0 });

    const totalIncome  = this.finTransactions.filter(t => t.direction === 'income').reduce((s, t) => s + +(t.amount || 0), 0);
    const totalExpense = this.finTransactions.filter(t => t.direction === 'expense').reduce((s, t) => s + +(t.amount || 0), 0);
    const net          = totalIncome - totalExpense;

    const resBadge = (s: string) => {
      const v = (s || '').toLowerCase();
      if (['confirmee','confirmed','en_cours'].includes(v))          return `<span class="badge b-confirmed">${s}</span>`;
      if (['annulee','cancelled','annule'].includes(v))              return `<span class="badge b-unpaid">${s}</span>`;
      if (['terminee','termine_avant_terme','completed'].includes(v)) return `<span class="badge b-term">${s}</span>`;
      if (s && s !== '—')                                            return `<span class="badge b-pending">${s}</span>`;
      return `<span class="muted">—</span>`;
    };

    const payBadgeIncome = (s: string) => {
      const v = (s || '').toLowerCase();
      if (v === 'paid' || v === 'overpaid') return `<span class="badge b-paid">${s}</span>`;
      if (v === 'partial')                  return `<span class="badge b-pending">${s}</span>`;
      if (v === 'unpaid')                   return `<span class="badge b-unpaid">${s}</span>`;
      return `<span class="muted">—</span>`;
    };

    const payBadgeExpense = (s: string) => {
      const v = (s || '').toLowerCase();
      if (['payee','paid','completed'].includes(v))       return `<span class="badge b-paid">${s}</span>`;
      if (['impaye','unpaid'].includes(v))                return `<span class="badge b-unpaid">${s}</span>`;
      if (['pending','en_attente','partiel'].includes(v)) return `<span class="badge b-pending">${s}</span>`;
      return s ? `<span class="badge b-default">${s}</span>` : `<span class="muted">—</span>`;
    };

    const rows = this.finTransactions.map((tx, i) => {
      const isIncome = tx.direction === 'income';
      const date     = tx.date ? new Date(tx.date).toLocaleDateString(locale) : '—';
      const amt      = fmt(+(tx.amount || 0));
      const amtHtml  = isIncome
        ? `<span class="amt-inc">+${amt} MAD</span>`
        : `<span class="amt-exp">-${amt} MAD</span>`;
      const resSt    = isIncome ? resBadge(tx.reservationStatus || '') : `<span class="muted">—</span>`;
      const paySt    = isIncome ? payBadgeIncome(tx.paymentStatus || '') : payBadgeExpense(tx.status || '');
      const rowBg    = i % 2 === 1 ? 'background:#F7FAFC;' : '';
      return `<tr style="${rowBg}">
        <td>${date}</td>
        <td><span class="type-chip type-${tx.type || 'other'}">${tx.type || '—'}</span></td>
        <td>${tx.description || '—'}</td>
        <td style="text-align:right">${amtHtml}</td>
        <td>${resSt}</td>
        <td>${paySt}</td>
      </tr>`;
    }).join('');

    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`<!DOCTYPE html>
<html lang="${lang}" dir="${dir}">
<head>
  <meta charset="utf-8">
  <title>${L.title} — ${carName}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Calibri, Arial, sans-serif; font-size: 10pt; color: #1a202c; background: #e8edf3; }

    .no-print { text-align: center; padding: 24px 0 16px; }
    .btn-pdf {
      background: #1F4E78; color: #fff; border: none; padding: 11px 32px;
      font-size: 11pt; font-weight: 700; border-radius: 6px; cursor: pointer;
      display: inline-flex; align-items: center; gap: 10px; letter-spacing: .3px;
      box-shadow: 0 2px 8px rgba(31,78,120,.35);
    }
    .btn-pdf:hover { background: #2D6A9F; }
    .btn-pdf svg { flex-shrink: 0; }

    .page {
      background: #fff; max-width: 230mm; margin: 0 auto 32px;
      box-shadow: 0 4px 24px rgba(0,0,0,.13);
    }

    /* ── Header ── */
    .rpt-head {
      background: #1F4E78; color: #fff; padding: 14px 20px 14px 24px;
      display: flex; justify-content: space-between; align-items: center;
    }
    .rpt-company { font-size: 22pt; font-weight: 700; letter-spacing: 3px; }
    .rpt-subtitle { text-align: right; font-size: 9pt; opacity: .88; line-height: 1.55; }
    .rpt-subtitle strong { font-size: 10.5pt; display: block; }

    /* ── Info row ── */
    .rpt-info { background: #D9EAF7; display: grid; grid-template-columns: repeat(3, 1fr); border-bottom: 2px solid #1F4E78; }
    .ri-cell { padding: 9px 20px; border-right: 1px solid #b3cfe4; }
    .ri-cell:last-child { border-right: none; }
    .ri-label { font-size: 7.5pt; font-weight: 700; color: #2D6A9F; text-transform: uppercase; letter-spacing: .6px; margin-bottom: 2px; }
    .ri-value { font-size: 9.5pt; color: #1a202c; }

    /* ── Summary ── */
    .sum-bar { background: #2D6A9F; color: #fff; font-size: 8.5pt; font-weight: 700; letter-spacing: 1.2px; padding: 5px 20px; }
    .sum-grid { display: grid; grid-template-columns: repeat(4, 1fr); border: 1px solid #D9EAF7; border-top: none; }
    .sum-card { padding: 10px 16px; border-right: 1px solid #D9EAF7; }
    .sum-card:last-child { border-right: none; }
    .sum-label { font-size: 7.5pt; font-weight: 700; color: #718096; text-transform: uppercase; letter-spacing: .5px; }
    .sum-val { font-size: 14pt; font-weight: 700; margin-top: 2px; color: #1F4E78; }
    .sum-val.pos { color: #155724; }
    .sum-val.neg { color: #721c24; }
    .sum-count { font-size: 8pt; color: #718096; margin-top: 1px; }

    /* ── Table ── */
    .tbl-wrap { padding: 0 0 4px; }
    .tbl-bar { background: #1F4E78; color: #fff; font-size: 8.5pt; font-weight: 700; letter-spacing: 1.2px; padding: 5px 16px; margin-top: 14px; }
    table { width: 100%; border-collapse: collapse; font-size: 8.5pt; }
    thead th {
      background: #1F4E78; color: #fff; padding: 7px 10px;
      text-align: left; font-weight: 700; white-space: nowrap;
      border-right: 1px solid rgba(255,255,255,.18);
    }
    thead th:last-child { border-right: none; }
    tbody td { padding: 6px 10px; border-bottom: 1px solid #EDF2F7; vertical-align: middle; }
    tbody tr:last-child td { border-bottom: none; }

    .amt-inc { color: #276749; font-weight: 700; }
    .amt-exp { color: #c53030; font-weight: 700; }
    .muted { color: #a0aec0; }

    .type-chip {
      display: inline-block; padding: 1px 8px; border-radius: 8px;
      font-size: 7.5pt; font-weight: 700; background: #EDF2F7; color: #4A5568;
    }
    .type-chip.type-income    { background: #DCFCE7; color: #166534; }
    .type-chip.type-expense   { background: #FEE2E2; color: #991B1B; }

    .badge { display: inline-block; padding: 2px 9px; border-radius: 10px; font-size: 7.5pt; font-weight: 700; }
    .b-paid      { background: #D4EDDA; color: #155724; }
    .b-pending   { background: #FFF3CD; color: #856404; }
    .b-unpaid    { background: #F8D7DA; color: #721C24; }
    .b-confirmed { background: #D4EDDA; color: #155724; }
    .b-term      { background: #D9EAF7; color: #1F4E78; }
    .b-default   { background: #EDF2F7; color: #4A5568; }

    /* ── Footer ── */
    .rpt-foot {
      margin-top: 10px; padding: 8px 20px; border-top: 1px solid #e2e8f0;
      display: flex; justify-content: space-between; font-size: 7.5pt; color: #a0aec0;
    }

    @page { size: A4 landscape; margin: 10mm 8mm; }
    @media print {
      body { background: #fff; }
      .no-print { display: none; }
      .page { box-shadow: none; margin: 0; max-width: none; }
    }
  </style>
</head>
<body>

<div class="no-print">
  <button class="btn-pdf" onclick="window.print()">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
      <polyline points="6 9 6 2 18 2 18 9"/>
      <path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/>
      <rect x="6" y="14" width="12" height="8"/>
    </svg>
    ${L.downloadPdf}
  </button>
</div>

<div class="page">

  <!-- ── Report Header ── -->
  <div class="rpt-head">
    <div class="rpt-company">CADORI</div>
    <div class="rpt-subtitle">
      <strong>${L.title}</strong>
      ${carName} &nbsp;·&nbsp; Car #${this.carId}<br>
      ${genDate}
    </div>
  </div>

  <!-- ── Info row ── -->
  <div class="rpt-info">
    <div class="ri-cell">
      <div class="ri-label">${L.registration}</div>
      <div class="ri-value">${plate}</div>
    </div>
    <div class="ri-cell">
      <div class="ri-label">${L.records}</div>
      <div class="ri-value">${this.finTransactions.length}</div>
    </div>
    <div class="ri-cell">
      <div class="ri-label">${L.activeFilters}</div>
      <div class="ri-value">${filterStr}</div>
    </div>
  </div>

  <!-- ── Summary ── -->
  <div class="sum-bar">${L.summary}</div>
  <div class="sum-grid">
    <div class="sum-card">
      <div class="sum-label">${L.totalRecords}</div>
      <div class="sum-val">${this.finTransactions.length}</div>
    </div>
    <div class="sum-card">
      <div class="sum-label">${L.totalIncome}</div>
      <div class="sum-val pos">+${fmt(totalIncome)} MAD</div>
      <div class="sum-count">${this.finTransactions.filter(t => t.direction === 'income').length}</div>
    </div>
    <div class="sum-card">
      <div class="sum-label">${L.totalExpenses}</div>
      <div class="sum-val neg">-${fmt(totalExpense)} MAD</div>
      <div class="sum-count">${this.finTransactions.filter(t => t.direction === 'expense').length}</div>
    </div>
    <div class="sum-card">
      <div class="sum-label">${L.net}</div>
      <div class="sum-val ${net >= 0 ? 'pos' : 'neg'}">${net >= 0 ? '+' : ''}${fmt(net)} MAD</div>
    </div>
  </div>

  <!-- ── Transactions Table ── -->
  <div class="tbl-wrap">
    <div class="tbl-bar">${L.transactions}</div>
    <table>
      <thead>
        <tr>
          <th>${L.date}</th>
          <th>${L.type}</th>
          <th>${L.description}</th>
          <th style="text-align:right">${L.amount} (MAD)</th>
          <th>${L.resStatus}</th>
          <th>${L.payStatus}</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  </div>

  <!-- ── Footer ── -->
  <div class="rpt-foot">
    <span>${L.confidential}</span>
    <span>${genDate}</span>
  </div>

</div>
</body>
</html>`);
    win.document.close();
  }

  fileUrl(path: string): string { return environment.serverUrl + path; }

  downloadFileName(path: string): string {
    const last = path.split('/').pop();
    return last || 'facture';
  }

  txStatusClass(tx: any): string {
    const s = (tx.status || '').toLowerCase();
    if (['payee', 'paid', 'confirmed', 'confirmee', 'terminee', 'completed'].includes(s)) return 'txs-paid';
    if (['pending', 'en_attente', 'impaye', 'partiel'].includes(s))                       return 'txs-pending';
    if (['annulee', 'cancelled', 'annule'].includes(s))                                   return 'txs-cancelled';
    return 'txs-default';
  }

  txResStatusClass(tx: any): string {
    const s = (tx.reservationStatus || '').toLowerCase();
    if (['confirmee', 'confirmed', 'en_cours'].includes(s)) return 'txs-paid';
    if (['terminee', 'termine_avant_terme'].includes(s))    return 'txs-default';
    if (['annulee', 'cancelled', 'annule'].includes(s))     return 'txs-cancelled';
    return 'txs-pending';
  }

  txPayStatusClass(tx: any): string {
    const s = (tx.paymentStatus || '').toLowerCase();
    if (s === 'paid' || s === 'overpaid') return 'txs-paid';
    if (s === 'partial')                  return 'txs-pending';
    return 'txs-cancelled';
  }

  t(key: string): string { return this.ts.translate(key); }
}
