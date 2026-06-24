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

  readonly categories: { key: CategoryKey; label: string; icon: string }[] = [
    { key: 'all',          label: 'All Notifications', icon: '🔔' },
    { key: 'compliance',   label: 'Compliance',         icon: '⚖️' },
    { key: 'reservations', label: 'Reservations',       icon: '📅' },
    { key: 'payments',     label: 'Payments',           icon: '💰' },
    { key: 'credits',      label: 'Credits',            icon: '💳' },
    { key: 'maintenance',  label: 'Maintenance',        icon: '🔧' },
    { key: 'system',       label: 'System',             icon: '⚙️' },
  ];

  readonly statusFilters: { key: StatusFilter; label: string }[] = [
    { key: 'all',      label: 'All'      },
    { key: 'unread',   label: 'Unread'   },
    { key: 'critical', label: 'Critical' },
    { key: 'warnings', label: 'Warnings' },
    { key: 'resolved', label: 'Resolved' },
  ];

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
    const btns: ActionBtn[] = [];
    const t = n.type;

    // Primary action by type
    if (t === 'compliance_insurance' || t.includes('insurance')) {
      btns.push({ label: 'Renew', route: '/assurance', icon: '🔄', cls: 'ncb-renew' });
    } else if (t === 'compliance_vignette' || t.includes('vignette')) {
      btns.push({ label: 'Pay', route: '/vignette', icon: '💳', cls: 'ncb-pay' });
    } else if (t === 'compliance_visite' || t.includes('visite')) {
      btns.push({ label: 'Book Inspection', route: '/suivi-technique', icon: '🔬', cls: 'ncb-inspect' });
    } else if (t === 'compliance_expired' || t === 'compliance_warning') {
      btns.push({ label: 'View Compliance', route: n.deepLink ?? '/compliance', icon: '⚖️', cls: 'ncb-renew' });
    } else if (t.startsWith('oil_')) {
      btns.push({ label: 'Schedule Oil Change', route: n.deepLink, icon: '🛢️', cls: 'ncb-oil' });
    } else if (t.startsWith('credit_')) {
      btns.push({ label: 'View Credit', route: n.deepLink, icon: '💳', cls: 'ncb-credit' });
    } else if (t.startsWith('reservation_')) {
      btns.push({ label: 'View Booking', route: n.deepLink, icon: '📅', cls: 'ncb-booking' });
    } else if (n.deepLink) {
      btns.push({ label: 'View', route: n.deepLink, icon: '→', cls: 'ncb-view' });
    }

    // View Vehicle for compliance & maintenance
    if (t.startsWith('compliance_') || t.startsWith('oil_')) {
      const vehicleLink = n.deepLink?.startsWith('/voiture/') ? n.deepLink
        : (n.sourceType === 'vehicle' ? `/voiture/${n.sourceId}` : null);
      if (vehicleLink) {
        btns.push({ label: 'View Vehicle', route: vehicleLink, icon: '🚗', cls: 'ncb-vehicle' });
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
    return ({ CRITICAL: 'Critical', HIGH: 'High', MEDIUM: 'Medium', LOW: 'Low' } as any)[priority] ?? priority;
  }
}
