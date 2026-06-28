import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { map } from 'rxjs/operators';
import { safe, toArr } from '../shared/utils/rx.utils';
import { CrudService } from '../services/crud.service';
import { TranslationService } from '../services/translation.service';
import { daysUntil } from '../shared/utils/date.utils';

export interface VehicleHealthRow {
  id: number;
  label: string;
  immatriculation: string;
  status: string;
  score: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  complianceScore: number;
  maintenanceScore: number;
  availabilityScore: number;
  issues: string[];
}

@Component({
  selector: 'app-fleet-health',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './fleet-health.component.html',
  styleUrls: ['../shared/styles/reports.css'],
})
export class FleetHealthComponent implements OnInit {
  loading = true;
  dir = 'ltr';
  rows: VehicleHealthRow[] = [];
  search = '';
  sortField: keyof VehicleHealthRow = 'score';
  sortDir: 'asc' | 'desc' = 'asc';

  constructor(private crud: CrudService, private ts: TranslationService) {}

  ngOnInit() {
    this.ts.direction$.subscribe(d => this.dir = d);
    this.load();
  }

  load() {
    this.loading = true;
    forkJoin({
      cars:      safe(this.crud.getAll('voiture',         { limit: 500 })),
      vidanges:  safe(this.crud.getAll('vidange',         { limit: 500 })),
      repairs:   safe(this.crud.getAll('reparation',      { limit: 500 })),
      assur:     safe(this.crud.getAll('assurance',       { limit: 500 })),
      vignettes: safe(this.crud.getAll('vignette',        { limit: 500 })),
      suivis:    safe(this.crud.getAll('suivi-technique', { limit: 500 })),
    }).pipe(
      map(({ cars, vidanges, repairs, assur, vignettes, suivis }: any) => {
        const carList = toArr(cars);
        const vidList = toArr(vidanges);
        const repList = toArr(repairs);
        const asList  = toArr(assur);
        const vigList = toArr(vignettes);
        const suvList = toArr(suivis);

        return carList.map((car: any) => this.scoreVehicle(car, vidList, repList, asList, vigList, suvList));
      })
    ).subscribe({
      next: rows => { this.rows = rows; this.loading = false; },
      error: ()  => { this.loading = false; },
    });
  }

  private scoreVehicle(
    car: any,
    vidanges: any[], repairs: any[], assur: any[], vignettes: any[], suivis: any[]
  ): VehicleHealthRow {
    const issues: string[] = [];
    let complianceScore   = 40;
    let maintenanceScore  = 30;
    let availabilityScore = 30;

    // ── Compliance (40 pts) ────────────────────────────────────
    // Insurance (14 pts)
    const latestAssur = assur
      .filter(a => (a.voitureId ?? a.voiture?.id) === car.id)
      .sort((a, b) => new Date(b.dateFin ?? 0).getTime() - new Date(a.dateFin ?? 0).getTime())[0];
    if (!latestAssur) {
      complianceScore -= 14; issues.push('No insurance record');
    } else {
      const days = daysUntil(latestAssur.dateFin ?? latestAssur.dateExpiration);
      if (days === null || days < 0)   { complianceScore -= 14; issues.push('Insurance expired'); }
      else if (days <= 30) { complianceScore -= 7;  issues.push(`Insurance expires in ${days}d`); }
    }

    // Vignette (13 pts)
    const thisYear = new Date().getFullYear();
    const latestVig = vignettes
      .filter(v => (v.voitureId ?? v.voiture?.id) === car.id)
      .sort((a, b) => (b.annee ?? 0) - (a.annee ?? 0))[0];
    if (!latestVig || (latestVig.annee && +latestVig.annee < thisYear)) {
      complianceScore -= 13; issues.push('Vignette not up to date');
    } else {
      const days = daysUntil(latestVig.dateFin ?? latestVig.dateExpiration);
      if (days !== null && days < 0) { complianceScore -= 13; issues.push('Vignette expired'); }
      else if (days !== null && days <= 30) { complianceScore -= 6; issues.push(`Vignette expires in ${days}d`); }
    }

    // Technical visit (13 pts)
    const latestSuivi = suivis
      .filter(s => (s.voitureId ?? s.voiture?.id) === car.id)
      .sort((a, b) => new Date(b.prochainDate ?? b.dateVisite ?? 0).getTime() - new Date(a.prochainDate ?? a.dateVisite ?? 0).getTime())[0];
    if (!latestSuivi) {
      complianceScore -= 13; issues.push('No technical visit record');
    } else {
      const days = daysUntil(latestSuivi.prochainDate ?? latestSuivi.dateProchaine);
      if (days === null || days < 0)   { complianceScore -= 13; issues.push('Technical visit overdue'); }
      else if (days <= 30) { complianceScore -= 6; issues.push(`Technical visit in ${days}d`); }
    }

    // ── Maintenance (30 pts) ───────────────────────────────────
    // Oil change (15 pts)
    const latestVid = vidanges
      .filter(v => (v.voitureId ?? v.voiture?.id) === car.id)
      .sort((a, b) => new Date(b.dateDerniere ?? 0).getTime() - new Date(a.dateDerniere ?? 0).getTime())[0];
    if (!latestVid) {
      maintenanceScore -= 8; issues.push('No oil change record');
    } else {
      const currentKm = car.kilometrage ?? 0;
      const nextKm    = latestVid.kmSuivant;
      if (nextKm && currentKm > nextKm) {
        maintenanceScore -= 15; issues.push(`Oil change overdue by ${(currentKm - nextKm).toLocaleString()} km`);
      } else if (nextKm && (nextKm - currentKm) <= 500) {
        maintenanceScore -= 8;  issues.push(`Oil change due in ${(nextKm - currentKm).toLocaleString()} km`);
      }
    }

    // Open repairs (15 pts)
    const openRepairs = repairs.filter(r => {
      const isForCar = (r.voitureId ?? r.voiture?.id) === car.id;
      const isOpen   = !['terminee','done','complete','completed'].includes((r.statut ?? '').toLowerCase());
      return isForCar && isOpen;
    });
    if (openRepairs.length > 0) {
      const deduction = Math.min(15, openRepairs.length * 5);
      maintenanceScore -= deduction;
      issues.push(`${openRepairs.length} open repair(s)`);
    }

    // ── Availability (30 pts) ──────────────────────────────────
    const status = (car.voitureStatus ?? '').toLowerCase();
    if (['vendu', 'sold'].includes(status))         { availabilityScore -= 30; issues.push('Vehicle sold'); }
    else if (['archive', 'archived'].includes(status)) { availabilityScore -= 20; issues.push('Vehicle archived'); }
    else if (['hors_service'].includes(status))     { availabilityScore -= 20; issues.push('Out of service'); }
    else if (['maintenance'].includes(status))      { availabilityScore -= 10; issues.push('In maintenance'); }

    const score = Math.max(0, complianceScore + maintenanceScore + availabilityScore);
    const grade: VehicleHealthRow['grade'] =
      score >= 90 ? 'A' :
      score >= 75 ? 'B' :
      score >= 60 ? 'C' :
      score >= 40 ? 'D' : 'F';

    return {
      id:               car.id,
      label:            `${car.marque ?? ''} ${car.modele ?? ''}`.trim() || `#${car.id}`,
      immatriculation:  car.immatriculation ?? '',
      status:           car.voitureStatus ?? '',
      score,
      grade,
      complianceScore:  Math.max(0, complianceScore),
      maintenanceScore: Math.max(0, maintenanceScore),
      availabilityScore:Math.max(0, availabilityScore),
      issues,
    };
  }

  get filtered(): VehicleHealthRow[] {
    let r = [...this.rows];
    if (this.search.trim()) {
      const q = this.search.toLowerCase();
      r = r.filter(x => x.label.toLowerCase().includes(q) || x.immatriculation.toLowerCase().includes(q));
    }
    r.sort((a, b) => {
      const av = a[this.sortField] as number;
      const bv = b[this.sortField] as number;
      return this.sortDir === 'asc' ? av - bv : bv - av;
    });
    return r;
  }

  get fleetScore(): number {
    if (!this.rows.length) return 0;
    return Math.round(this.rows.reduce((s, r) => s + r.score, 0) / this.rows.length);
  }

  get gradeDistribution(): Record<VehicleHealthRow['grade'], number> {
    const d: Record<string, number> = { A: 0, B: 0, C: 0, D: 0, F: 0 };
    for (const r of this.rows) d[r.grade]++;
    return d as Record<VehicleHealthRow['grade'], number>;
  }

  get criticalCount(): number { return this.rows.filter(r => r.score < 60).length; }

  toggleSort(f: keyof VehicleHealthRow) {
    if (this.sortField === f) this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
    else { this.sortField = f; this.sortDir = 'asc'; }
  }

  scoreColor(s: number): string {
    if (s >= 75) return '#276749';
    if (s >= 60) return '#d69e2e';
    if (s >= 40) return '#dd6b20';
    return '#c53030';
  }

  scoreBg(s: number): string {
    if (s >= 75) return '#f0fff4';
    if (s >= 60) return '#fffff0';
    if (s >= 40) return '#fffaf0';
    return '#fff5f5';
  }

  gradeColor(g: string): string {
    return { A: '#276749', B: '#2b6cb0', C: '#d69e2e', D: '#dd6b20', F: '#c53030' }[g] ?? '#718096';
  }

  gradeDist(g: string): number {
    return this.gradeDistribution[g as VehicleHealthRow['grade']] ?? 0;
  }

  barPct(value: number, max: number): number {
    return max > 0 ? Math.round((value / max) * 100) : 0;
  }
}
