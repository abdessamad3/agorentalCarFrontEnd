import { Component, Output, EventEmitter, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, NavigationEnd, RouterModule } from '@angular/router';
import { TranslationService } from '../../services/translation.service';
import { CrudService } from '../../services/crud.service';
import { EventBusService } from '../../services/event-bus.service';
import { CompanyService } from '../../services/company.service';
import { AuthService } from '../../services/auth.service';
import { NotificationService, AppNotification } from '../../services/notification.service';
import { filter } from 'rxjs/operators';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-top-header',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './top-header.component.html',
  styleUrls: ['./top-header.component.css']
})
export class TopHeaderComponent implements OnInit, OnDestroy {
  @Output() menuToggle = new EventEmitter<void>();

  dir = 'ltr';
  currentLang = 'en';
  pageTitle = 'dashboard';
  companyName = 'AGOCAR';
  logoUrl: string | null = null;
  isAdmin = false;
  netProfit = 0;
  pendingAmount = 0;

  notifPanelOpen = false;
  notifications: AppNotification[] = [];
  unreadCount = 0;
  notifLoading = false;

  private subs: Subscription[] = [];

  private routeMap: Record<string, string> = {
    // Organisation
    '/dashboard':  'dashboard',
    '/calendar':   'calendar',
    '/bureau':     'bureaus',
    // Fleet
    '/voiture':             'myCars',
    '/assurance':           'assurances',
    '/vignette':            'vignettes',
    '/reparation':          'reparations',
    '/vidange':             'vidanges',
    '/adblue':              'adblue',
    '/suivi-technique':     'suiviTechnique',
    '/compliance-center':   'complianceCenterNav',
    '/compliance':          'compliance',
    '/fleet-health':        'fleetHealth',
    '/maintenance/planning':'maintenancePlanning',
    // Rentals
    '/client':              'clients',
    '/location/new':        'createBooking',
    '/location':            'locationDossier',
    '/reservation/create':  'createBooking',
    '/reservation':         'reservations',
    '/contrat':             'contrats',
    '/return-inspection':   'returnInspections',
    // Finance
    '/paiement-client':                'clientPayments',
    '/paiement':                       'paiements',
    '/vehicle-expenses':               'vehicleExpenses',
    '/bureau-expenses':                'bureauExpenses',
    '/depense':                        'depenses',
    '/credit-monitoring':              'creditMonitoring',
    '/credit':                         'credits',
    '/infraction':                     'infractions',
    '/achat-voiture':                  'carPurchases',
    '/vente':                          'ventes',
    '/fournisseur':                    'suppliers',
    '/mensualite':                     'monthlyPayments',
    '/vehicle-financing/contracts':    'financingContracts',
    '/vehicle-financing/create':       'financingNewContract',
    '/vehicle-financing/institutions': 'financingInstitutions',
    '/vehicle-financing':              'financingDashboard',
    // Analytics
    '/executive':              'executiveDashboard',
    '/rapports/fleet':         'fleetReports',
    '/rapports/financial':     'financialReports',
    '/rapports/profitability': 'vehicleProfitability',
    '/rapports/maintenance':   'maintenanceReports',
    '/rapports/clients':       'customerAnalytics',
    '/rapports/branches':      'branchReport',
    '/rapports/forecast':      'forecastReport',
    // Administration
    '/utilisateur':                  'utilisateurs',
    '/company':                      'companies',
    '/parametres':                   'companySettings',
    '/settings/parametres-societe':  'parametresSociete',
    '/settings/conditions-contrat':  'conditionsContrat',
    '/activity-log':                 'activityLog',
    '/email-log':                    'emailHistory',
    '/accessoire':                   'accessoires',
    '/notifications':                'notificationsNav',
  };

  constructor(
    private ts: TranslationService,
    public router: Router,
    private crud: CrudService,
    private bus: EventBusService,
    private companyService: CompanyService,
    private notifService: NotificationService,
    private authService: AuthService,
  ) {}

  ngOnInit() {
    this.subs.push(this.ts.direction$.subscribe(d => this.dir = d));
    this.subs.push(this.ts.currentLang$.subscribe(l => this.currentLang = l));
    this.subs.push(this.companyService.companyName$.subscribe(name => this.companyName = name));
    this.subs.push(this.companyService.logo$.subscribe(url => this.logoUrl = url || null));
    this.isAdmin = this.authService.hasRole('ROLE_ADMIN');

    this.subs.push(this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe((e: any) => {
        const url = e.urlAfterRedirects;
        const key = Object.keys(this.routeMap).find(k => url === k || url.startsWith(k + '/'));
        this.pageTitle = key ? this.routeMap[key] : 'dashboard';
        this.notifPanelOpen = false;
      }));

    if (this.authService.isAuthenticated()) {
      this.loadNetProfit();
      this.notifService.startSSE();
    }
    this.subs.push(this.bus.paymentsChanged$.subscribe(() => {
      if (this.authService.isAuthenticated()) this.loadNetProfit();
    }));
    this.subs.push(this.notifService.unreadCount.subscribe(n => this.unreadCount = n));
  }

  ngOnDestroy(): void {
    this.notifService.stopSSE();
    this.subs.forEach(s => s.unsubscribe());
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(e: MouseEvent): void {
    const target = e.target as HTMLElement;
    if (this.notifPanelOpen && !target.closest('.notif-wrapper')) {
      this.notifPanelOpen = false;
    }
  }

  toggleNotifPanel(): void {
    this.notifPanelOpen = !this.notifPanelOpen;
    if (this.notifPanelOpen) {
      this.loadNotifications();
    }
  }

  loadNotifications(): void {
    this.notifLoading = true;
    this.notifService.getNotifications().subscribe({
      next: items => { this.notifications = items; this.notifLoading = false; },
      error: ()    => { this.notifLoading = false; },
    });
  }

  markRead(id: number): void {
    const n = this.notifications.find(x => x.id === id);
    this.notifService.markRead(id).subscribe({
      next: () => {
        if (n) { n.isRead = true; n.readAt = new Date().toISOString(); }
        this.notifService.refreshCount();
        if (n?.deepLink) {
          this.notifPanelOpen = false;
          this.router.navigateByUrl(n.deepLink);
        }
      },
    });
  }

  markAllRead(): void {
    this.notifService.markAllRead().subscribe({
      next: () => {
        const now = new Date().toISOString();
        this.notifications.forEach(n => { n.isRead = true; n.readAt = now; });
        this.notifService.refreshCount();
      },
    });
  }

  notifTypeIcon(type: string): string {
    const icons: Record<string, string> = {
      compliance_expired:   '🚨',
      compliance_warning:   '⚠️',
      compliance_insurance: '🛡️',
      compliance_vignette:  '📄',
      compliance_visite:    '🔬',
      oil_change_due:       '🛢️',
      oil_change_overdue:   '🛢️',
      oil_change:           '🛢️',
      credit_due:           '💳',
      credit_overdue:       '💳',
      credit_installment:   '💳',
      reservation_created:  '📅',
      vehicle_sold:         '🏷️',
    };
    return icons[type] ?? '🔔';
  }

  priorityClass(priority: string): string {
    return ({
      CRITICAL: 'notif-pri-critical',
      HIGH:     'notif-pri-high',
      MEDIUM:   '',
      LOW:      '',
    } as any)[priority] ?? '';
  }

  loadNetProfit() {
    this.crud.getAll('dashboard/profit-summary').subscribe({
      next: (r: any) => {
        this.netProfit     = r?.netProfit     ?? 0;
        this.pendingAmount = r?.pendingAmount ?? 0;
      },
      error: () => {},
    });
  }

  t(key: string) { return this.ts.translate(key); }
  changeLang(lang: string) { this.ts.setLanguage(lang); }
}
