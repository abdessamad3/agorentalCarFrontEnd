import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface ErrorLogEntry {
  id: number;
  source: 'backend' | 'frontend';
  exceptionClass: string | null;
  message: string;
  file: string | null;
  line: number | null;
  trace: string | null;
  requestUrl: string | null;
  requestMethod: string | null;
  createdAt: string;
  user: { id: number; nom: string; email: string } | null;
  ipAddress: string | null;
}

export interface ErrorLogPage {
  data: ErrorLogEntry[];
  meta: { page: number; limit: number; total: number; totalPages: number; hasNextPage: boolean; hasPrevPage: boolean };
}

export interface ErrorLogFilters {
  source?: 'backend' | 'frontend';
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

@Injectable({ providedIn: 'root' })
export class ErrorLogService {
  private readonly base = `${environment.apiUrl}/error-log`;

  constructor(private http: HttpClient) {}

  getLogs(filters: ErrorLogFilters = {}): Observable<ErrorLogPage> {
    let params = new HttpParams();
    if (filters.source)   params = params.set('source', filters.source);
    if (filters.dateFrom) params = params.set('dateFrom', filters.dateFrom);
    if (filters.dateTo)   params = params.set('dateTo', filters.dateTo);
    params = params.set('page', filters.page ?? 1);
    params = params.set('limit', filters.limit ?? 20);
    return this.http.get<ErrorLogPage>(this.base, { params });
  }

  getLatest(): Observable<{ data: ErrorLogEntry | null }> {
    return this.http.get<{ data: ErrorLogEntry | null }>(`${this.base}/latest`);
  }

  /** Fire-and-forget — reporting a crash must never itself throw or block
   * the UI the user is already stuck in. Used by GlobalErrorHandler. */
  reportClientError(message: string, stack: string | null, url: string | null): void {
    this.http.post(`${this.base}/client`, { message, stack, url }).subscribe({ error: () => {} });
  }
}
