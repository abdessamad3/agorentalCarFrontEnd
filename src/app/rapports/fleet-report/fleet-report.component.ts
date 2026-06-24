import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CrudService } from '../../services/crud.service';
import { TranslationService } from '../../services/translation.service';
import { forkJoin, of, Observable } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';

@Component({
  selector: 'app-fleet-report',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './fleet-report.component.html',
  styleUrls: ['../../shared/styles/reports.css']
})
export class FleetReportComponent implements OnInit {
  loading = true;
  cars: any[] = [];
  dir = 'ltr';
  search = '';
  filterStatus = '';

  constructor(private crud: CrudService, private ts: TranslationService) {}

  ngOnInit() {
    this.ts.direction$.subscribe(d => this.dir = d);
    this.load();
  }

  load() {
    this.loading = true;
    this.loadAllCars().subscribe({
      next: cars => { this.cars = cars; this.loading = false; },
      error: () => { this.loading = false; }
    });
  }

  private loadAllCars(): Observable<any[]> {
    return this.crud.getAll('voiture', { limit: 100, page: 1 }).pipe(
      switchMap((r: any) => {
        const first: any[] = Array.isArray(r) ? r : (r?.data ?? []);
        const pages: number = r?.meta?.pages ?? 1;
        if (pages <= 1) return of(first);
        const rest$ = Array.from({ length: pages - 1 }, (_, i) =>
          this.crud.getAll('voiture', { limit: 100, page: i + 2 }).pipe(
            map((p: any) => Array.isArray(p) ? p : (p?.data ?? [])),
            catchError(() => of([]))
          )
        );
        return forkJoin(rest$).pipe(map((chunks: any[][]) => first.concat(...chunks)));
      }),
      catchError(() => of([]))
    );
  }

  get stats() {
    return {
      total:       this.cars.length,
      available:   this.cars.filter(c => ['available','disponible'].includes(c.voitureStatus)).length,
      rented:      this.cars.filter(c => ['rented','louee'].includes(c.voitureStatus)).length,
      maintenance: this.cars.filter(c => c.voitureStatus === 'maintenance').length,
      expiredDocs: this.cars.filter(c =>
        c.voitureStatus === 'hors_service' ||
        c.compliance?.overall === 'EXPIRED' ||
        c.compliance?.overall === 'CRITICAL'
      ).length,
    };
  }

  get filtered() {
    let r = [...this.cars];
    if (this.search.trim()) {
      const q = this.search.toLowerCase();
      r = r.filter(c => [c.marque, c.modele, c.immatriculation]
        .some(v => String(v || '').toLowerCase().includes(q)));
    }
    if (this.filterStatus) r = r.filter(c => c.voitureStatus === this.filterStatus);
    return r;
  }

  docDays(date: string): number {
    if (!date) return 999;
    return Math.round((new Date(date).getTime() - Date.now()) / 86400000);
  }

  docStatus(date: string): string {
    if (!date) return 'doc-none';
    const d = this.docDays(date);
    if (d < 0) return 'doc-expired';
    if (d <= 30) return 'doc-soon';
    return 'doc-ok';
  }

  docLabel(date: string): string {
    if (!date) return '—';
    const d = this.docDays(date);
    const fmt = new Date(date).toLocaleDateString('fr-FR');
    if (d < 0) return `${fmt} (${Math.abs(d)}d exp.)`;
    if (d === 0) return 'Today';
    if (d <= 30) return `${fmt} (${d}d)`;
    return fmt;
  }

  statusPillClass(s: string): string {
    const m: Record<string, string> = {
      available: 'sp-available', disponible: 'sp-available',
      rented: 'sp-rented', louee: 'sp-rented',
      maintenance: 'sp-maintenance',
      sold: 'sp-sold', vendue: 'sp-sold',
    };
    return m[s || ''] || 'sp-other';
  }

  statusLabel(s: string): string {
    const m: Record<string, string> = {
      available: 'Available', disponible: 'Available',
      rented: 'Rented', louee: 'Rented',
      maintenance: 'Maintenance',
      sold: 'Sold', vendue: 'Sold',
    };
    return m[s || ''] || s || '—';
  }

  exportCSV() {
    const headers = ['Marque','Modèle','Immat.','Année','Statut','Km','Carburant','Assurance exp.','Vignette exp.','Visite exp.'];
    const rows = this.filtered.map(c => [
      c.marque || '', c.modele || '', c.immatriculation || '', c.annee || '',
      this.statusLabel(c.voitureStatus), c.kilometrage || '', c.typeCarburant || '',
      c.compliance?.assurance?.expiresAt || '', c.compliance?.vignette?.expiresAt || '', c.compliance?.visite?.expiresAt || ''
    ]);
    this.downloadCSV('rapport-flotte.csv', headers, rows);
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
