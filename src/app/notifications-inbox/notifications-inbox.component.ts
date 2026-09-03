import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { NotificationService, AppNotification } from '../services/notification.service';
import { TranslationService } from '../services/translation.service';

type CategoryKey = 'all' | 'compliance' | 'reservations' | 'payments' | 'credits' | 'maintenance' | 'system';
type StatusFilter = 'all' | 'unread' | 'critical' | 'warnings' | 'resolved';

interface ActionBtn {
  label: string;
  route: string | null;
  icon: string;
  cls: string;
}

@Component({
  selector: 'app-notifications-inbox',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './notifications-inbox.component.html',
  styleUrls: ['./notifications-inbox.component.css'],
})
export class NotificationsInboxComponent implements OnInit {
  dir = 'ltr';
  loading = false;
  all: AppNotification[] = [];

  activeCategory: CategoryKey = 'all';
  statusFilter: StatusFilter = 'all';

  get categories(): { key: CategoryKey; label: string; icon: string }[] {
    const lang = this.ts.getCurrentLanguage() as 'fr' | 'en' | 'ar';
    const labels: Record<CategoryKey, Record<'fr' | 'en' | 'ar', string>> = {
      all:          { fr: 'Toutes',       en: 'All Notifications', ar: 'كل الإشعارات' },
      compliance:   { fr: 'Conformité',   en: 'Compliance',        ar: 'الامتثال' },
      reservations: { fr: 'Réservations', en: 'Reservations',      ar: 'الحجوزات' },
      payments:     { fr: 'Paiements',    en: 'Payments',          ar: 'المدفوعات' },
      credits:      { fr: 'Crédits',      en: 'Credits',           ar: 'القروض' },
      maintenance:  { fr: 'Entretien',    en: 'Maintenance',       ar: 'الصيانة' },
      system:       { fr: 'Système',      en: 'System',            ar: 'النظام' },
    };
    return [
      { key: 'all',          label: labels.all[lang],          icon: '🔔' },
      { key: 'compliance',   label: labels.compliance[lang],   icon: '⚖️' },
      { key: 'reservations', label: labels.reservations[lang], icon: '📅' },
      { key: 'payments',     label: labels.payments[lang],     icon: '💰' },
      { key: 'credits',      label: labels.credits[lang],      icon: '💳' },
      { key: 'maintenance',  label: labels.maintenance[lang],  icon: '🔧' },
      { key: 'system',       label: labels.system[lang],       icon: '⚙️' },
    ];
  }

  get statusFilters(): { key: StatusFilter; label: string }[] {
    const lang = this.ts.getCurrentLanguage() as 'fr' | 'en' | 'ar';
    const labels: Record<StatusFilter, Record<'fr' | 'en' | 'ar', string>> = {
      all:      { fr: 'Tous',      en: 'All',      ar: 'الكل' },
      unread:   { fr: 'Non lus',   en: 'Unread',   ar: 'غير مقروء' },
      critical: { fr: 'Critique',  en: 'Critical', ar: 'حرج' },
      warnings: { fr: 'Attention', en: 'Warnings', ar: 'تحذيرات' },
      resolved: { fr: 'Résolus',   en: 'Resolved', ar: 'محلول' },
    };
    return [
      { key: 'all',      label: labels.all[lang] },
      { key: 'unread',   label: labels.unread[lang] },
      { key: 'critical', label: labels.critical[lang] },
      { key: 'warnings', label: labels.warnings[lang] },
      { key: 'resolved', label: labels.resolved[lang] },
    ];
  }

  constructor(
    private notifSvc: NotificationService,
    private router: Router,
    private ts: TranslationService,
  ) {}

  ngOnInit(): void {
    this.ts.direction$.subscribe(d => this.dir = d);
    this.load();
  }

  load(): void {
    this.loading = true;
    this.notifSvc.getNotifications(500, 'all').subscribe({
      next: items => { this.all = items; this.loading = false; },
      error: ()    => { this.loading = false; },
    });
  }

  setCategory(cat: CategoryKey): void { this.activeCategory = cat; }
  setStatusFilter(f: StatusFilter): void { this.statusFilter = f; }

  // ── Filtering ──────────────────────────────────────────────

  get categoryItems(): AppNotification[] {
    if (this.activeCategory === 'all') return this.all;
    return this.all.filter(n => this.categoryOf(n.type) === this.activeCategory);
  }

  get filteredNotifs(): AppNotification[] {
    const cat = this.categoryItems;
    switch (this.statusFilter) {
      case 'unread':   return cat.filter(n => !n.isRead);
      case 'critical': return cat.filter(n => n.priority === 'CRITICAL' || n.priority === 'HIGH');
      case 'warnings': return cat.filter(n => n.priority === 'MEDIUM');
      case 'resolved': return cat.filter(n => n.isRead);
      default:         return cat;
    }
  }

  get categoryCounts(): Record<CategoryKey, number> {
    const unread = this.all.filter(n => !n.isRead);
    const c = (key: CategoryKey) => unread.filter(n => this.categoryOf(n.type) === key).length;
    return {
      all:          unread.length,
      compliance:   c('compliance'),
      reservations: c('reservations'),
      payments:     c('payments'),
      credits:      c('credits'),
      maintenance:  c('maintenance'),
      system:       c('system'),
    };
  }

  get statusCounts(): Record<StatusFilter, number> {
    const cat = this.categoryItems;
    return {
      all:      cat.length,
      unread:   cat.filter(n => !n.isRead).length,
      critical: cat.filter(n => n.priority === 'CRITICAL' || n.priority === 'HIGH').length,
      warnings: cat.filter(n => n.priority === 'MEDIUM').length,
      resolved: cat.filter(n => n.isRead).length,
    };
  }

  get unreadCount(): number {
    return this.all.filter(n => !n.isRead).length;
  }

  // ── Helpers ──────────────────────────────────────────────────

  categoryOf(type: string): CategoryKey {
    if (!type) return 'system';
    if (type.startsWith('compliance_') || type.includes('insurance') || type.includes('vignette') || type.includes('visite'))
      return 'compliance';
    if (type.startsWith('reservation_')) return 'reservations';
    if (type.startsWith('payment_') || type.includes('mensualite')) return 'payments';
    if (type.startsWith('credit_') || type.includes('credit')) return 'credits';
    if (type.startsWith('oil_') || type.includes('reparation') || type.includes('repair')) return 'maintenance';
    return 'system';
  }

  actionButtonsFor(n: AppNotification): ActionBtn[] {
    const lang = this.ts.getCurrentLanguage() as 'fr' | 'en' | 'ar';
    const L = {
      renew:      { fr: 'Renouveler',          en: 'Renew',               ar: 'تجديد' },
      pay:        { fr: 'Payer',               en: 'Pay',                 ar: 'دفع' },
      inspect:    { fr: 'Planifier contrôle',  en: 'Book Inspection',     ar: 'حجز فحص' },
      compliance: { fr: 'Voir conformité',     en: 'View Compliance',     ar: 'عرض الامتثال' },
      oil:        { fr: 'Planifier vidange',   en: 'Schedule Oil Change', ar: 'جدولة تغيير الزيت' },
      credit:     { fr: 'Voir crédit',         en: 'View Credit',         ar: 'عرض القرض' },
      booking:    { fr: 'Voir réservation',    en: 'View Booking',        ar: 'عرض الحجز' },
      view:       { fr: 'Voir',                en: 'View',                ar: 'عرض' },
      vehicle:    { fr: 'Voir véhicule',       en: 'View Vehicle',        ar: 'عرض السيارة' },
    };
    const btns: ActionBtn[] = [];
    const t = n.type;

    if (t === 'compliance_insurance' || t.includes('insurance')) {
      btns.push({ label: L.renew[lang], route: '/assurance', icon: '🔄', cls: 'ncb-renew' });
    } else if (t === 'compliance_vignette' || t.includes('vignette')) {
      btns.push({ label: L.pay[lang], route: '/vignette', icon: '💳', cls: 'ncb-pay' });
    } else if (t === 'compliance_visite' || t.includes('visite')) {
      btns.push({ label: L.inspect[lang], route: '/suivi-technique', icon: '🔬', cls: 'ncb-inspect' });
    } else if (t === 'compliance_expired' || t === 'compliance_warning') {
      btns.push({ label: L.compliance[lang], route: n.deepLink ?? '/compliance', icon: '⚖️', cls: 'ncb-renew' });
    } else if (t.startsWith('oil_')) {
      btns.push({ label: L.oil[lang], route: n.deepLink, icon: '🛢️', cls: 'ncb-oil' });
    } else if (t.startsWith('credit_')) {
      btns.push({ label: L.credit[lang], route: n.deepLink, icon: '💳', cls: 'ncb-credit' });
    } else if (t.startsWith('reservation_')) {
      btns.push({ label: L.booking[lang], route: n.deepLink, icon: '📅', cls: 'ncb-booking' });
    } else if (n.deepLink) {
      btns.push({ label: L.view[lang], route: n.deepLink, icon: '→', cls: 'ncb-view' });
    }

    if (t.startsWith('compliance_') || t.startsWith('oil_')) {
      const vehicleLink = n.deepLink?.startsWith('/voiture/') ? n.deepLink
        : (n.sourceType === 'vehicle' ? `/voiture/${n.sourceId}` : null);
      if (vehicleLink) {
        btns.push({ label: L.vehicle[lang], route: vehicleLink, icon: '🚗', cls: 'ncb-vehicle' });
      }
    }

    return btns;
  }

  act(n: AppNotification, route: string | null): void {
    if (!n.isRead) {
      this.notifSvc.markRead(n.id).subscribe({
        next: () => { n.isRead = true; n.readAt = new Date().toISOString(); this.notifSvc.refreshCount(); },
      });
    }
    if (route) this.router.navigateByUrl(route);
  }

  markAllRead(): void {
    this.notifSvc.markAllRead().subscribe({
      next: () => {
        const now = new Date().toISOString();
        this.all.forEach(n => { n.isRead = true; n.readAt = now; });
        this.notifSvc.refreshCount();
      },
    });
  }

  t(key: string): string { return this.ts.translate(key); }

  typeIcon(type: string): string {
    const map: Record<string, string> = {
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
    return map[type] ?? '🔔';
  }

  priorityClass(priority: string): string {
    return ({ CRITICAL: 'pri-critical', HIGH: 'pri-high', MEDIUM: 'pri-medium', LOW: 'pri-low' } as any)[priority] ?? 'pri-medium';
  }

  priorityLabel(priority: string): string {
    const lang = this.ts.getCurrentLanguage() as 'fr' | 'en' | 'ar';
    const m: Record<string, Record<'fr' | 'en' | 'ar', string>> = {
      CRITICAL: { fr: 'Critique', en: 'Critical', ar: 'حرج' },
      HIGH:     { fr: 'Élevé',    en: 'High',     ar: 'عالٍ' },
      MEDIUM:   { fr: 'Moyen',    en: 'Medium',   ar: 'متوسط' },
      LOW:      { fr: 'Faible',   en: 'Low',      ar: 'منخفض' },
    };
    return m[priority]?.[lang] ?? m[priority]?.['fr'] ?? priority;
  }

  notifTitle(n: AppNotification): string {
    const lang = this.ts.getCurrentLanguage() as 'fr' | 'en' | 'ar';
    if (lang === 'fr') return n.title;

    // Extract the dynamic label after the last " — " separator
    const sep = n.title.lastIndexOf(' — ');
    const suffix = sep >= 0 ? n.title.slice(sep + 3) : n.title;

    switch (n.type) {
      case 'reservation_created': {
        // title: "Nouvelle réservation - car" (new) or "New booking - car" (legacy)
        const car = n.title.replace(/^[^-]+-\s*/, '');
        return lang === 'ar' ? `حجز جديد — ${car}` : `New Booking — ${car}`;
      }
      case 'compliance_expired':
        return lang === 'ar' ? `وثيقة منتهية الصلاحية — ${suffix}` : `Compliance expired — ${suffix}`;
      case 'compliance_warning':
        return lang === 'ar' ? `وثيقة تنتهي قريباً — ${suffix}` : `Compliance expiring — ${suffix}`;
      case 'oil_change_overdue':
        return lang === 'ar' ? `تغيير الزيت متأخر — ${suffix}` : `Oil change overdue — ${suffix}`;
      case 'oil_change_due':
        return lang === 'ar' ? `تغيير الزيت قريباً — ${suffix}` : `Oil change due soon — ${suffix}`;
      case 'credit_overdue':
        return lang === 'ar' ? `قسط التمويل متأخر — ${suffix}` : `Credit installment overdue — ${suffix}`;
      case 'credit_due':
        return lang === 'ar' ? `قسط التمويل مستحق — ${suffix}` : `Credit installment due — ${suffix}`;
      case 'vehicle_sold':
        return lang === 'ar' ? `مركبة مباعة — ${suffix}` : `Vehicle sold — ${suffix}`;
      default:
        return n.title;
    }
  }

  notifMsg(n: AppNotification): string {
    const lang = this.ts.getCurrentLanguage() as 'fr' | 'en' | 'ar';
    if (lang === 'fr') return n.message;

    const nums = n.message.match(/[\d.]+/g) ?? [];

    switch (n.type) {
      case 'reservation_created': {
        const dates = n.message.match(/\d{2}\/\d{2}\/\d{4}/g) ?? [];
        const client = n.message.replace(/^.*?(?:pour|for)\s*/i, '').replace(/,.*$/, '').trim();
        const range = dates.join(' › ');
        return lang === 'ar' ? `تم إنشاء حجز لـ ${client}، ${range}`
                             : `Booking created for ${client}, ${range}`;
      }
      case 'compliance_expired': {
        const d = nums[0];
        return d
          ? (lang === 'ar' ? `انتهت الصلاحية منذ ${d} يوم.`    : `Expired ${d} day(s) ago.`)
          : (lang === 'ar' ? `الوثيقة منتهية الصلاحية.`          : `Document has expired.`);
      }
      case 'compliance_warning': {
        const d = nums[0] ?? '?';
        return lang === 'ar' ? `الوثيقة تنتهي خلال ${d} يوم.` : `Document expires in ${d} day(s).`;
      }
      case 'oil_change_overdue': {
        const km = nums[0] ?? '?';
        return lang === 'ar' ? `تأخر تغيير الزيت بـ ${km} كم.` : `Oil change overdue by ${km} km.`;
      }
      case 'oil_change_due': {
        const [km1, km2] = nums;
        return lang === 'ar'
          ? `تغيير الزيت خلال ${km1 ?? '?'} كم (القادم عند ${km2 ?? '?'} كم).`
          : `Oil change due in ${km1 ?? '?'} km (next at ${km2 ?? '?'} km).`;
      }
      case 'credit_overdue': {
        const amt = nums[0] ?? '?';
        return lang === 'ar' ? `المنسالة البالغة ${amt} درهم متأخرة.` : `Installment of ${amt} MAD is past due.`;
      }
      case 'credit_due': {
        const amt = nums[0] ?? '?';
        return lang === 'ar' ? `المنسالة البالغة ${amt} درهم مستحقة خلال 7 أيام.`
                             : `Installment of ${amt} MAD is due within 7 days.`;
      }
      case 'vehicle_sold':
        return lang === 'ar' ? `تم بيع المركبة وإزالتها من الأسطول.`
                             : `Vehicle sold and removed from the active fleet.`;
      default:
        return n.message;
    }
  }
}
