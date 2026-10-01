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
      reservation_conflict: '⚠️',
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

  private static readonly MONTHS: Record<'fr' | 'en' | 'ar', string[]> = {
    fr: ['Jan','Fév','Mar','Avr','Mai','Juin','Juil','Août','Sep','Oct','Nov','Déc'],
    en: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],
    ar: ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'],
  };

  fmtDate(raw: string | Date | null | undefined): string {
    if (!raw) return '';
    const d = raw instanceof Date ? raw : new Date(raw);
    if (isNaN(d.getTime())) return String(raw);
    const lang = (this.currentLang as 'fr' | 'en' | 'ar') in TopHeaderComponent.MONTHS
      ? this.currentLang as 'fr' | 'en' | 'ar' : 'fr';
    const month = TopHeaderComponent.MONTHS[lang][d.getMonth()];
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${d.getDate()} ${month}، ${hh}:${mm}`;
  }

  notifTitle(n: AppNotification): string {
    const lang = this.currentLang as 'fr' | 'en' | 'ar';
    if (lang === 'fr') return n.title;
    const sep = n.title.lastIndexOf(' — ');
    const suffix = sep >= 0 ? n.title.slice(sep + 3) : n.title;
    switch (n.type) {
      case 'reservation_created': {
        const car = n.title.replace(/^[^-]+-\s*/, '');
        return lang === 'ar' ? `حجز جديد — ${car}` : `New Booking — ${car}`;
      }
      case 'compliance_expired':
        return lang === 'ar' ? `وثيقة منتهية الصلاحية — ${suffix}` : `Compliance expired — ${suffix}`;
      case 'compliance_warning':
        return lang === 'ar' ? `وثيقة تنتهي قريباً — ${suffix}` : `Compliance expiring — ${suffix}`;
      case 'compliance_assurance':
      case 'compliance_vignette':
      case 'compliance_visite': {
        const docLabels: Record<string, Record<'en' | 'ar', string>> = {
          compliance_assurance: { en: 'Insurance',  ar: 'التأمين' },
          compliance_vignette:  { en: 'Vignette',   ar: 'الونيت' },
          compliance_visite:    { en: 'Inspection', ar: 'الفحص التقني' },
        };
        const lbl = docLabels[n.type][lang];
        if (n.title.includes('expiré'))   return lang === 'ar' ? `${lbl} منتهٍ — ${suffix}`  : `${lbl} expired — ${suffix}`;
        if (n.title.includes('critique')) return lang === 'ar' ? `${lbl} حرج — ${suffix}`    : `${lbl} critical — ${suffix}`;
        return lang === 'ar' ? `${lbl} قريباً — ${suffix}` : `${lbl} due soon — ${suffix}`;
      }
      case 'oil_change_overdue':
        return lang === 'ar' ? `تغيير الزيت متأخر — ${suffix}` : `Oil change overdue — ${suffix}`;
      case 'oil_change_due':
      case 'oil_change':
        return lang === 'ar' ? `تغيير الزيت قريباً — ${suffix}` : `Oil change due — ${suffix}`;
      case 'credit_overdue':
        return lang === 'ar' ? `قسط التمويل متأخر — ${suffix}` : `Credit installment overdue — ${suffix}`;
      case 'credit_due':
      case 'credit_installment':
        return lang === 'ar' ? `قسط التمويل مستحق — ${suffix}` : `Credit installment due — ${suffix}`;
      case 'credit_payment': {
        const isToday = n.title.includes("aujourd'hui");
        if (isToday) return lang === 'ar' ? `قسط ائتماني مستحق اليوم — ${suffix}` : `Credit installment due today — ${suffix}`;
        const days = n.title.match(/(\d+)j? avant/)?.[1] ?? '?';
        const carSep = n.title.lastIndexOf(' — ');
        const car = carSep > 7 ? n.title.slice('Crédit '.length, carSep) : suffix;
        return lang === 'ar' ? `قسط ائتماني — ${car} — خلال ${days} أيام` : `Credit installment — ${car} — in ${days} day(s)`;
      }
      case 'vehicle_sold':
        return lang === 'ar' ? `مركبة مباعة — ${suffix}` : `Vehicle sold — ${suffix}`;
      case 'recurring_expense_due':
        return lang === 'ar' ? `نفقة متكررة مستحقة — ${suffix}` : `Recurring expense due — ${suffix}`;
      case 'reservation_conflict':
        return lang === 'ar' ? `تعارض في حجز — ${suffix}` : `Booking conflict — ${suffix}`;
      default:
        return n.title;
    }
  }

  notifMsg(n: AppNotification): string {
    const lang = this.currentLang as 'fr' | 'en' | 'ar';
    if (lang === 'fr') return n.message;
    const nums = n.message.match(/[\d.]+/g) ?? [];
    switch (n.type) {
      case 'reservation_created': {
        const dates = n.message.match(/\d{2}\/\d{2}\/\d{4}/g) ?? [];
        const client = n.message.replace(/^.*?(?:pour|for)\s*/i, '').replace(/,.*$/, '').trim();
        return lang === 'ar' ? `تم إنشاء حجز لـ ${client}، ${dates.join(' › ')}`
                             : `Booking created for ${client}, ${dates.join(' › ')}`;
      }
      case 'compliance_expired': {
        const d = nums[0];
        return d ? (lang === 'ar' ? `انتهت الصلاحية منذ ${d} يوم.` : `Expired ${d} day(s) ago.`)
                 : (lang === 'ar' ? `الوثيقة منتهية الصلاحية.`      : `Document has expired.`);
      }
      case 'compliance_warning': {
        const d = nums[0] ?? '?';
        return lang === 'ar' ? `الوثيقة تنتهي خلال ${d} يوم.` : `Document expires in ${d} day(s).`;
      }
      case 'compliance_assurance':
      case 'compliance_vignette':
      case 'compliance_visite': {
        if (n.message.startsWith('Expiré depuis')) {
          const d = nums[0] ?? '?';
          return lang === 'ar' ? `انتهت الصلاحية منذ ${d} يوم.` : `Expired ${d} day(s) ago.`;
        }
        const d = nums[0] ?? '?';
        const date = n.message.match(/:\s*(.+)$/)?.[1]?.trim() ?? '';
        return lang === 'ar' ? `تنتهي خلال ${d} يوم${date ? ` (${date})` : ''}.`
                             : `Expires in ${d} day(s)${date ? ` (${date})` : ''}.`;
      }
      case 'oil_change_overdue': {
        const km = nums[0] ?? '?';
        return lang === 'ar' ? `تأخر تغيير الزيت بـ ${km} كم.` : `Oil change overdue by ${km} km.`;
      }
      case 'oil_change_due':
      case 'oil_change': {
        const km = nums[0] ?? '?';
        return lang === 'ar' ? `تغيير الزيت خلال ${km} كم.` : `Oil change due in ${km} km.`;
      }
      case 'credit_overdue': {
        const amt = nums[0] ?? '?';
        return lang === 'ar' ? `المنسالة البالغة ${amt} درهم متأخرة.` : `Installment of ${amt} MAD is past due.`;
      }
      case 'credit_due':
      case 'credit_installment': {
        const amt = nums[0] ?? '?';
        return lang === 'ar' ? `المنسالة البالغة ${amt} درهم مستحقة.` : `Installment of ${amt} MAD is due.`;
      }
      case 'credit_payment': {
        const installNum = n.message.match(/n°(\d+)/)?.[1] ?? nums[0] ?? '?';
        const amount = n.message.match(/de\s+([\d.]+)\s+MAD/)?.[1] ?? nums[1] ?? '?';
        const date = n.message.match(/le\s+(\d{2}\/\d{2}\/\d{4})/)?.[1] ?? '';
        return lang === 'ar'
          ? `القسط رقم ${installNum} بمبلغ ${amount} درهم${date ? `، مستحق بتاريخ ${date}` : ''}.`
          : `Installment #${installNum} of ${amount} MAD${date ? `, due on ${date}` : ''}.`;
      }
      case 'vehicle_sold':
        return lang === 'ar' ? `تم بيع المركبة وإزالتها من الأسطول.` : `Vehicle sold and removed from the active fleet.`;
      case 'recurring_expense_due':
        return lang === 'ar' ? `النفقة مستحقة خلال أقل من 10 أيام.` : `Expense due in less than 10 days.`;
      case 'reservation_conflict':
        return lang === 'ar' ? `تم اكتشاف تعارض في تواريخ الحجز.` : `A booking conflict has been detected.`;
      default:
        return n.message;
    }
  }
}
