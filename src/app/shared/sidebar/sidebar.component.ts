import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { TranslationService } from '../../services/translation.service';
import { CompanyService } from '../../services/company.service';
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
  @Output() collapsedChange = new EventEmitter<boolean>();

  dir = 'ltr';
  logoUrl: string | null = null;
  companyName = 'AGOCAR';

  bureaux: { id: number; nom: string }[] = [];
  currentBureauId: number | null = null;

  /** Accordion: only one group's items are visible at a time, whichever contains
   *  the current route (auto-expanded on navigation) or was last clicked open. */
  expandedGroup: string | null = null;

  /** Desktop-only icon-rail mode, remembered across sessions. Mobile always ignores
   *  this (the sidebar there is a full show/hide overlay, not a width toggle). */
  collapsed = false;
  private readonly COLLAPSED_STORAGE_KEY = 'sidebar_collapsed';

  readonly ALL_ROLES = ['ROLE_ADMIN', 'ROLE_MANAGER', 'ROLE_STAFF'];

  menuGroups: {
    labelKey: string;
    icon: string;
    items: { link: string; icon: string; key: string; badge?: string | number; roles?: string[] }[];
  }[] = [
    {
      labelKey: 'groupOrganisation',
      icon: '📊',
      items: [
        { link: '/dashboard', icon: '📊', key: 'dashboard' },
        { link: '/bureau',    icon: '🏢', key: 'bureaus', roles: ['ROLE_ADMIN','ROLE_MANAGER','ROLE_STAFF'] },
      ]
    },
    {
      labelKey: 'groupFleet',
      icon: '🚗',
      items: [
        { link: '/voiture',              icon: '🚗', key: 'myCars' },
        { link: '/inspection-demo',      icon: '🔍', key: 'inspection3D',        roles: ['ROLE_ADMIN'] },
        { link: '/compliance',           icon: '⏰', key: 'compliance',          roles: ['ROLE_ADMIN'] },
        { link: '/compliance-center',    icon: '⚡', key: 'complianceCenterNav', roles: ['ROLE_ADMIN'] },
        { link: '/fleet-health',         icon: '❤️', key: 'fleetHealth',        roles: ['ROLE_ADMIN'] },
        { link: '/maintenance/planning', icon: '📋', key: 'maintenancePlanning', roles: ['ROLE_ADMIN'] },
      ]
    },
    {
      labelKey: 'groupRentals',
      icon: '📅',
      items: [
        { link: '/client',             icon: '👤', key: 'clients',           roles: ['ROLE_ADMIN','ROLE_MANAGER','ROLE_STAFF'] },
        { link: '/client-debts',       icon: '💸', key: 'clientDebtors',     roles: ['ROLE_ADMIN','ROLE_MANAGER'] },
        { link: '/location/new',      icon: '➕', key: 'createBooking',     roles: ['ROLE_ADMIN'] },
        { link: '/reservation',       icon: '📅', key: 'reservations',      roles: ['ROLE_ADMIN','ROLE_MANAGER','ROLE_STAFF'], badge: '!' },
        { link: '/contrat',           icon: '📄', key: 'contrats',          roles: ['ROLE_ADMIN'] },
        { link: '/return-inspection', icon: '🔍', key: 'returnInspections', roles: ['ROLE_ADMIN'] },
      ]
    },
    {
      labelKey: 'groupFinance',
      icon: '💰',
      items: [
        { link: '/paiement',                       icon: '💳', key: 'paiements',            roles: ['ROLE_ADMIN'] },
        { link: '/paiement-client',                icon: '💰', key: 'clientPayments',       roles: ['ROLE_ADMIN'] },
        { link: '/vehicle-expenses',               icon: '🚗', key: 'vehicleExpenses',      roles: ['ROLE_ADMIN'] },
        { link: '/bureau-expenses',                icon: '🏢', key: 'bureauExpenses',       roles: ['ROLE_ADMIN','ROLE_MANAGER','ROLE_STAFF'] },
        { link: '/credit',                         icon: '📈', key: 'credits',              roles: ['ROLE_ADMIN'] },
        { link: '/credit-monitoring',              icon: '💳', key: 'creditMonitoring',     roles: ['ROLE_ADMIN'] },
        { link: '/infraction',                     icon: '⚠️', key: 'infractions',          roles: ['ROLE_ADMIN'], badge: '⚠' },
        { link: '/achat-voiture',                  icon: '🛒', key: 'carPurchases',         roles: ['ROLE_ADMIN'] },
        { link: '/vente',                          icon: '🏷️', key: 'ventes',               roles: ['ROLE_ADMIN'] },
        { link: '/fournisseur',                    icon: '🏭', key: 'suppliers',            roles: ['ROLE_ADMIN'] },
        { link: '/mensualite',                     icon: '📆', key: 'monthlyPayments',      roles: ['ROLE_ADMIN'] },
        { link: '/vehicle-financing',              icon: '🏦', key: 'financingDashboard',   roles: ['ROLE_ADMIN'] },
        { link: '/vehicle-financing/contracts',    icon: '📄', key: 'financingContracts',   roles: ['ROLE_ADMIN'] },
        { link: '/vehicle-financing/create',       icon: '➕', key: 'financingNewContract',  roles: ['ROLE_ADMIN'] },
        { link: '/vehicle-financing/institutions', icon: '🏛️', key: 'financingInstitutions', roles: ['ROLE_ADMIN'] },
      ]
    },
    {
      labelKey: 'groupAnalytics',
      icon: '📈',
      items: [
        { link: '/executive',              icon: '👑', key: 'executiveDashboard',  roles: ['ROLE_ADMIN','ROLE_MANAGER'] },
        { link: '/rapports/fleet',         icon: '📋', key: 'fleetReports',        roles: ['ROLE_ADMIN','ROLE_MANAGER'] },
        { link: '/rapports/financial',     icon: '💹', key: 'financialReports',    roles: ['ROLE_ADMIN','ROLE_MANAGER'] },
        { link: '/rapports/profitability', icon: '📊', key: 'vehicleProfitability', roles: ['ROLE_ADMIN'] },
        { link: '/rapports/maintenance',   icon: '🔧', key: 'maintenanceReports',  roles: ['ROLE_ADMIN','ROLE_MANAGER'] },
        { link: '/rapports/clients',       icon: '👥', key: 'customerAnalytics',   roles: ['ROLE_ADMIN','ROLE_MANAGER'] },
        { link: '/rapports/branches',      icon: '🏢', key: 'branchReport',        roles: ['ROLE_ADMIN','ROLE_MANAGER'] },
        { link: '/rapports/forecast',      icon: '🔮', key: 'forecastReport',      roles: ['ROLE_ADMIN'] },
      ]
    },
    {
      labelKey: 'groupAdmin',
      icon: '⚙️',
      items: [
        { link: '/utilisateur',                  icon: '👥', key: 'usersRoles',        roles: ['ROLE_ADMIN'] },
        { link: '/company',                      icon: '🏢', key: 'companies',         roles: ['ROLE_ADMIN'] },
        { link: '/parametres',                   icon: '⚙️', key: 'companySettings',   roles: ['ROLE_ADMIN'] },
        { link: '/settings/parametres-societe',  icon: '🏷️', key: 'parametresSociete', roles: ['ROLE_ADMIN'] },
        { link: '/settings/conditions-contrat',  icon: '📝', key: 'conditionsContrat', roles: ['ROLE_ADMIN'] },
        { link: '/activity-log',                 icon: '📋', key: 'activityLog',       roles: ['ROLE_ADMIN'] },
        { link: '/error-log',                    icon: '🚨', key: 'errorLog',          roles: ['ROLE_ADMIN'] },
        { link: '/email-log',                    icon: '📧', key: 'emailHistory',      roles: ['ROLE_ADMIN'] },
        { link: '/accessoire',                   icon: '🔧', key: 'accessoires' },
        { link: '/tarif-saisonnier',             icon: '📅', key: 'seasonalRates',     roles: ['ROLE_ADMIN', 'ROLE_MANAGER'] },
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
  ) {}

  ngOnInit() {
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
      this.companyService.refreshBureaux();
    }

    try {
      this.collapsed = localStorage.getItem(this.COLLAPSED_STORAGE_KEY) === '1';
    } catch { /* ignore — defaults to expanded */ }
    this.collapsedChange.emit(this.collapsed);

    this.updateExpandedGroupFromRoute(this.router.url);

    this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe((e: any) => {
        this.closeSidebar.emit();
        this.updateExpandedGroupFromRoute(e.urlAfterRedirects);
      });
  }

  private updateExpandedGroupFromRoute(url: string): void {
    const path = url.split('#')[0].split('?')[0];
    const match = this.menuGroups.find(group =>
      group.items.some(item => path === item.link || path.startsWith(item.link + '/'))
    );
    if (match) this.expandedGroup = match.labelKey;
  }

  /** Clicking a group header: in icon-rail mode it first expands the whole sidebar
   *  (so there's room to actually see the items) and opens that group; otherwise
   *  it just toggles that group open/closed, accordion-style. */
  onGroupHeaderClick(labelKey: string): void {
    if (this.collapsed) {
      this.setCollapsed(false);
      this.expandedGroup = labelKey;
      return;
    }
    this.expandedGroup = this.expandedGroup === labelKey ? null : labelKey;
  }

  toggleCollapsed(): void {
    this.setCollapsed(!this.collapsed);
  }

  private setCollapsed(value: boolean): void {
    this.collapsed = value;
    try { localStorage.setItem(this.COLLAPSED_STORAGE_KEY, value ? '1' : '0'); } catch { /* ignore */ }
    this.collapsedChange.emit(value);
  }

  // Switching bureau re-derives branding from that bureau's company
  // (CompanyService.setCurrentBureau -> applyBrandingForCurrentBureau).
  onBureauSwitch(event: Event) {
    const id = +(event.target as HTMLSelectElement).value;
    this.companyService.setCurrentBureau(id);
    window.location.href = '/dashboard';
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

  onNavClick(): void {
    this.closeSidebar.emit();
  }

  onLogout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
