import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { TranslationService } from '../../services/translation.service';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css']
})
export class SidebarComponent implements OnInit {
  @Input() isSidebarOpen = false;
  @Output() closeSidebar = new EventEmitter<void>();

  currentLang = 'en';
  dir = 'ltr';

  menuGroups = [
    {
      labelKey: '',
      items: [
        { link: '/dashboard', icon: '📊', key: 'dashboard' },
        { link: '/calendar',  icon: '🗓️', key: 'calendar' },
        { link: '/voiture',   icon: '🚗', key: 'myCars' },
        { link: '/vente',     icon: '🏷️', key: 'ventes' },
        { link: '/bureau',    icon: '🏢', key: 'bureaus' },
      ]
    },
    {
      labelKey: 'groupOperations',
      items: [
        { link: '/client',              icon: '👤', key: 'clients' },
        { link: '/reservation',         icon: '📅', key: 'reservations' },
        { link: '/reservation/create',  icon: '➕', key: 'createBooking' },
        { link: '/contrat',             icon: '📄', key: 'contrats' },
        { link: '/paiement',            icon: '💳', key: 'paiements' },
        { link: '/paiement-client',     icon: '💰', key: 'clientPayments' },
      ]
    },
    {
      labelKey: 'groupMaintenance',
      items: [
        { link: '/reparation',      icon: '🔧', key: 'reparations' },
        { link: '/vidange',         icon: '🛢️', key: 'vidanges' },
        { link: '/adblue',          icon: '💧', key: 'adblue' },
        { link: '/assurance',       icon: '🛡️', key: 'assurances' },
        { link: '/suivi-technique', icon: '🔍', key: 'suiviTechnique' },
        { link: '/vignette',        icon: '🏷️', key: 'vignettes' },
      ]
    },
    {
      labelKey: 'groupFinance',
      items: [
        { link: '/depense',    icon: '📉', key: 'depenses' },
        { link: '/credit',     icon: '📈', key: 'credits' },
        { link: '/infraction', icon: '⚠️', key: 'infractions' },
      ]
    },
    {
      labelKey: 'groupPurchases',
      items: [
        { link: '/achat-voiture', icon: '🛒', key: 'carPurchases' },
        { link: '/fournisseur',   icon: '🏭', key: 'suppliers' },
        { link: '/mensualite',    icon: '📆', key: 'monthlyPayments' },
      ]
    },
    {
      labelKey: 'groupAdmin',
      items: [
        { link: '/accessoire',  icon: '🧩', key: 'accessoires' },
        { link: '/utilisateur', icon: '👥', key: 'utilisateurs' },
      ]
    },
  ];

  constructor(
    private authService: AuthService,
    public router: Router,
    private translationService: TranslationService
  ) {}

  ngOnInit() {
    this.translationService.currentLang$.subscribe(lang => {
      this.currentLang = lang;
    });

    this.translationService.direction$.subscribe(dir => {
      this.dir = dir;
    });

    this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe(() => this.closeSidebar.emit());
  }

  getLabel(key: string): string {
    return this.translationService.translate(key);
  }

  changeLanguage(lang: string): void {
    this.translationService.setLanguage(lang);
  }

  onNavClick(): void {
    this.closeSidebar.emit();
  }

  onLogout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
