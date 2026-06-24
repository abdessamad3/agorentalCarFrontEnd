import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslationService } from '../../../../services/translation.service';
import { ActivityLogService, ActivityLogEntry } from '../../../../services/activity-log.service';

@Component({
  selector: 'app-history-tab',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './history-tab.component.html',
  styleUrls: ['../../voiture-detail.component.css'],
})
export class HistoryTabComponent implements OnChanges {
  @Input() reservations: any[] = [];
  @Input() clients: any[] = [];
  @Input() loading = false;
  @Input() dir = 'ltr';
  @Input() carId: number | null = null;
  @Input() mode: 'reservations' | 'history' = 'reservations';

  search = '';

  activityLogs: ActivityLogEntry[] = [];
  activityLoading = false;
  showActivity = false;

  constructor(
    private ts: TranslationService,
    private activityLogSvc: ActivityLogService,
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if ((changes['carId'] || changes['mode']) && this.carId && this.mode === 'history') {
      this.loadActivityLog();
    }
  }

  loadActivityLog(): void {
    if (!this.carId) return;
    this.activityLoading = true;
    this.activityLogSvc.getEntityHistory('Voiture', this.carId).subscribe({
      next: logs => { this.activityLogs = logs; this.activityLoading = false; },
      error: ()   => { this.activityLoading = false; },
    });
  }

  actionLabel(action: string): string {
    return ({ CREATE: 'Created', UPDATE: 'Updated', DELETE: 'Deleted', ARCHIVE: 'Archived' } as any)[action] ?? action;
  }

  actionClass(action: string): string {
    return ({ CREATE: 'act-create', UPDATE: 'act-update', DELETE: 'act-delete', ARCHIVE: 'act-archive' } as any)[action] ?? '';
  }

  changedFields(log: ActivityLogEntry): string {
    if (!log.oldData && !log.newData) return '';
    const keys = new Set([...Object.keys(log.oldData ?? {}), ...Object.keys(log.newData ?? {})]);
    return [...keys].join(', ');
  }

  get filteredReservations(): any[] {
    if (!this.search.trim()) return this.reservations;
    const q = this.search.toLowerCase();
    return this.reservations.filter(r =>
      this.getClientName(r).toLowerCase().includes(q) ||
      (r.reservationStatus || r.statut || '').toLowerCase().includes(q)
    );
  }

  getClientName(r: any): string {
    const id = r.clientId || r.client?.id;
    const c  = this.clients.find(c => c.id === id);
    if (c) return `${c.prenom || ''} ${c.nom}`.trim();
    return r.client?.nom || `#${id || '?'}`;
  }

  statusClass(r: any): string {
    const s = (r.reservationStatus || r.statut || '').toLowerCase();
    if (['confirmed', 'confirmee'].includes(s))                     return 'rs-confirmed';
    if (['en_cours', 'active', 'encours'].includes(s))              return 'rs-active';
    if (['terminee', 'completed', 'done', 'termine'].includes(s))   return 'rs-done';
    if (['annulee', 'cancelled', 'annule'].includes(s))             return 'rs-cancelled';
    return 'rs-pending';
  }

  statusLabel(r: any): string {
    const s = (r.reservationStatus || r.statut || '').toLowerCase();
    const map: Record<string, string> = {
      confirmed: this.t('confirmed'), confirmee: this.t('confirmed'),
      en_cours: this.t('inProgress'), active: this.t('inProgress'),
      terminee: this.t('done'), completed: this.t('done'), done: this.t('done'),
      annulee: this.t('cancelled'), cancelled: this.t('cancelled'),
      en_attente: this.t('pending'),
    };
    return map[s] || s;
  }

  duration(r: any): number {
    if (!r.dateDebut || !r.dateFin) return 0;
    return Math.max(1, Math.ceil((new Date(r.dateFin).getTime() - new Date(r.dateDebut).getTime()) / 86400000));
  }

  t(key: string): string { return this.ts.translate(key); }
}
