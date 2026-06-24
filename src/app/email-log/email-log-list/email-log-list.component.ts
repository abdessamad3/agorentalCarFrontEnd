import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CrudService } from '../../services/crud.service';

interface EmailLogEntry {
  id: number;
  sentAt: string;
  recipientEmail: string;
  subject: string;
  totalAlerts: number;
  complianceCount: number;
  oilCount: number;
  creditCount: number;
  status: 'sent' | 'failed';
  errorMessage: string | null;
  triggeredBy: string;
}

@Component({
  selector: 'app-email-log-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './email-log-list.component.html',
  styleUrls: ['./email-log-list.component.css'],
})
export class EmailLogListComponent implements OnInit {
  logs: EmailLogEntry[] = [];
  loading = false;
  error = '';

  statusFilter = '';
  dateFrom = '';
  dateTo = '';

  page  = 1;
  limit = 20;
  total = 0;
  pages = 0;

  expandedId: number | null = null;

  constructor(private crud: CrudService) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.error   = '';
    const params: Record<string, any> = { page: this.page, limit: this.limit };
    if (this.statusFilter) params['status'] = this.statusFilter;
    if (this.dateFrom)     params['dateFrom'] = this.dateFrom;
    if (this.dateTo)       params['dateTo'] = this.dateTo;

    this.crud.getPage('email-log', params).subscribe({
      next: (res: any) => {
        this.logs    = res.data ?? [];
        this.total   = res.meta?.total ?? 0;
        this.pages   = res.meta?.pages ?? 0;
        this.loading = false;
      },
      error: () => {
        this.error   = 'Failed to load email history';
        this.loading = false;
      },
    });
  }

  applyFilters(): void {
    this.page = 1;
    this.load();
  }

  resetFilters(): void {
    this.statusFilter = '';
    this.dateFrom = '';
    this.dateTo   = '';
    this.page     = 1;
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

  pagesArray(): number[] {
    const arr: number[] = [];
    const start = Math.max(1, this.page - 2);
    const end   = Math.min(this.pages, this.page + 2);
    for (let i = start; i <= end; i++) arr.push(i);
    return arr;
  }

  statusClass(status: string): string {
    return status === 'sent' ? 'badge-sent' : 'badge-failed';
  }

  triggeredClass(triggeredBy: string): string {
    return triggeredBy === 'manual' ? 'badge-manual' : 'badge-auto';
  }
}
