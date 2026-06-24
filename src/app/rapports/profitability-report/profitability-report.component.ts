import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { CrudService } from '../../services/crud.service';
import { TranslationService } from '../../services/translation.service';

export interface VehicleRow {
  id: number; label: string; immatriculation: string;
  rentals: number; revenue: number;
  insuranceCost: number; repairCost: number; vignetteCost: number;
  vidangeCost: number; adblueCost: number; suiviCost: number;
  otherCost: number; creditCost: number;
  totalCost: number; net: number; margin: number;
}

@Component({
  selector: 'app-profitability-report',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './profitability-report.component.html',
  styleUrls: ['../../shared/styles/reports.css']
})
export class ProfitabilityReportComponent implements OnInit {
  loading = true;
  dir = 'ltr';
  rows: VehicleRow[] = [];
  sortField: keyof VehicleRow = 'net';
  sortDir: 'asc' | 'desc' = 'desc';
  search = '';
  selectedYear: number = new Date().getFullYear();
  availableYears: number[] = [];

  constructor(
    private crud: CrudService,
    private ts: TranslationService,
  ) {}

  ngOnInit() {
    this.ts.direction$.subscribe(d => this.dir = d);
    this.load();
  }

  load() {
    this.loading = true;
    this.crud.getAll('profitability/vehicles', { year: this.selectedYear })
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

  get filtered(): VehicleRow[] {
    let r = [...this.rows];
    if (this.search.trim()) {
      const q = this.search.toLowerCase();
      r = r.filter(row =>
        row.label.toLowerCase().includes(q) ||
        row.immatriculation.toLowerCase().includes(q)
      );
    }
    r.sort((a, b) => {
      const av = a[this.sortField] as number;
      const bv = b[this.sortField] as number;
      return this.sortDir === 'asc' ? av - bv : bv - av;
    });
    return r;
  }

  get totals() {
    return this.filtered.reduce((acc, r) => ({
      rentals:      acc.rentals       + r.rentals,
      revenue:      acc.revenue       + r.revenue,
      insuranceCost: acc.insuranceCost + r.insuranceCost,
      repairCost:   acc.repairCost    + r.repairCost,
      vignetteCost: acc.vignetteCost  + r.vignetteCost,
      vidangeCost:  acc.vidangeCost   + r.vidangeCost,
      adblueCost:   acc.adblueCost    + r.adblueCost,
      suiviCost:    acc.suiviCost     + r.suiviCost,
      otherCost:    acc.otherCost     + r.otherCost,
      creditCost:   acc.creditCost    + r.creditCost,
      totalCost:    acc.totalCost     + r.totalCost,
      net:          acc.net           + r.net,
    }), { rentals: 0, revenue: 0, insuranceCost: 0, repairCost: 0, vignetteCost: 0, vidangeCost: 0, adblueCost: 0, suiviCost: 0, otherCost: 0, creditCost: 0, totalCost: 0, net: 0 });
  }

  sort(field: keyof VehicleRow) {
    this.sortDir   = this.sortField === field && this.sortDir === 'desc' ? 'asc' : 'desc';
    this.sortField = field;
  }

  // ── Executive leaderboard getters ─────────────────────────────

  get top10ByRentals(): VehicleRow[] {
    return [...this.rows].sort((a, b) => b.rentals - a.rentals).slice(0, 10);
  }

  get bottom10ByRentals(): VehicleRow[] {
    return [...this.rows]
      .filter(r => r.rentals > 0)
      .sort((a, b) => a.rentals - b.rentals)
      .slice(0, 10);
  }

  get top10ByRevenue(): VehicleRow[] {
    return [...this.rows].sort((a, b) => b.revenue - a.revenue).slice(0, 10);
  }

  rankLabel(i: number): string {
    return i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`;
  }

  barPct(value: number, max: number): number {
    return max > 0 ? Math.round((value / max) * 100) : 0;
  }

  fmt(n: number): string {
    return n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  exportCSV() {
    const headers = [
      'Vehicle', 'Plate', '# Rentals', 'Revenue (MAD)',
      'Insurance (MAD)', 'Repairs (MAD)', 'Vignette (MAD)',
      'Vidange (MAD)', 'AdBlue (MAD)', 'Suivi Tech. (MAD)',
      'Other (MAD)', 'Credit Pmts (MAD)',
      'Total Cost (MAD)', 'Net Profit (MAD)', 'Margin %',
    ];
    const rows = this.filtered.map(r => [
      r.label, r.immatriculation, r.rentals,
      this.fmt(r.revenue),
      this.fmt(r.insuranceCost), this.fmt(r.repairCost), this.fmt(r.vignetteCost),
      this.fmt(r.vidangeCost), this.fmt(r.adblueCost), this.fmt(r.suiviCost),
      this.fmt(r.otherCost), this.fmt(r.creditCost),
      this.fmt(r.totalCost), this.fmt(r.net), r.margin + '%',
    ]);
    this.downloadCSV(`rapport-rentabilite-${this.selectedYear}.csv`, headers, rows);
  }

  print() { window.print(); }

  private downloadCSV(filename: string, headers: string[], rows: (string | number)[][]) {
    const csv = [headers, ...rows]
      .map(r => r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(';'))
      .join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  }
}
