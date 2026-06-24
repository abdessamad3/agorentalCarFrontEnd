import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface ActivityLogEntry {
  id: number;
  entityType: string;
  entityId: number;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'ARCHIVE';
  oldData: Record<string, any> | null;
  newData: Record<string, any> | null;
  createdAt: string;
  user: { id: number; nom: string; email: string } | null;
  bureau: string | null;
  ipAddress: string | null;
}

export interface ActivityLogPage {
  data: ActivityLogEntry[];
  meta: { page: number; limit: number; total: number; pages: number };
}

export interface ActivityLogFilters {
  entityType?: string;
  action?: string;
  userId?: number;
  bureauId?: number;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

@Injectable({ providedIn: 'root' })
export class ActivityLogService {
  private readonly base = `${environment.apiUrl}/activity-log`;

  constructor(private http: HttpClient) {}

  getLogs(filters: ActivityLogFilters = {}): Observable<ActivityLogPage> {
    let params = new HttpParams();
    if (filters.entityType) params = params.set('entityType', filters.entityType);
    if (filters.action)     params = params.set('action', filters.action);
    if (filters.userId)     params = params.set('userId', filters.userId);
    if (filters.bureauId)   params = params.set('bureauId', filters.bureauId);
    if (filters.dateFrom)   params = params.set('dateFrom', filters.dateFrom);
    if (filters.dateTo)     params = params.set('dateTo', filters.dateTo);
    if (filters.page)       params = params.set('page', filters.page);
    if (filters.limit)      params = params.set('limit', filters.limit ?? 50);
    return this.http.get<ActivityLogPage>(this.base, { params });
  }

  getEntityHistory(entityType: string, entityId: number): Observable<ActivityLogEntry[]> {
    return this.http.get<ActivityLogEntry[]>(`${this.base}/entity/${entityType}/${entityId}`);
  }
}
