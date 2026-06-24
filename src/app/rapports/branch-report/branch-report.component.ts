import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { CrudService } from '../../services/crud.service';
import { TranslationService } from '../../services/translation.service';

export interface BureauRow {
  id: number;
  name: string;
  address: string;
  manager: string | null;
  vehicleCount: number;
  rentals: number;
  revenue: number;
  vehicleExpenses: number;
  officeExpenses: number;
  creditCost: number;
  totalExpenses: number;
  profit: number;
  margin: number;
}

@Component({
  selector: 'app-branch-report',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './branch-report.component.html',
  styleUrls: ['../../shared/styles/reports.css'],
})
export class BranchReportComponent implements OnInit {
  loading = true;
  dir = 'ltr';
  rows: BureauRow[] = [];
  selectedYear: number = new Date().getFullYear();
  availableYears: number[] = [];
  sortField: keyof BureauRow = 'profit';
  sortDir: 'asc' | 'desc' = 'desc';

  constructor(private crud: CrudService, private ts: TranslationService) {}

  ngOnInit() {
    this.ts.direction$.subscribe(d => this.dir = d);
    this.load();
  }

  load() {
    this.loading = true;
    this.crud.getAll('profitability/bureaux', { year: this.selectedYear })
      .pipe(catchError(() => of(null)))
      .subscribe({
        next: (res: any) => {
          this.rows           = res?.rows ?? [];
          this.availableYears = res?.availableYears ?? [];
          this.loading        = false;
        },
        error: () => { this.loading = false; },
      });
  }

  onYearChange() { this.load(); }

  get sorted(): BureauRow[] {
    const r = [...this.rows];
    r.sort((a, b) => {
      const av = a[this.sortField] as number;
      const bv = b[this.sortField] as number;
      return this.sortDir === 'asc' ? av - bv : bv - av;
    });
    return r;
  }

  toggleSort(f: keyof BureauRow) {
    if (this.sortField === f) this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
    else { this.sortField = f; this.sortDir = 'desc'; }
  }

  get totals() {
    return this.rows.reduce((acc, r) => ({
      revenue:         acc.revenue         + r.revenue,
      vehicleExpenses: acc.vehicleExpenses + r.vehicleExpenses,
      officeExpenses:  acc.officeExpenses  + r.officeExpenses,
      creditCost:      acc.creditCost      + r.creditCost,
      totalExpenses:   acc.totalExpenses   + r.totalExpenses,
      profit:          acc.profit          + r.profit,
      rentals:         acc.rentals         + r.rentals,
      vehicleCount:    acc.vehicleCount    + r.vehicleCount,
    }), { revenue: 0, vehicleExpenses: 0, officeExpenses: 0, creditCost: 0, totalExpenses: 0, profit: 0, rentals: 0, vehicleCount: 0 });
  }

  get maxRevenue(): number { return Math.max(...this.rows.map(r => r.revenue), 1); }

  barPct(value: number): number {
    return this.maxRevenue > 0 ? Math.round((value / this.maxRevenue) * 100) : 0;
  }

  rankLabel(i: number): string {
    return i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`;
  }

  fmt(n: number): string {
    return n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  exportCSV() {
    const headers = [
      'Bureau', 'Address', 'Manager', 'Vehicles', 'Rentals',
      'Revenue (MAD)', 'Vehicle Exp. (MAD)', 'Office Exp. (MAD)',
      'Credit Pmts (MAD)', 'Total Expenses (MAD)', 'Net Profit (MAD)', 'Margin %',
    ];
    const rows = this.sorted.map(r => [
      r.name, r.address ?? '', r.manager ?? '',
      r.vehicleCount, r.rentals,
      this.fmt(r.revenue), this.fmt(r.vehicleExpenses), this.fmt(r.officeExpenses),
      this.fmt(r.creditCost), this.fmt(r.totalExpenses), this.fmt(r.profit), r.margin + '%',
    ]);
    const csv = [headers, ...rows]
      .map(row => row.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(';'))
      .join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `rapport-bureaux-${this.selectedYear}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  print() { window.print(); }
}
