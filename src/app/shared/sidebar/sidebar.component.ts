import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../services/auth.service';
import { TranslationService } from '../../services/translation.service';
import { CompanyService } from '../../services/company.service';
import { filter } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

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
  logoUrl: string | null = null;
  companyName = 'AGOCAR';

  bureaux: { id: number; nom: string }[] = [];
  currentBureauId: number | null = null;

  readonly ALL_ROLES = ['ROLE_ADMIN', 'ROLE_MANAGER', 'ROLE_STAFF'];

  menuGroups: {
    labelKey: string;
    items: { link: string; icon: string; key: string; badge?: string | number; roles?: string[] }[];
  }[] = [
    {
      labelKey: 'groupOrganisation',
      items: [
        { link: '/dashboard', icon: '📊', key: 'dashboard' },
        { link: '/calendar',  icon: '📅', key: 'calendar' },
        { link: '/bureau',    icon: '🏢', key: 'bureaus', roles: ['ROLE_ADMIN','ROLE_MANAGER','ROLE_STAFF'] },
      ]
    },
    {
      labelKey: 'groupFleet',
      items: [
        { link: '/voiture',              icon: '🚗', key: 'myCars' },
        { link: '/compliance',           icon: '⏰', key: 'compliance' },
        { link: '/compliance-center',    icon: '⚡', key: 'complianceCenterNav', roles: ['ROLE_ADMIN','ROLE_MANAGER'] },
        { link: '/fleet-health',         icon: '❤️', key: 'fleetHealth',       roles: ['ROLE_ADMIN','ROLE_MANAGER'] },
        { link: '/maintenance/planning', icon: '📋', key: 'maintenancePlanning', roles: ['ROLE_ADMIN','ROLE_MANAGER'] },
      ]
    },
    {
      labelKey: 'groupRentals',
      items: [
        { link: '/client',            icon: '👤', key: 'clients',           roles: ['ROLE_ADMIN','ROLE_MANAGER','ROLE_STAFF'] },
        { link: '/location/new',      icon: '➕', key: 'createBooking',     roles: ['ROLE_ADMIN','ROLE_MANAGER','ROLE_STAFF'] },
        { link: '/reservation',       icon: '📅', key: 'reservations',      roles: ['ROLE_ADMIN','ROLE_MANAGER','ROLE_STAFF'], badge: '!' },
        { link: '/contrat',           icon: '📄', key: 'contrats',          roles: ['ROLE_ADMIN','ROLE_MANAGER','ROLE_STAFF'] },
        { link: '/return-inspection', icon: '🔍', key: 'returnInspections', roles: ['ROLE_ADMIN','ROLE_MANAGER','ROLE_STAFF'] },
      ]
    },
    {
      labelKey: 'groupFinance',
      items: [
        { link: '/paiement',                       icon: '💳', key: 'paiements',           roles: ['ROLE_ADMIN','ROLE_MANAGER'] },
        { link: '/paiement-client',                icon: '💰', key: 'clientPayments',      roles: ['ROLE_ADMIN','ROLE_MANAGER'] },
        { link: '/vehicle-expenses',               icon: '🚗', key: 'vehicleExpenses',     roles: ['ROLE_ADMIN','ROLE_MANAGER'] },
        { link: '/bureau-expenses',                icon: '🏢', key: 'bureauExpenses',      roles: ['ROLE_ADMIN','ROLE_MANAGER'] },
        { link: '/credit',                         icon: '📈', key: 'credits',             roles: ['ROLE_ADMIN','ROLE_MANAGER'] },
        { link: '/credit-monitoring',              icon: '💳', key: 'creditMonitoring',    roles: ['ROLE_ADMIN','ROLE_MANAGER'] },
        { link: '/infraction',                     icon: '⚠️', key: 'infractions',         roles: ['ROLE_ADMIN','ROLE_MANAGER'], badge: '⚠' },
        { link: '/achat-voiture',                  icon: '🛒', key: 'carPurchases',        roles: ['ROLE_ADMIN','ROLE_MANAGER'] },
        { link: '/vente',                          icon: '🏷️', key: 'ventes',              roles: ['ROLE_ADMIN','ROLE_MANAGER'] },
        { link: '/fournisseur',                    icon: '🏭', key: 'suppliers',           roles: ['ROLE_ADMIN','ROLE_MANAGER'] },
        { link: '/mensualite',                     icon: '📆', key: 'monthlyPayments',     roles: ['ROLE_ADMIN','ROLE_MANAGER'] },
        { link: '/vehicle-financing',              icon: '🏦', key: 'financingDashboard',  roles: ['ROLE_ADMIN','ROLE_MANAGER'] },
        { link: '/vehicle-financing/contracts',    icon: '📄', key: 'financingContracts',  roles: ['ROLE_ADMIN','ROLE_MANAGER'] },
        { link: '/vehicle-financing/create',       icon: '➕', key: 'financingNewContract', roles: ['ROLE_ADMIN','ROLE_MANAGER'] },
        { link: '/vehicle-financing/institutions', icon: '🏛️', key: 'financingInstitutions', roles: ['ROLE_ADMIN','ROLE_MANAGER'] },
      ]
    },
    {
      labelKey: 'groupAnalytics',
      items: [
        { link: '/executive',              icon: '👑', key: 'executiveDashboard',  roles: ['ROLE_ADMIN','ROLE_MANAGER'] },
        { link: '/rapports/fleet',         icon: '📋', key: 'fleetReports',        roles: ['ROLE_ADMIN','ROLE_MANAGER'] },
        { link: '/rapports/financial',     icon: '💹', key: 'financialReports',    roles: ['ROLE_ADMIN','ROLE_MANAGER'] },
        { link: '/rapports/profitability', icon: '📊', key: 'vehicleProfitability', roles: ['ROLE_ADMIN','ROLE_MANAGER'] },
        { link: '/rapports/maintenance',   icon: '🔧', key: 'maintenanceReports',  roles: ['ROLE_ADMIN','ROLE_MANAGER'] },
        { link: '/rapports/clients',       icon: '👥', key: 'customerAnalytics',   roles: ['ROLE_ADMIN','ROLE_MANAGER'] },
        { link: '/rapports/branches',      icon: '🏢', key: 'branchReport',        roles: ['ROLE_ADMIN','ROLE_MANAGER'] },
        { link: '/rapports/forecast',      icon: '🔮', key: 'forecastReport',      roles: ['ROLE_ADMIN','ROLE_MANAGER'] },
      ]
    },
    {
      labelKey: 'groupAdmin',
      items: [
        { link: '/utilisateur',                  icon: '👥', key: 'usersRoles',        roles: ['ROLE_ADMIN'] },
        { link: '/company',                      icon: '🏢', key: 'companies',         roles: ['ROLE_ADMIN','ROLE_MANAGER','ROLE_STAFF'] },
        { link: '/parametres',                   icon: '⚙️', key: 'companySettings',   roles: ['ROLE_ADMIN'] },
        { link: '/settings/parametres-societe',  icon: '🏷️', key: 'parametresSociete', roles: ['ROLE_ADMIN'] },
        { link: '/settings/conditions-contrat',  icon: '📝', key: 'conditionsContrat', roles: ['ROLE_ADMIN'] },
        { link: '/activity-log',                 icon: '📋', key: 'activityLog',       roles: ['ROLE_ADMIN'] },
        { link: '/email-log',                    icon: '📧', key: 'emailHistory',      roles: ['ROLE_ADMIN'] },
        { link: '/accessoire',                   icon: '🔧', key: 'accessoires' },
        { link: '/notifications',                icon: '🔔', key: 'notificationsNav' },
        { link: '/profile',                      icon: '👤', key: 'myProfile' },
      ]
    },
  ];

  constructor(
    private authService: AuthService,
    public router: Router,
    private translationService: TranslationService,
    private companyService: CompanyService,
    private http: HttpClient,
  ) {}

  ngOnInit() {
    this.translationService.currentLang$.subscribe(lang => {
      this.currentLang = lang;
    });

    this.translationService.direction$.subscribe(dir => {
      this.dir = dir;
    });

    this.companyService.logo$.subscribe(url => {
      this.logoUrl = url || null;
    });

    this.companyService.companyName$.subscribe(name => {
      this.companyName = name;
    });

    this.companyService.bureauId$.subscribe(id => {
      this.currentBureauId = id;
    });

    this.companyService.bureaux$.subscribe(list => {
      this.bureaux = list;
    });

    if (this.companyService.getBureaux().length === 0) {
      this.http.get<any>(`${environment.apiUrl}/bureau`).subscribe({
        next: (res) => {
          const list = Array.isArray(res) ? res : (res?.data ?? []);
          this.companyService.setBureaux(list.map((b: any) => ({ id: b.id, nom: b.nom })));
        }
      });
    }

    this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe(() => this.closeSidebar.emit());
  }

  onBureauSwitch(event: Event) {
    const id = +(event.target as HTMLSelectElement).value;
    this.companyService.setCurrentBureau(id);
    this.http.get<any>(`${environment.apiUrl}/parametres/${id}`).subscribe({
      next: (data) => {
        this.companyService.setCompanyName(data.companyName || 'AGOCAR');
        this.companyService.setLogo(data.logo || null);
        window.location.href = '/dashboard';
      },
      error: () => {
        window.location.href = '/dashboard';
      }
    });
  }

  canSee(roles?: string[]): boolean {
    if (!roles || roles.length === 0) return true;
    const userRoles = this.authService.getRoles();
    return roles.some(r => userRoles.includes(r));
  }

  hasVisibleItems(group: { items: { roles?: string[] }[] }): boolean {
    return group.items.some(item => this.canSee(item.roles));
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
