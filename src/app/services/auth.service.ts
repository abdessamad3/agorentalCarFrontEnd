import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, Subject } from 'rxjs';
import { tap, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export const INACTIVITY_LIMIT = 24 * 60 * 60 * 1000;
const LAST_ACTIVITY_KEY = 'last_activity';
const REFRESH_TOKEN_KEY = 'refresh_token';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = environment.apiUrl;

  /** Emits true when a token refresh is in flight so interceptors can queue. */
  readonly refreshing$ = new BehaviorSubject<boolean>(false);

  /** Fires on every logout (manual, expired token, expired session) so other services (e.g. the
   *  idle-activity tracker) can react without AuthService needing to know about them. */
  private readonly loggedOutSource = new Subject<void>();
  readonly loggedOut$ = this.loggedOutSource.asObservable();

  constructor(private http: HttpClient) {
    const storedToken = localStorage.getItem('auth_token');
    if (storedToken && this.isSessionExpired()) {
      this.logout();
    }
  }

  register(email: string, password: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/auth/register`, { email, password });
  }

  login(email: string, password: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/auth/login`, { email, password }).pipe(
      tap((response: any) => {
        const data = response?.data ?? response;
        if (data.token) {
          localStorage.setItem('auth_token', data.token);
          this.updateActivity();
          if (data.refreshToken) {
            localStorage.setItem(REFRESH_TOKEN_KEY, data.refreshToken);
          }
          if (data.user) {
            localStorage.setItem('autoloc_user', JSON.stringify(data.user));
          }
        }
      })
    );
  }

  /** Exchange the stored refresh token for a new access + refresh token pair. */
  refreshAccessToken(): Observable<string> {
    const refreshToken = this.getRefreshToken();
    return this.http.post<any>(`${this.apiUrl}/auth/refresh`, { refreshToken }).pipe(
      map((response: any) => {
        const data = response?.data ?? response;
        localStorage.setItem('auth_token', data.token);
        if (data.refreshToken) {
          localStorage.setItem(REFRESH_TOKEN_KEY, data.refreshToken);
        }
        this.updateActivity();
        return data.token as string;
      })
    );
  }

  updateActivity(): void {
    localStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString());
  }

  /** Timestamp (ms) of the last recorded activity, or null if none has been recorded yet. */
  getLastActivity(): number | null {
    const last = localStorage.getItem(LAST_ACTIVITY_KEY);
    return last ? parseInt(last, 10) : null;
  }

  isSessionExpired(): boolean {
    const last = localStorage.getItem(LAST_ACTIVITY_KEY);
    if (!last) return false;
    return Date.now() - parseInt(last, 10) > INACTIVITY_LIMIT;
  }

  getToken(): string | null {
    return localStorage.getItem('auth_token');
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  }

  isAuthenticated(): boolean {
    const token = this.getToken();
    if (!token) return false;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (payload.exp && Date.now() >= payload.exp * 1000) {
        // The access token's own short TTL (1h, set server-side) has lapsed — that's expected
        // and NOT a logout signal by itself: the jwt interceptor silently refreshes it via the
        // refresh token (valid 30 days) on the next request. Only the 24h *inactivity* window
        // (isSessionExpired) should actually end the session. Logging out here too meant users
        // got force-logged-out every ~1h regardless of how recently they'd been active.
        return !!this.getRefreshToken();
      }
    } catch {
      this.logout();
      return false;
    }
    return true;
  }

  /** Roles come from the JWT payload — never from localStorage (tamper-safe). */
  getRoles(): string[] {
    const token = this.getToken();
    if (!token) return [];
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return (payload.roles as string[]) ?? [];
    } catch {
      return [];
    }
  }

  hasRole(role: string): boolean {
    return this.getRoles().includes(role);
  }

  hasAnyRole(...roles: string[]): boolean {
    const userRoles = this.getRoles();
    return roles.some(r => userRoles.includes(r));
  }

  getStoredUser(): any {
    const raw = localStorage.getItem('autoloc_user');
    try {
      const user = raw ? JSON.parse(raw) : null;
      if (user) {
        // Always override roles with JWT payload — localStorage roles are cosmetic only
        user.roles = this.getRoles();
      }
      return user;
    } catch {
      return null;
    }
  }

  mustChangePassword(): boolean {
    return !!this.getStoredUser()?.mustChangePassword;
  }

  /** Returns the current user's saved signature blob, or null if not set. */
  getMySignature(): Observable<string | null> {
    return this.http.get<any>(`${this.apiUrl}/auth/me`).pipe(
      map((r: any) => (r?.data ?? r)?.signatureBlob ?? null)
    );
  }

  clearMustChangePassword(): void {
    const user = localStorage.getItem('autoloc_user');
    if (user) {
      try {
        const parsed = JSON.parse(user);
        parsed.mustChangePassword = false;
        localStorage.setItem('autoloc_user', JSON.stringify(parsed));
      } catch { /* ignore */ }
    }
  }

  logout(): void {
    const refreshToken = this.getRefreshToken();
    // Clear tokens FIRST so the fire-and-forget logout request doesn't carry expired credentials
    localStorage.removeItem('auth_token');
    localStorage.removeItem('autoloc_user');
    localStorage.removeItem(LAST_ACTIVITY_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    if (refreshToken) {
      this.http.post(`${this.apiUrl}/auth/logout`, { refreshToken }).subscribe({ error: () => {} });
    }
    this.loggedOutSource.next();
  }
}
