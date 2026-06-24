import { Injectable, OnDestroy } from '@angular/core';
import { HttpClient, HttpContext } from '@angular/common/http';
import { BehaviorSubject, Observable, Subscription, interval } from 'rxjs';
import { switchMap, catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { environment } from '../../environments/environment';
import { SKIP_AUTH_REDIRECT } from '../interceptors/jwt.interceptor';
import { AuthService } from './auth.service';

export type NotificationPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type NotificationTab = 'all' | 'unread' | 'critical' | 'warnings';

export interface AppNotification {
  id: number;
  title: string;
  message: string;
  type: string;
  priority: NotificationPriority;
  deepLink: string | null;
  sourceType: string;
  sourceId: number;
  readAt: string | null;
  createdAt: string;
  isRead: boolean;
}

@Injectable({ providedIn: 'root' })
export class NotificationService implements OnDestroy {
  private readonly base = `${environment.apiUrl}/notification`;
  private unreadCount$ = new BehaviorSubject<number>(0);
  private pollSub?: Subscription;

  readonly unreadCount = this.unreadCount$.asObservable();

  constructor(private http: HttpClient, private auth: AuthService) {}

  // Called from TopHeaderComponent.ngOnInit — starts 30s polling for unread count.
  startSSE(): void {
    if (this.pollSub) return;
    this.startPolling(30_000);
  }

  stopSSE(): void {
    this.stopPolling();
  }

  // ── polling ───────────────────────────────────────────────────────────────

  startPolling(intervalMs = 30_000): void {
    this.stopPolling();
    this.refreshCount();
    this.pollSub = interval(intervalMs)
      .pipe(switchMap(() => this.fetchCount()))
      .subscribe({ next: n => this.unreadCount$.next(n), error: () => {} });
  }

  stopPolling(): void {
    this.pollSub?.unsubscribe();
    this.pollSub = undefined;
  }

  refreshCount(): void {
    this.fetchCount().subscribe({ next: n => this.unreadCount$.next(n), error: () => {} });
  }

  // ── data methods ──────────────────────────────────────────────────────────

  getNotifications(limit = 100, tab: NotificationTab = 'all'): Observable<AppNotification[]> {
    return this.http.get<AppNotification[]>(`${this.base}?limit=${limit}&tab=${tab}`).pipe(
      catchError(() => of([] as AppNotification[]))
    );
  }

  markRead(id: number): Observable<any> {
    return this.http.put(`${this.base}/${id}/read`, {});
  }

  markAllRead(): Observable<any> {
    return this.http.put(`${this.base}/read-all`, {});
  }

  private fetchCount(): Observable<number> {
    if (!this.auth.isAuthenticated()) return of(0);
    const ctx = new HttpContext().set(SKIP_AUTH_REDIRECT, true);
    return this.http.get<{ count: number }>(`${this.base}/unread-count`, { context: ctx }).pipe(
      switchMap(r => of(r.count)),
      catchError(() => of(0))
    );
  }

  ngOnDestroy(): void {
    this.stopPolling();
  }
}
