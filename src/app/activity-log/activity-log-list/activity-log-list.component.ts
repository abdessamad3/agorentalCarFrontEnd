import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivityLogService, ActivityLogEntry, ActivityLogFilters } from '../../services/activity-log.service';
import { TranslationService } from '../../services/translation.service';

@Component({
  selector: 'app-activity-log-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './activity-log-list.component.html',
  styleUrls: ['./activity-log-list.component.css'],
})
export class ActivityLogListComponent implements OnInit {
  logs: ActivityLogEntry[] = [];
  loading = false;
  error = '';

  // Filters
  entityType = '';
  action     = '';
  dateFrom   = '';
  dateTo     = '';

  // Pagination
  page  = 1;
  limit = 50;
  total = 0;
  pages = 0;

  // Detail expand
  expandedId: number | null = null;

  readonly ENTITY_TYPES = ['Voiture', 'Client', 'Reservation', 'Assurance', 'Vignette', 'Depense', 'PaiementDepense'];
  readonly ACTIONS       = ['CREATE', 'UPDATE', 'DELETE', 'ARCHIVE'];

  constructor(
    private svc: ActivityLogService,
    private ts:  TranslationService,
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.error   = '';
    const filters: ActivityLogFilters = {
      entityType: this.entityType || undefined,
      action:     this.action     || undefined,
      dateFrom:   this.dateFrom   || undefined,
      dateTo:     this.dateTo     || undefined,
      page:       this.page,
      limit:      this.limit,
    };
    this.svc.getLogs(filters).subscribe({
      next: res => {
        this.logs    = res.data;
        this.total   = res.meta.total;
        this.pages   = res.meta.pages;
        this.loading = false;
      },
      error: () => {
        this.error   = 'Failed to load activity logs';
        this.loading = false;
      },
    });
  }

  applyFilters(): void {
    this.page = 1;
    this.load();
  }

  resetFilters(): void {
    this.entityType = '';
    this.action     = '';
    this.dateFrom   = '';
    this.dateTo     = '';
    this.page       = 1;
    this.load();
  }

  goToPage(p: number): void {
    if (p < 1 || p > this.pages) return;
    this.page = p;
    this.load();
  }

  toggleExpand(id: number): void {
    this.expandedId = this.expandedId === id ? null : id;
  }

  actionClass(action: string): string {
    return ({
      CREATE:  'badge-create',
      UPDATE:  'badge-update',
      DELETE:  'badge-delete',
      ARCHIVE: 'badge-archive',
    } as Record<string, string>)[action] ?? '';
  }

  changedKeys(entry: ActivityLogEntry): string[] {
    if (!entry.oldData && !entry.newData) return [];
    const allKeys = new Set([
      ...Object.keys(entry.oldData ?? {}),
      ...Object.keys(entry.newData ?? {}),
    ]);
    return [...allKeys];
  }

  formatVal(v: any): string {
    if (v === null || v === undefined) return '—';
    return String(v);
  }

  pagesArray(): number[] {
    const arr: number[] = [];
    const start = Math.max(1, this.page - 2);
    const end   = Math.min(this.pages, this.page + 2);
    for (let i = start; i <= end; i++) arr.push(i);
    return arr;
  }

  t(key: string) { return this.ts.translate(key); }
}
