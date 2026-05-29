import { Component, HostListener, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { SidebarComponent } from './shared/sidebar/sidebar.component';
import { TopHeaderComponent } from './shared/top-header/top-header.component';
import { TranslationService } from './services/translation.service';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, SidebarComponent, TopHeaderComponent],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  isSidebarOpen = false;
  dir = 'ltr';
  showShell = false;

  private authRoutes = ['/login', '/register'];

  constructor(
    private translationService: TranslationService,
    private router: Router
  ) {
    this.translationService.direction$.subscribe(dir => {
      this.dir = dir;
      document.documentElement.setAttribute('dir', dir);
    });
  }

  ngOnInit() {
    this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe((e: any) => {
        this.showShell = !this.authRoutes.some(r => e.urlAfterRedirects.startsWith(r));
        if (!this.showShell) this.isSidebarOpen = false;
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
