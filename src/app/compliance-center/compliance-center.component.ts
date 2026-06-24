import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { CrudService } from '../services/crud.service';
import { TranslationService } from '../services/translation.service';
import { SuiviTechnique, Vidange } from '../models/compliance.model';

type Urgency = 'OVERDUE' | 'CRITICAL' | 'WARNING' | 'UPCOMING';

interface ComplianceTask {
  id: string;
  vehicleId: number;
  vehicleLabel: string;
  immatriculation: string;
  category: 'insurance' | 'vignette' | 'technical' | 'oil' | 'repair';
  categoryLabel: string;
  urgency: Urgency;
  daysUntil: number | null;
  expiryDate: string | null;
  detail: string;
  done: boolean;
  estimatedCost?: number;
}

function daysFrom(d: string | null | undefined): number | null {
  if (!d) return null;
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return null;
  return Math.round((dt.getTime() - Date.now()) / 86_400_000);
}

function urgency(days: number | null): Urgency {
  if (days === null || days < 0)  return 'OVERDUE';
  if (days <= 7)  return 'CRITICAL';
  if (days <= 30) return 'WARNING';
  return 'UPCOMING';
}

@Component({
  selector: 'app-compliance-center',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './compliance-center.component.html',
  styleUrls: ['../shared/styles/reports.css'],
})
export class ComplianceCenterComponent implements OnInit {
  loading = true;
  dir = 'ltr';
  tasks: ComplianceTask[] = [];
  filterUrgency: Urgency | 'ALL' = 'ALL';
  filterCategory = 'ALL';
  showDone = false;
  search = '';

  readonly URGENCY_CFG: Record<Urgency, { label: string; cls: string; icon: string }> = {
    OVERDUE:  { label: 'Overdue',            cls: 'doc-expired', icon: '🔴' },
    CRITICAL: { label: 'Critical (≤7d)',     cls: 'doc-expired', icon: '🟠' },
    WARNING:  { label: 'Warning (≤30d)',     cls: 'doc-soon',    icon: '🟡' },
    UPCOMING: { label: 'Upcoming (≤90d)',    cls: 'doc-soon',    icon: '🔵' },
  };

  readonly CATEGORIES = [
    { value: 'insurance',  label: '🛡️ Insurance' },
    { value: 'vignette',   label: '🏷️ Vignette' },
    { value: 'technical',  label: '🔍 Technical Visit' },
    { value: 'oil',        label: '🛢️ Oil Change' },
    { value: 'repair',     label: '🔧 Repairs' },
  ];

  constructor(private crud: CrudService, private ts: TranslationService) {}

  ngOnInit() {
    this.ts.direction$.subscribe(d => this.dir = d);
    this.load();
  }

  private safe(obs: any) { return obs.pipe(catchError(() => of([]))); }
  private toArr<T = any>(r: any): T[] { return Array.isArray(r) ? r : (r?.data ?? []); }

  private carLabel(car: any): string {
    return `${car?.marque ?? ''} ${car?.modele ?? ''}`.trim() || `#${car?.id}`;
  }

  load() {
    this.loading = true;
    this.tasks   = [];

    forkJoin({
      cars:      this.safe(this.crud.getAll('voiture',         { limit: 500 })),
      assur:     this.safe(this.crud.getAll('assurance',       { limit: 500 })),
      vignettes: this.safe(this.crud.getAll('vignette',        { limit: 500 })),
      suivis:    this.safe(this.crud.getAll('suivi-technique', { limit: 500 })),
      vidanges:  this.safe(this.crud.getAll('vidange',         { limit: 500 })),
      repairs:   this.safe(this.crud.getAll('reparation',      { limit: 500 })),
    }).pipe(
      map(({ cars, assur, vignettes, suivis, vidanges, repairs }: any) => {
        const carList = this.toArr(cars);
        const carMap  = new Map<number, any>(carList.map((c: any) => [c.id, c]));
        const tasks: ComplianceTask[] = [];
        const NINETY_DAYS_FROM_NOW = Date.now() + 90 * 86_400_000;

        const addTask = (t: ComplianceTask) => {
          if (t.urgency === 'UPCOMING' && t.daysUntil !== null && t.daysUntil > 90) return;
          tasks.push(t);
        };

        // Insurance
        for (const a of this.toArr(assur)) {
          const carId = a.voitureId ?? a.voiture?.id;
          const car   = carMap.get(carId);
          const expiry = a.dateFin ?? a.dateExpiration;
          const days   = daysFrom(expiry);
          if (days !== null && days > 90) continue;
          addTask({
            id: `ins-${a.id}`, vehicleId: carId,
            vehicleLabel: this.carLabel(car), immatriculation: car?.immatriculation ?? '',
            category: 'insurance', categoryLabel: '🛡️ Insurance',
            urgency: urgency(days), daysUntil: days, expiryDate: expiry ?? null,
            detail: a.compagnie ? `Insurer: ${a.compagnie}` : 'Insurance renewal required',
            estimatedCost: parseFloat(a.montant ?? 0) || undefined, done: false,
          });
        }

        // Vignette
        for (const v of this.toArr(vignettes)) {
          const carId = v.voitureId ?? v.voiture?.id;
          const car   = carMap.get(carId);
          const expiry = v.dateFin ?? v.dateExpiration;
          const days   = daysFrom(expiry);
          if (days !== null && days > 90) continue;
          const thisYear = new Date().getFullYear();
          const isExpired = !expiry ? (v.annee && +v.annee < thisYear) : (days !== null && days < 0);
          addTask({
            id: `vig-${v.id}`, vehicleId: carId,
            vehicleLabel: this.carLabel(car), immatriculation: car?.immatriculation ?? '',
            category: 'vignette', categoryLabel: '🏷️ Vignette',
            urgency: isExpired ? 'OVERDUE' : urgency(days), daysUntil: days, expiryDate: expiry ?? null,
            detail: v.annee ? `Year ${v.annee}` : 'Vignette renewal required',
            estimatedCost: parseFloat(v.montant ?? 0) || undefined, done: false,
          });
        }

        // Technical visits
        for (const s of this.toArr<SuiviTechnique>(suivis)) {
          const carId = s.voitureId;
          if (carId === null) continue; // no associated vehicle — nothing to display this against
          const car   = carMap.get(carId);
          const nextDate = s.dateFin;
          const days   = daysFrom(nextDate);
          if (days !== null && days > 90) continue;
          addTask({
            id: `suivi-${s.id}`, vehicleId: carId,
            vehicleLabel: this.carLabel(car), immatriculation: car?.immatriculation ?? '',
            category: 'technical', categoryLabel: '🔍 Technical Visit',
            urgency: urgency(days), daysUntil: days, expiryDate: nextDate ?? null,
            detail: s.resultat ? `Last result: ${s.resultat}` : 'Technical inspection due',
            done: false,
          });
        }

        // Oil changes
        for (const v of this.toArr<Vidange>(vidanges)) {
          const carId = v.voitureId;
          if (carId === null) continue; // no associated vehicle — nothing to display this against
          const car   = carMap.get(carId);
          const currentKm = car?.kilometrageActuel ?? 0;
          const nextKm    = v.kilometrageSuivant;
          const remKm     = nextKm ? nextKm - currentKm : null;

          let u: Urgency;
          if (remKm !== null && remKm <= 0)       u = 'OVERDUE';
          else if (remKm !== null && remKm <= 300) u = 'CRITICAL';
          else if (remKm !== null && remKm <= 1000) u = 'WARNING';
          else continue; // Vidange has no "next due date", only "next due km" — nothing to flag

          addTask({
            id: `oil-${v.id}`, vehicleId: carId,
            vehicleLabel: this.carLabel(car), immatriculation: car?.immatriculation ?? '',
            category: 'oil', categoryLabel: '🛢️ Oil Change',
            urgency: u, daysUntil: null, expiryDate: null,
            detail: remKm !== null
              ? (remKm <= 0 ? `Overdue by ${Math.abs(remKm).toLocaleString()} km` : `${remKm.toLocaleString()} km remaining`)
              : 'Oil change scheduled',
            done: false,
          });
        }

        // Open repairs
        for (const r of this.toArr(repairs)) {
          const isOpen = !['terminee','done','complete','completed'].includes((r.statut ?? '').toLowerCase());
          if (!isOpen) continue;
          const carId = r.voitureId ?? r.voiture?.id;
          const car   = carMap.get(carId);
          const days  = daysFrom(r.datePrevu ?? r.date);
          const u     = days !== null && days < 0 ? 'OVERDUE' : days !== null && days <= 7 ? 'CRITICAL' : 'WARNING';
          addTask({
            id: `rep-${r.id}`, vehicleId: carId,
            vehicleLabel: this.carLabel(car), immatriculation: car?.immatriculation ?? '',
            category: 'repair', categoryLabel: '🔧 Repair',
            urgency: u, daysUntil: days, expiryDate: r.datePrevu ?? r.date ?? null,
            detail: r.description ?? r.typeReparation ?? 'Open repair',
            estimatedCost: parseFloat(r.montant ?? 0) || undefined, done: false,
          });
        }

        // Sort: urgency order, then by days
        const order: Record<Urgency, number> = { OVERDUE: 0, CRITICAL: 1, WARNING: 2, UPCOMING: 3 };
        return tasks.sort((a, b) =>
          order[a.urgency] - order[b.urgency] ||
          (a.daysUntil ?? 9999) - (b.daysUntil ?? 9999)
        );
      })
    ).subscribe({
      next: tasks => { this.tasks = tasks; this.loading = false; },
      error: ()   => { this.loading = false; },
    });
  }

  get filtered(): ComplianceTask[] {
    let t = this.tasks.filter(x => this.showDone || !x.done);
    if (this.filterUrgency !== 'ALL')   t = t.filter(x => x.urgency === this.filterUrgency);
    if (this.filterCategory !== 'ALL')  t = t.filter(x => x.category === this.filterCategory);
    if (this.search.trim()) {
      const q = this.search.toLowerCase();
      t = t.filter(x =>
        x.vehicleLabel.toLowerCase().includes(q) ||
        x.immatriculation.toLowerCase().includes(q) ||
        x.detail.toLowerCase().includes(q)
      );
    }
    return t;
  }

  get counts(): Record<Urgency, number> {
    const c: Record<Urgency, number> = { OVERDUE: 0, CRITICAL: 0, WARNING: 0, UPCOMING: 0 };
    for (const t of this.tasks) if (!t.done) c[t.urgency]++;
    return c;
  }

  get totalEstimatedCost(): number {
    return this.tasks.filter(t => !t.done && t.estimatedCost).reduce((s, t) => s + (t.estimatedCost ?? 0), 0);
  }

  markDone(task: ComplianceTask) {
    task.done = true;
  }

  markAllDone(urgencyLevel: Urgency) {
    this.tasks.filter(t => t.urgency === urgencyLevel && !t.done).forEach(t => t.done = true);
  }

  daysLabel(t: ComplianceTask): string {
    if (t.daysUntil === null) return '—';
    if (t.daysUntil < 0)  return `${Math.abs(t.daysUntil)}d overdue`;
    if (t.daysUntil === 0) return 'Today';
    return `in ${t.daysUntil}d`;
  }

  fmtDate(d: string | null): string {
    if (!d) return '—';
    try { return new Date(d).toLocaleDateString('fr-MA'); } catch { return d; }
  }

  fmtCost(n: number | undefined): string {
    if (!n) return '';
    return n.toLocaleString('fr-MA', { maximumFractionDigits: 0 }) + ' MAD';
  }
}
