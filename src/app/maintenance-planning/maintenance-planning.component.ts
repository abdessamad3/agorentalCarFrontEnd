import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { CrudService } from '../services/crud.service';
import { TranslationService } from '../services/translation.service';

export type TaskPriority = 'OVERDUE' | 'CRITICAL' | 'WARNING' | 'UPCOMING' | 'OK';
export type TaskType = 'oil_change' | 'technical_visit' | 'repair' | 'insurance' | 'vignette';

export interface MaintenanceTask {
  vehicleId: number;
  vehicleLabel: string;
  immatriculation: string;
  type: TaskType;
  typeLabel: string;
  priority: TaskPriority;
  daysUntil: number | null;
  dueDate: string | null;
  remainingKm: number | null;
  description: string;
  cost?: number;
  sourceId: number;
}

function daysFromNow(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  return Math.round((d.getTime() - Date.now()) / 86_400_000);
}

function priorityFromDays(days: number | null): TaskPriority {
  if (days === null) return 'UPCOMING';
  if (days < 0)   return 'OVERDUE';
  if (days <= 7)  return 'CRITICAL';
  if (days <= 30) return 'WARNING';
  if (days <= 90) return 'UPCOMING';
  return 'OK';
}

function priorityOrder(p: TaskPriority): number {
  return { OVERDUE: 0, CRITICAL: 1, WARNING: 2, UPCOMING: 3, OK: 4 }[p];
}

@Component({
  selector: 'app-maintenance-planning',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './maintenance-planning.component.html',
  styleUrls: ['../shared/styles/reports.css'],
})
export class MaintenancePlanningComponent implements OnInit {
  loading = true;
  dir = 'ltr';
  tasks: MaintenanceTask[] = [];
  filterPriority: TaskPriority | 'ALL' = 'ALL';
  filterType: TaskType | 'ALL' = 'ALL';
  search = '';

  readonly PRIORITY_LABELS: Record<TaskPriority, string> = {
    OVERDUE:  'Overdue',
    CRITICAL: 'Critical (≤7 days)',
    WARNING:  'Warning (≤30 days)',
    UPCOMING: 'Upcoming (≤90 days)',
    OK:       'OK',
  };

  readonly PRIORITY_COLORS: Record<TaskPriority, string> = {
    OVERDUE:  '#c53030',
    CRITICAL: '#e53e3e',
    WARNING:  '#dd6b20',
    UPCOMING: '#d69e2e',
    OK:       '#276749',
  };

  readonly TYPE_LABELS: Record<TaskType, string> = {
    oil_change:       '🛢️ Oil Change',
    technical_visit:  '🔍 Technical Visit',
    repair:           '🔧 Repair',
    insurance:        '🛡️ Insurance',
    vignette:         '🏷️ Vignette',
  };

  constructor(private crud: CrudService, private ts: TranslationService) {}

  ngOnInit() {
    this.ts.direction$.subscribe(d => this.dir = d);
    this.load();
  }

  private safe(obs: any) { return obs.pipe(catchError(() => of([]))); }
  private toArr(r: any): any[] { return Array.isArray(r) ? r : (r?.data ?? []); }

  private carLabel(car: any): string {
    return `${car?.marque ?? ''} ${car?.modele ?? ''}`.trim() || `#${car?.id}`;
  }

  load() {
    this.loading = true;
    forkJoin({
      cars:     this.safe(this.crud.getAll('voiture',         { limit: 500 })),
      vidanges: this.safe(this.crud.getAll('vidange',         { limit: 500 })),
      repairs:  this.safe(this.crud.getAll('reparation',      { limit: 500 })),
      suivis:   this.safe(this.crud.getAll('suivi-technique', { limit: 500 })),
      assur:    this.safe(this.crud.getAll('assurance',       { limit: 500 })),
      vignettes:this.safe(this.crud.getAll('vignette',        { limit: 500 })),
    }).pipe(
      map(({ cars, vidanges, repairs, suivis, assur, vignettes }: any) => {
        const carList = this.toArr(cars);
        const carMap  = new Map<number, any>(carList.map((c: any) => [c.id, c]));
        const tasks: MaintenanceTask[] = [];

        // Oil changes
        for (const v of this.toArr(vidanges)) {
          const carId = v.voitureId ?? v.voiture?.id;
          const car   = carMap.get(carId);
          const currentKm = car?.kilometrage ?? 0;
          const nextKm    = v.kmSuivant ?? null;
          const nextDate  = v.dateProchaine ?? null;
          const remKm     = nextKm ? nextKm - currentKm : null;

          let days = daysFromNow(nextDate);
          let priority: TaskPriority;

          if (remKm !== null && remKm <= 0)      priority = 'OVERDUE';
          else if (remKm !== null && remKm <= 300) priority = 'CRITICAL';
          else if (remKm !== null && remKm <= 1000) priority = 'WARNING';
          else priority = priorityFromDays(days);

          if (priority === 'OK') continue;

          tasks.push({
            vehicleId:     carId,
            vehicleLabel:  this.carLabel(car),
            immatriculation: car?.immatriculation ?? '',
            type:          'oil_change',
            typeLabel:     this.TYPE_LABELS.oil_change,
            priority,
            daysUntil:     days,
            dueDate:       nextDate,
            remainingKm:   remKm,
            description:   remKm !== null
              ? `${remKm > 0 ? remKm.toLocaleString() + ' km remaining' : 'Overdue by ' + Math.abs(remKm).toLocaleString() + ' km'}`
              : 'Schedule oil change',
            sourceId: v.id,
          });
        }

        // Technical visits
        for (const s of this.toArr(suivis)) {
          const carId = s.voitureId ?? s.voiture?.id;
          const car   = carMap.get(carId);
          const days  = daysFromNow(s.prochainDate ?? s.dateProchaine);
          const priority = priorityFromDays(days);
          if (priority === 'OK') continue;
          tasks.push({
            vehicleId:     carId,
            vehicleLabel:  this.carLabel(car),
            immatriculation: car?.immatriculation ?? '',
            type:          'technical_visit',
            typeLabel:     this.TYPE_LABELS.technical_visit,
            priority,
            daysUntil:     days,
            dueDate:       s.prochainDate ?? s.dateProchaine ?? null,
            remainingKm:   null,
            description:   `Technical inspection${s.resultat ? ' — last result: ' + s.resultat : ''}`,
            sourceId: s.id,
          });
        }

        // Repairs (pending/open)
        for (const r of this.toArr(repairs)) {
          const statut = (r.statut ?? '').toLowerCase();
          if (['terminee', 'done', 'complete', 'completed'].includes(statut)) continue;
          const carId = r.voitureId ?? r.voiture?.id;
          const car   = carMap.get(carId);
          const days  = daysFromNow(r.datePrevu ?? r.date);
          const priority = days !== null && days < 0 ? 'OVERDUE' : days !== null && days <= 7 ? 'CRITICAL' : 'WARNING';
          tasks.push({
            vehicleId:     carId,
            vehicleLabel:  this.carLabel(car),
            immatriculation: car?.immatriculation ?? '',
            type:          'repair',
            typeLabel:     this.TYPE_LABELS.repair,
            priority,
            daysUntil:     days,
            dueDate:       r.datePrevu ?? r.date ?? null,
            remainingKm:   null,
            description:   r.description ?? r.typeReparation ?? 'Open repair',
            cost:          parseFloat(r.montant ?? 0) || undefined,
            sourceId: r.id,
          });
        }

        // Insurance expiry
        for (const a of this.toArr(assur)) {
          const carId = a.voitureId ?? a.voiture?.id;
          const car   = carMap.get(carId);
          const days  = daysFromNow(a.dateFin ?? a.dateExpiration);
          const priority = priorityFromDays(days);
          if (priority === 'OK') continue;
          tasks.push({
            vehicleId:     carId,
            vehicleLabel:  this.carLabel(car),
            immatriculation: car?.immatriculation ?? '',
            type:          'insurance',
            typeLabel:     this.TYPE_LABELS.insurance,
            priority,
            daysUntil:     days,
            dueDate:       a.dateFin ?? a.dateExpiration ?? null,
            remainingKm:   null,
            description:   `Insurance renewal${a.compagnie ? ' — ' + a.compagnie : ''}`,
            cost:          parseFloat(a.montant ?? 0) || undefined,
            sourceId: a.id,
          });
        }

        // Vignette expiry
        for (const v of this.toArr(vignettes)) {
          const carId = v.voitureId ?? v.voiture?.id;
          const car   = carMap.get(carId);
          const days  = daysFromNow(v.dateFin ?? v.dateExpiration);
          const priority = priorityFromDays(days);
          if (priority === 'OK') continue;
          tasks.push({
            vehicleId:     carId,
            vehicleLabel:  this.carLabel(car),
            immatriculation: car?.immatriculation ?? '',
            type:          'vignette',
            typeLabel:     this.TYPE_LABELS.vignette,
            priority,
            daysUntil:     days,
            dueDate:       v.dateFin ?? v.dateExpiration ?? null,
            remainingKm:   null,
            description:   `Vignette renewal${v.annee ? ' — ' + v.annee : ''}`,
            cost:          parseFloat(v.montant ?? 0) || undefined,
            sourceId: v.id,
          });
        }

        return tasks.sort((a, b) =>
          priorityOrder(a.priority) - priorityOrder(b.priority) ||
          (a.daysUntil ?? 9999) - (b.daysUntil ?? 9999)
        );
      })
    ).subscribe({
      next: tasks => { this.tasks = tasks; this.loading = false; },
      error: ()  => { this.loading = false; },
    });
  }

  get filtered(): MaintenanceTask[] {
    let t = this.tasks;
    if (this.filterPriority !== 'ALL') t = t.filter(x => x.priority === this.filterPriority);
    if (this.filterType     !== 'ALL') t = t.filter(x => x.type     === this.filterType);
    if (this.search.trim()) {
      const q = this.search.toLowerCase();
      t = t.filter(x =>
        x.vehicleLabel.toLowerCase().includes(q) ||
        x.immatriculation.toLowerCase().includes(q) ||
        x.description.toLowerCase().includes(q)
      );
    }
    return t;
  }

  get counts(): Record<TaskPriority, number> {
    const c: Record<TaskPriority, number> = { OVERDUE: 0, CRITICAL: 0, WARNING: 0, UPCOMING: 0, OK: 0 };
    for (const t of this.tasks) c[t.priority]++;
    return c;
  }

  priorityClass(p: TaskPriority): string {
    return { OVERDUE: 'doc-expired', CRITICAL: 'doc-expired', WARNING: 'doc-soon', UPCOMING: 'doc-soon', OK: 'doc-ok' }[p];
  }

  daysLabel(task: MaintenanceTask): string {
    if (task.remainingKm !== null) {
      if (task.remainingKm <= 0) return `${Math.abs(task.remainingKm).toLocaleString()} km overdue`;
      return `${task.remainingKm.toLocaleString()} km left`;
    }
    if (task.daysUntil === null) return '—';
    if (task.daysUntil < 0)  return `${Math.abs(task.daysUntil)}d overdue`;
    if (task.daysUntil === 0) return 'Today';
    return `${task.daysUntil}d`;
  }

  fmtDate(d: string | null): string {
    if (!d) return '—';
    try { return new Date(d).toLocaleDateString('fr-MA'); } catch { return d; }
  }
}
