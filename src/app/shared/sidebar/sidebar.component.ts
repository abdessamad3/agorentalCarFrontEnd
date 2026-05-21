import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { TranslationService } from '../../services/translation.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css']
})
export class SidebarComponent {
  @Input() isSidebarOpen: boolean = false;
  @Output() closeSidebar = new EventEmitter<void>();

  currentLang = 'en';
  dir = 'ltr';

  // Minimal Menu (Only Voiture)
  menuItems = [
    { link: '/voiture', icon: '🚗', key: 'myCars' }
  ];

  constructor(
    private authService: AuthService,
    private router: Router,
    private translationService: TranslationService
  ) {
    this.translationService.currentLang$.subscribe(lang => {
      this.currentLang = lang;
      this.dir = this.translationService.getDirection();
    });
  }

  getLabel(key: string): string {
    return this.translationService.translate(key);
  }

  changeLanguage(lang: string): void {
    this.translationService.setLanguage(lang);
  }

  onClose() {
    this.closeSidebar.emit();
  }

  onLogout(): void {
    this.authService.logout();
  }
}
