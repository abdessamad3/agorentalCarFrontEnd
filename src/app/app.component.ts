import { Component, HostListener, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { RouterOutlet, Router, NavigationStart, NavigationEnd, NavigationCancel, NavigationError } from '@angular/router';
import { SidebarComponent } from './shared/sidebar/sidebar.component';
import { TopHeaderComponent } from './shared/top-header/top-header.component';
import { TranslationService } from './services/translation.service';
import { ToastComponent } from './shared/toast/toast.component';
import { BreadcrumbComponent } from './shared/breadcrumb/breadcrumb.component';
import { AuthService } from './services/auth.service';
import { ActivityTrackerService } from './services/activity-tracker.service';
import { CompanyService } from './services/company.service';
import { environment } from '../environments/environment';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, SidebarComponent, TopHeaderComponent, ToastComponent, BreadcrumbComponent],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  isSidebarOpen = false;
  dir = 'ltr';
  showShell = false;
  routerLoading = false;

  private authRoutes = ['/login', '/register'];

  constructor(
    private translationService: TranslationService,
    private router: Router,
    private http: HttpClient,
    private authService: AuthService,
    private activityTracker: ActivityTrackerService,
    private companyService: CompanyService,
  ) {
    this.translationService.direction$.subscribe(dir => {
      this.dir = dir;
      document.documentElement.setAttribute('dir', dir);
    });
  }

  ngOnInit() {
    if (this.authService.isAuthenticated()) {
      this.syncCompanyBranding();
      this.activityTracker.start();
    }

    this.router.events.subscribe(e => {
      if (e instanceof NavigationStart) {
        this.routerLoading = true;
      } else if (e instanceof NavigationEnd) {
        this.routerLoading = false;
        const wasShown = this.showShell;
        this.showShell = !this.authRoutes.some(r => e.urlAfterRedirects.startsWith(r))
                       && !e.urlAfterRedirects.endsWith('/print');
        if (!this.showShell) this.isSidebarOpen = false;
        if (this.showShell && !wasShown) {
          this.syncCompanyBranding();
          this.activityTracker.start();
        }
      } else if (e instanceof NavigationCancel || e instanceof NavigationError) {
        this.routerLoading = false;
      }
    });
  }

  /**
   * Branding (name/logo) reflects whichever company owns the active bureau —
   * this is a multi-company platform, so there's no single global identity.
   * Refresh the bureau list (with each one's company) on every fresh session
   * so branding never relies on stale cached data.
   * Bureau locking is separate: only managers/staff are pinned to one bureau
   * (via their user), fetched from /auth/me since the admin may have assigned
   * the bureau after this user's session/token was already created. Admins
   * pick their own bureau via the sidebar switcher — never touched here.
   */
  private syncCompanyBranding(): void {
    this.companyService.refreshBureaux();

    if (!this.authService.hasAnyRole('ROLE_MANAGER', 'ROLE_STAFF')) return;

    this.http.get<any>(`${environment.apiUrl}/auth/me`).subscribe({
      next: (res) => {
        const me = res?.data ?? res;
        if (me?.bureau != null) this.companyService.setCurrentBureau(me.bureau);
      },
      error: () => {}
    });
  }

  toggleSidebar() {
    this.isSidebarOpen = !this.isSidebarOpen;
  }

  closeSidebar() {
    this.isSidebarOpen = false;
  }

  @HostListener('document:keydown.escape')
  onEscapeKey() {
    if (this.isSidebarOpen) this.closeSidebar();
  }
}
