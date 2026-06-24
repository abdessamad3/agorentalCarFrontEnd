import { Injectable, NgZone } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService, INACTIVITY_LIMIT } from './auth.service';

/** Don't write to localStorage / reschedule the idle timer on every single mousemove —
 *  only once per this interval, which is plenty granular for a 24h window. */
const THROTTLE_MS = 30_000;

const ACTIVITY_EVENTS = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'] as const;

/**
 * Logs the user out after INACTIVITY_LIMIT (24h) with:
 *  - real user-input activity (mouse/keyboard/click/scroll), not just API calls
 *  - a proactive timer that fires the logout even if the tab sits idle with zero
 *    interactions/requests, instead of only checking reactively on the next action
 *  - cross-tab sync via the `storage` event, so activity in one tab resets the clock in all tabs
 */
@Injectable({ providedIn: 'root' })
export class ActivityTrackerService {
  private started = false;
  private lastThrottledUpdate = 0;
  private idleTimer: ReturnType<typeof setTimeout> | null = null;

  private readonly onActivity = () => this.handleActivity();
  private readonly onStorage = (e: StorageEvent) => {
    if (e.key === 'last_activity') this.scheduleIdleCheck();
  };

  constructor(private auth: AuthService, private router: Router, private zone: NgZone) {
    this.auth.loggedOut$.subscribe(() => this.stop());
  }

  start(): void {
    if (this.started || !this.auth.getToken()) return;
    this.started = true;
    this.zone.runOutsideAngular(() => {
      ACTIVITY_EVENTS.forEach(evt => document.addEventListener(evt, this.onActivity, { passive: true }));
      window.addEventListener('storage', this.onStorage);
    });
    this.scheduleIdleCheck();
  }

  stop(): void {
    if (!this.started) return;
    this.started = false;
    ACTIVITY_EVENTS.forEach(evt => document.removeEventListener(evt, this.onActivity));
    window.removeEventListener('storage', this.onStorage);
    if (this.idleTimer) { clearTimeout(this.idleTimer); this.idleTimer = null; }
  }

  private handleActivity(): void {
    if (!this.auth.getToken()) { this.stop(); return; }
    const now = Date.now();
    if (now - this.lastThrottledUpdate < THROTTLE_MS) return;
    this.lastThrottledUpdate = now;
    this.auth.updateActivity();
    this.scheduleIdleCheck();
  }

  private scheduleIdleCheck(): void {
    if (this.idleTimer) clearTimeout(this.idleTimer);
    const last = this.auth.getLastActivity();
    const remaining = last !== null ? (last + INACTIVITY_LIMIT) - Date.now() : INACTIVITY_LIMIT;
    this.idleTimer = setTimeout(() => this.checkIdle(), Math.max(remaining, 1_000));
  }

  private checkIdle(): void {
    if (!this.auth.getToken()) { this.stop(); return; }
    if (this.auth.isSessionExpired()) {
      this.zone.run(() => {
        this.auth.logout();
        this.router.navigate(['/login']);
      });
    } else {
      // Activity happened (e.g. in another tab) since this check was scheduled — reschedule.
      this.scheduleIdleCheck();
    }
  }
}
