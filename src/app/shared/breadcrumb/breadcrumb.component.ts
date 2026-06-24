import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-breadcrumb',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <nav class="g-breadcrumb" *ngIf="crumbs.length > 0">
      <a routerLink="/dashboard" class="bc-home">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
        Dashboard
      </a>
      <ng-container *ngFor="let crumb of crumbs; let last = last">
        <svg class="bc-arrow" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
        <span [class.bc-current]="last" class="bc-item">{{ crumb }}</span>
      </ng-container>
    </nav>
  `,
  styles: [`
    .g-breadcrumb {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      padding: 0.55rem 1.5rem;
      background: #fff;
      border-bottom: 1px solid #e2e8f0;
      font-size: 0.8rem;
      color: #718096;
    }
    .bc-home {
      display: inline-flex;
      align-items: center;
      gap: 0.3rem;
      color: #3182ce;
      text-decoration: none;
      font-weight: 600;
      transition: color 0.15s;
      white-space: nowrap;
    }
    .bc-home:hover { color: #2c5282; }
    .bc-arrow { color: #cbd5e0; flex-shrink: 0; }
    .bc-item { color: #718096; white-space: nowrap; }
    .bc-current { color: #2d3748; font-weight: 600; }
  `]
})
export class BreadcrumbComponent implements OnInit {
  crumbs: string[] = [];

  constructor(private router: Router, private activatedRoute: ActivatedRoute) {}

  ngOnInit() {
    this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe(() => this.buildCrumbs());
    this.buildCrumbs();
  }

  private buildCrumbs() {
    let route = this.activatedRoute.root;
    while (route.firstChild) route = route.firstChild;
    this.crumbs = route.snapshot.data['breadcrumbs'] ?? [];
  }
}
