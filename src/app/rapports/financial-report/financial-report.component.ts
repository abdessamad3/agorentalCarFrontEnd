import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CrudService } from '../../services/crud.service';
import { TranslationService } from '../../services/translation.service';
import { ExportService } from '../../services/export.service';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

type ViewMode = 'monthly' | 'quarterly' | 'yearly';

interface MonthBar { label: string; revenue: number; expenses: number; rH: number; eH: number; margin: number; }

interface QuarterBar { label: string; revenue: number; expenses: number; profit: number; margin: number; rH: number; eH: number; }

interface YearRow { year: number; revenue: number; expenses: number; profit: number; margin: number; }

@Component({
  selector: 'app-financial-report',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './financial-report.component.html',
  styleUrls: ['../../shared/styles/reports.css']
})
export class FinancialReportComponent implements OnInit {
  loading = true;
  dir = 'ltr';

  selectedYear: number = new Date().getFullYear();
  availableYears: number[] = [];
  viewMode: ViewMode = 'monthly';

  private reservations: any[] = [];
  private expenses: any[] = [];
  private payments: any[] = [];

  monthBars: MonthBar[] = [];
  expenseByType: { type: string; total: number; count: number }[] = [];

  readonly monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  readonly revenueStatuses = ['confirmed','confirmee','active','en_cours','encours','completed','terminee','done','termine'];

  expenseExporting = false;

  constructor(private crud: CrudService, private ts: TranslationService, private exportSvc: ExportService) {}

  ngOnInit() {
    this.ts.direction$.subscribe(d => this.dir = d);
    const safe = (obs: any) => obs.pipe(catchError(() => of([])));
    forkJoin({
      reservations: safe(this.crud.getAll('reservation', { limit: 2000 })),
      expenses:     safe(this.crud.getAll('depense', { limit: 2000 })),
      payments:     safe(this.crud.getAll('paiement', { limit: 2000 })),
    }).subscribe({
      next: ({ reservations, expenses, payments }: any) => {
        this.reservations = this.toArr(reservations);
        this.expenses     = this.toArr(expenses);
        this.payments     = this.toArr(payments);

        const years = new Set<number>();
        [...this.reservations, ...this.expenses].forEach(item => {
          const d = new Date(item.dateDebut || item.date || item.creeAu || 0);
          if (!isNaN(d.getTime())) years.add(d.getFullYear());
        });
        years.add(new Date().getFullYear());
        this.availableYears = Array.from(years).sort((a, b) => b - a);

        this.build();
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  build() {
    this.monthBars = this.buildBars();
    this.expenseByType = this.buildExpenseBreakdown();
  }

  private buildBars(): MonthBar[] {
    const bars: MonthBar[] = [];
    for (let m = 0; m < 12; m++) {
      const rev = this.reservations
        .filter(r => {
          const d = new Date(r.dateDebut || r.creeAu || 0);
          return d.getFullYear() === this.selectedYear && d.getMonth() === m
            && this.revenueStatuses.includes((r.reservationStatus || r.statut || '').toLowerCase());
        })
        .reduce((s, r) => s + (parseFloat(r.total || r.montant || 0)), 0);

      const exp = this.expenses
        .filter(e => {
          const d = new Date(e.date || e.dateDepense || e.creeAu || 0);
          return d.getFullYear() === this.selectedYear && d.getMonth() === m;
        })
        .reduce((s, e) => s + (parseFloat(e.montant) || 0), 0);

      const margin = rev > 0 ? Math.round(((rev - exp) / rev) * 100) : 0;
      bars.push({ label: this.monthNames[m], revenue: rev, expenses: exp, rH: 0, eH: 0, margin });
    }
    const maxVal = Math.max(...bars.map(b => Math.max(b.revenue, b.expenses)), 1);
    bars.forEach(b => { b.rH = Math.round((b.revenue / maxVal) * 120); b.eH = Math.round((b.expenses / maxVal) * 120); });
    return bars;
  }

  private computeForYear(year: number): { revenue: number; expenses: number } {
    const revenue = this.reservations
      .filter(r => {
        const d = new Date(r.dateDebut || r.creeAu || 0);
        return d.getFullYear() === year
          && this.revenueStatuses.includes((r.reservationStatus || r.statut || '').toLowerCase());
      })
      .reduce((s, r) => s + (parseFloat(r.total || r.montant || 0)), 0);
    const expenses = this.expenses
      .filter(e => {
        const d = new Date(e.date || e.dateDepense || e.creeAu || 0);
        return d.getFullYear() === year;
      })
      .reduce((s, e) => s + (parseFloat(e.montant) || 0), 0);
    return { revenue, expenses };
  }

  get quarterBars(): QuarterBar[] {
    const qDef = [[0,1,2],[3,4,5],[6,7,8],[9,10,11]];
    const bars: QuarterBar[] = qDef.map((months, qi) => {
      const revenue  = months.reduce((s, m) => s + this.monthBars[m].revenue,  0);
      const expenses = months.reduce((s, m) => s + this.monthBars[m].expenses, 0);
      const profit   = revenue - expenses;
      const margin   = revenue > 0 ? Math.round((profit / revenue) * 100) : 0;
      return { label: `Q${qi + 1}`, revenue, expenses, profit, margin, rH: 0, eH: 0 };
    });
    const maxVal = Math.max(...bars.map(b => Math.max(b.revenue, b.expenses)), 1);
    bars.forEach(b => { b.rH = Math.round((b.revenue / maxVal) * 120); b.eH = Math.round((b.expenses / maxVal) * 120); });
    return bars;
  }

  get yearRows(): YearRow[] {
    return this.availableYears.map(year => {
      const { revenue, expenses } = this.computeForYear(year);
      const profit = revenue - expenses;
      const margin = revenue > 0 ? Math.round((profit / revenue) * 100) : 0;
      return { year, revenue, expenses, profit, margin };
    });
  }

  setViewMode(m: ViewMode): void { this.viewMode = m; }

  private buildExpenseBreakdown(): { type: string; total: number; count: number }[] {
    const map: Record<string, { total: number; count: number }> = {};
    this.expenses
      .filter(e => {
        const d = new Date(e.date || e.creeAu || 0);
        return d.getFullYear() === this.selectedYear;
      })
      .forEach(e => {
        const t = e.typeDepense || 'Other';
        if (!map[t]) map[t] = { total: 0, count: 0 };
        map[t].total += parseFloat(e.montant) || 0;
        map[t].count++;
      });
    return Object.entries(map)
      .map(([type, v]) => ({ type, ...v }))
      .sort((a, b) => b.total - a.total);
  }

  get stats() {
    const res = this.reservations.filter(r => {
      const d = new Date(r.dateDebut || r.creeAu || 0);
      return d.getFullYear() === this.selectedYear
        && this.revenueStatuses.includes((r.reservationStatus || r.statut || '').toLowerCase());
    });
    const exp = this.expenses.filter(e => {
      const d = new Date(e.date || e.creeAu || 0);
      return d.getFullYear() === this.selectedYear;
    });
    const revenue  = res.reduce((s, r) => s + (parseFloat(r.total || r.montant || 0)), 0);
    const expenses = exp.reduce((s, e) => s + (parseFloat(e.montant) || 0), 0);
    const paid    = this.payments.filter(p => p.statut === 'payee').length;
    const total   = this.payments.length || 1;
    return { revenue, expenses, net: revenue - expenses, collectionRate: Math.round((paid / total) * 100), reservations: res.length };
  }

  onYearChange() { this.build(); }

  get hasData(): boolean {
    return this.expenseByType.length > 0 || this.monthBars.some(b => b.revenue > 0 || b.expenses > 0);
  }

  fmt(n: number): string {
    return n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  private toArr(r: any): any[] { return Array.isArray(r) ? r : (r?.data ?? []); }

  exportExcel() {
    this.exportSvc.financialExcel(this.monthBars, this.selectedYear);
  }

  exportExpenseExcel() {
    this.expenseExporting = true;
    const safe = (obs: any) => obs.pipe(catchError(() => of([])));
    forkJoin({
      assurances:  safe(this.crud.getAll('assurance',   { limit: 2000 })),
      reparations: safe(this.crud.getAll('reparation',  { limit: 2000 })),
      vidanges:    safe(this.crud.getAll('vidange',     { limit: 2000 })),
    }).subscribe({
      next: ({ assurances, reparations, vidanges }: any) => {
        this.exportSvc.expenseExcel(
          this.toArr(assurances),
          this.toArr(reparations),
          this.toArr(vidanges),
        );
        this.expenseExporting = false;
      },
      error: () => { this.expenseExporting = false; },
    });
  }

  exportCSV() {
    const headers = ['Mois','Revenus','Dépenses','Net'];
    const rows = this.monthBars.map(b => [
      b.label, this.fmt(b.revenue), this.fmt(b.expenses), this.fmt(b.revenue - b.expenses)
    ]);
    this.downloadCSV(`rapport-financier-${this.selectedYear}.csv`, headers, rows);
  }

  print() { window.print(); }

  private downloadCSV(filename: string, headers: string[], rows: (string | number)[][]) {
    const csv = [headers, ...rows]
      .map(r => r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(';'))
      .join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  }
}
