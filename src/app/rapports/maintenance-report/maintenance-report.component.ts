import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CrudService } from '../../services/crud.service';
import { TranslationService } from '../../services/translation.service';
import { forkJoin, of, Observable } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { toArr } from '../../shared/utils/rx.utils';

interface VehicleMaintenanceRow {
  id: number;
  label: string;
  immatriculation: string;
  repairs: number;
  repairCost: number;
  oilChanges: number;
  oilCost: number;
  adblue: number;
  adblueQty: number;
  adbluesCost: number;
  totalCost: number;
}

interface EventRow {
  date: string;
  vehicle: string;
  type: string;
  description: string;
  cost: number;
}

@Component({
  selector: 'app-maintenance-report',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './maintenance-report.component.html',
  styleUrls: ['../../shared/styles/reports.css']
})
export class MaintenanceReportComponent implements OnInit {
  loading = true;
  dir = 'ltr';
  vehicleRows: VehicleMaintenanceRow[] = [];
  events: EventRow[] = [];
  search = '';
  selectedYear: number = new Date().getFullYear();
  availableYears: number[] = [];

  constructor(private crud: CrudService, private ts: TranslationService) {}

  ngOnInit() {
    this.ts.direction$.subscribe(d => this.dir = d);
    this.load();
  }

  load() {
    this.loading = true;
    const safe = (obs: any) => obs.pipe(catchError(() => of([])));
    forkJoin({
      cars:        this.loadAllCars(),
      reparations: safe(this.crud.getAll('reparation', { limit: 2000 })),
      vidanges:    safe(this.crud.getAll('vidange',    { limit: 2000 })),
      adblues:     safe(this.crud.getAll('adblue',     { limit: 2000 })),
    }).subscribe({
      next: ({ cars, reparations, vidanges, adblues }: any) => {
        const carList  = toArr(cars);
        const repList  = toArr(reparations);
        const vidList  = toArr(vidanges);
        const ablList  = toArr(adblues);

        const allDates = [...repList, ...vidList, ...ablList].map(i => new Date(i.date || i.dateDebut || i.creeAu || 0).getFullYear());
        const years = new Set<number>([new Date().getFullYear(), ...allDates.filter(y => !isNaN(y))]);
        this.availableYears = Array.from(years).sort((a, b) => b - a);

        this.vehicleRows = this.buildVehicleRows(carList, repList, vidList, ablList);
        this.events = this.buildEvents(carList, repList, vidList, ablList);
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  private buildVehicleRows(cars: any[], reps: any[], vids: any[], abls: any[]): VehicleMaintenanceRow[] {
    return cars.map(car => {
      const carReps = reps.filter(r => r.voitureId === car.id && this.inYear(r.date || r.dateDebut));
      const carVids = vids.filter(v => v.voitureId === car.id && this.inYear(v.date));
      const carAbls = abls.filter(a => a.voitureId === car.id && this.inYear(a.date));

      const repairCost  = carReps.reduce((s, r) => s + (parseFloat(r.montant) || 0), 0);
      const oilCost     = carVids.reduce((s, v) => s + (parseFloat(v.cout) || 0), 0);
      const adbluesCost = carAbls.reduce((s, a) => s + (parseFloat(a.cout) || 0), 0);
      const adblueQty   = carAbls.reduce((s, a) => s + (parseFloat(a.quantiteLitre || a.quantiteLitres) || 0), 0);

      return {
        id: car.id,
        label: `${car.marque || ''} ${car.modele || ''}`.trim(),
        immatriculation: car.immatriculation || '',
        repairs: carReps.length, repairCost,
        oilChanges: carVids.length, oilCost,
        adblue: carAbls.length, adblueQty, adbluesCost,
        totalCost: repairCost + oilCost + adbluesCost,
      };
    })
    .filter(r => r.repairs > 0 || r.oilChanges > 0 || r.adblue > 0)
    .sort((a, b) => b.totalCost - a.totalCost);
  }

  private buildEvents(cars: any[], reps: any[], vids: any[], abls: any[]): EventRow[] {
    const carMap: Record<number, string> = {};
    cars.forEach(c => carMap[c.id] = `${c.marque || ''} ${c.modele || ''} (${c.immatriculation || ''})`.trim());

    const events: EventRow[] = [
      ...reps.filter(r => this.inYear(r.date || r.dateDebut)).map(r => ({
        date: r.date || r.dateDebut || '',
        vehicle: carMap[r.voitureId] || r.voiture || `#${r.voitureId}`,
        type: 'Repair',
        description: r.descriptionTechnique || '—',
        cost: parseFloat(r.montant) || 0,
      })),
      ...vids.filter(v => this.inYear(v.date)).map(v => ({
        date: v.date || '',
        vehicle: carMap[v.voitureId] || v.voiture || `#${v.voitureId}`,
        type: 'Oil Change',
        description: `${v.filtreAir ? 'Air filter ' : ''}${v.filtreHuile ? 'Oil filter ' : ''}${v.filtreCarburant ? 'Fuel filter' : ''}`.trim() || '—',
        cost: parseFloat(v.cout) || 0,
      })),
      ...abls.filter(a => this.inYear(a.date)).map(a => ({
        date: a.date || '',
        vehicle: carMap[a.voitureId] || a.voiture || `#${a.voitureId}`,
        type: 'AdBlue',
        description: `${a.quantiteLitre || a.quantiteLitres || '?'} L`,
        cost: parseFloat(a.cout) || 0,
      })),
    ];

    return events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  private inYear(dateStr: string): boolean {
    if (!dateStr) return false;
    return new Date(dateStr).getFullYear() === this.selectedYear;
  }

  get stats() {
    const rows = this.filteredVehicles;
    return {
      vehicles:   rows.length,
      repairs:    rows.reduce((s, r) => s + r.repairs, 0),
      oilChanges: rows.reduce((s, r) => s + r.oilChanges, 0),
      adblue:     rows.reduce((s, r) => s + r.adblue, 0),
      repairCost: rows.reduce((s, r) => s + r.repairCost, 0),
      oilCost:    rows.reduce((s, r) => s + r.oilCost, 0),
      adbluesCost:rows.reduce((s, r) => s + r.adbluesCost, 0),
      adblueQty:  rows.reduce((s, r) => s + r.adblueQty, 0),
      totalCost:  rows.reduce((s, r) => s + r.totalCost, 0),
    };
  }

  get filteredVehicles(): VehicleMaintenanceRow[] {
    if (!this.search.trim()) return this.vehicleRows;
    const q = this.search.toLowerCase();
    return this.vehicleRows.filter(r => r.label.toLowerCase().includes(q) || r.immatriculation.toLowerCase().includes(q));
  }

  get filteredEvents(): EventRow[] {
    if (!this.search.trim()) return this.events;
    const q = this.search.toLowerCase();
    return this.events.filter(e => e.vehicle.toLowerCase().includes(q));
  }

  onYearChange() { this.load(); }

  fmt(n: number): string {
    return n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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


  exportCSV() {
    const headers = ['Vehicle','Plate','Repairs','Repair Cost','Oil Changes','Oil Cost','AdBlue','AdBlue Qty (L)','AdBlue Cost','Total Cost'];
    const rows = this.filteredVehicles.map(r => [
      r.label, r.immatriculation,
      r.repairs, this.fmt(r.repairCost),
      r.oilChanges, this.fmt(r.oilCost),
      r.adblue, r.adblueQty.toFixed(1), this.fmt(r.adbluesCost),
      this.fmt(r.totalCost)
    ]);
    this.downloadCSV(`rapport-maintenance-${this.selectedYear}.csv`, headers, rows);
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
