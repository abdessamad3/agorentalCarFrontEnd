import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ErrorLogService, ErrorLogEntry, ErrorLogFilters } from '../../services/error-log.service';
import { TranslationService } from '../../services/translation.service';
import { PaginatorComponent } from '../../shared/paginator/paginator.component';
import { PAGE_SIZE } from '../../shared/constants/pagination';

@Component({
  selector: 'app-error-log-list',
  standalone: true,
  imports: [CommonModule, FormsModule, PaginatorComponent],
  templateUrl: './error-log-list.component.html',
  styleUrls: ['./error-log-list.component.css'],
})
export class ErrorLogListComponent implements OnInit {
  logs: ErrorLogEntry[] = [];
  loading = false;
  error = '';

  source:   '' | 'backend' | 'frontend' = '';
  dateFrom = '';
  dateTo   = '';

  page  = 1;
  limit = PAGE_SIZE;
  total = 0;

  expandedId: number | null = null;

  constructor(
    private svc: ErrorLogService,
    private ts:  TranslationService,
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.error   = '';
    const filters: ErrorLogFilters = {
      source:   this.source || undefined,
      dateFrom: this.dateFrom || undefined,
      dateTo:   this.dateTo   || undefined,
      page:     this.page,
      limit:    this.limit,
    };
    this.svc.getLogs(filters).subscribe({
      next: res => {
        this.logs    = res.data;
        this.total   = res.meta.total;
        this.loading = false;
      },
      error: () => {
        this.error   = 'Failed to load error log';
        this.loading = false;
      },
    });
  }

  applyFilters(): void {
    this.page = 1;
    this.load();
  }

  resetFilters(): void {
    this.source   = '';
    this.dateFrom = '';
    this.dateTo   = '';
    this.page     = 1;
    this.load();
  }

  onPageChange(p: number): void {
    this.page = p;
    this.load();
  }

  toggleExpand(id: number): void {
    this.expandedId = this.expandedId === id ? null : id;
  }

  shortMessage(msg: string, max = 100): string {
    return msg.length > max ? msg.slice(0, max) + '…' : msg;
  }

  fileName(path: string): string {
    const parts = path.split(/[/\\]/);
    return parts[parts.length - 1] || path;
  }

  t(key: string) { return this.ts.translate(key); }
}
