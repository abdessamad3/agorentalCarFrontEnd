import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CrudService } from '../../services/crud.service';
import { TranslationService } from '../../services/translation.service';
import { of } from 'rxjs';
import { catchError } from 'rxjs/operators';

interface CustomerRow {
  clientId: number;
  name: string;
  phone: string;
  reservations: number;
  revenue: number;
  paid: number;
  outstanding: number;
}

@Component({
  selector: 'app-customer-report',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './customer-report.component.html',
  styleUrls: ['../../shared/styles/reports.css'],
})
export class CustomerReportComponent implements OnInit {
  loading = true;
  dir = 'ltr';
  search = '';

  allCustomers: CustomerRow[] = [];

  private readonly revenueStatuses = [
    'confirmed', 'confirmee', 'active', 'en_cours', 'encours',
    'completed', 'terminee', 'done', 'termine',
  ];

  constructor(private crud: CrudService, private ts: TranslationService) {}

  ngOnInit(): void {
    this.ts.direction$.subscribe(d => this.dir = d);
    this.load();
  }

  load(): void {
    this.loading = true;
    this.crud.getAll('reservation', { limit: 2000 }).pipe(catchError(() => of([]))).subscribe({
      next: (raw: any) => {
        const reservations: any[] = Array.isArray(raw) ? raw : (raw?.data ?? []);
        this.allCustomers = this.buildCustomers(reservations);
        this.loading = false;
      },
      error: () => { this.loading = false; },
    });
  }

  private buildCustomers(reservations: any[]): CustomerRow[] {
    const map = new Map<number, CustomerRow>();

    reservations.forEach(r => {
      const c = r.client ?? r.clientData;
      if (!c) return;
      const cid: number = c.id ?? c.clientId;
      if (!cid) return;

      if (!map.has(cid)) {
        const nom    = c.nom    || '';
        const prenom = c.prenom || '';
        map.set(cid, {
          clientId: cid,
          name: `${nom} ${prenom}`.trim() || `Client #${cid}`,
          phone: c.telephone || c.tel || '',
          reservations: 0,
          revenue: 0,
          paid: 0,
          outstanding: 0,
        });
      }

      const row     = map.get(cid)!;
      const status  = (r.reservationStatus || r.statut || '').toLowerCase();
      const total   = parseFloat(r.total   || r.montant    || 0);
      const paid    = parseFloat(r.montantPaye || 0);

      row.reservations++;

      if (this.revenueStatuses.includes(status)) {
        row.revenue     += total;
        row.paid        += paid;
        row.outstanding += Math.max(0, total - paid);
      }
    });

    return Array.from(map.values());
  }

  // ── Filtered ─────────────────────────────────────────────────

  private get searched(): CustomerRow[] {
    if (!this.search.trim()) return this.allCustomers;
    const q = this.search.toLowerCase();
    return this.allCustomers.filter(c =>
      c.name.toLowerCase().includes(q) || c.phone.includes(q)
    );
  }

  get topByRevenue(): CustomerRow[] {
    return [...this.searched].sort((a, b) => b.revenue - a.revenue).slice(0, 10);
  }

  get topByRentals(): CustomerRow[] {
    return [...this.searched].sort((a, b) => b.reservations - a.reservations).slice(0, 10);
  }

  get withDebt(): CustomerRow[] {
    return [...this.allCustomers]
      .filter(c => c.outstanding > 0.5)
      .sort((a, b) => b.outstanding - a.outstanding);
  }

  // ── Summary stats ────────────────────────────────────────────

  get stats() {
    const all = this.allCustomers;
    return {
      totalClients:  all.length,
      totalRevenue:  all.reduce((s, c) => s + c.revenue,      0),
      totalPaid:     all.reduce((s, c) => s + c.paid,         0),
      totalOutstanding: all.reduce((s, c) => s + c.outstanding, 0),
      totalRentals:  all.reduce((s, c) => s + c.reservations, 0),
      withDebt:      all.filter(c => c.outstanding > 0.5).length,
    };
  }

  get debtTotals() {
    const d = this.withDebt;
    return {
      revenue: d.reduce((s, c) => s + c.revenue,     0),
      paid:    d.reduce((s, c) => s + c.paid,         0),
      outstanding: d.reduce((s, c) => s + c.outstanding, 0),
    };
  }

  // ── Helpers ──────────────────────────────────────────────────

  rankLabel(i: number): string {
    return i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`;
  }

  barPct(value: number, max: number): number {
    return max > 0 ? Math.round((value / max) * 100) : 0;
  }

  fmt(n: number): string {
    return n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  exportCSV(): void {
    const headers = ['Name', 'Phone', 'Reservations', 'Revenue (MAD)', 'Paid (MAD)', 'Outstanding (MAD)'];
    const rows = [...this.allCustomers]
      .sort((a, b) => b.revenue - a.revenue)
      .map(c => [c.name, c.phone, c.reservations, this.fmt(c.revenue), this.fmt(c.paid), this.fmt(c.outstanding)]);
    this.downloadCSV('rapport-clients.csv', headers, rows);
  }

  print(): void { window.print(); }

  private downloadCSV(filename: string, headers: string[], rows: (string | number)[][]): void {
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
