import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { CrudService } from '../../services/crud.service';
import { InvoiceService } from '../../services/invoice.service';
import { TranslationService } from '../../services/translation.service';
import { ActivityLogService } from '../../services/activity-log.service';
import { BtnComponent } from '../../shared/btn/btn.component';
import { ClientDocumentsComponent } from '../client-documents/client-documents.component';
import { debtRiskClass } from '../../shared/utils/debt.utils';
import { environment } from '../../../environments/environment';
import { StatusPipe } from '../../shared/pipes/status.pipe';
import { PayResPanelComponent } from '../../shared/pay-res-panel/pay-res-panel.component';
import { EventBusService } from '../../services/event-bus.service';

const CAR_PLACEHOLDER = `data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMzIwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2VkZjJmNyIvPjx0ZXh0IHg9IjE2MCIgeT0iMTAwIiBmaWxsPSIjYTBhZWMwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkb21pbmFudC1iYXNlbGluZT0ibWlkZGxlIiBmb250LXNpemU9IjUwIj7wn5qXPC90ZXh0Pjwvc3ZnPg==`;

@Component({
  selector: 'app-client-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, BtnComponent, ClientDocumentsComponent, StatusPipe, PayResPanelComponent],
  templateUrl: './client-detail.component.html',
  styleUrls: ['./client-detail.component.css']
})
export class ClientDetailComponent implements OnInit {
  client: any = null;
  reservations: any[] = [];
  contrats: any[] = [];
  financialSummary: any = null;
  loading = true;
  error = '';
  dir = 'ltr';
  activeTab: 'reservations' | 'documents' = 'reservations';
  filterStatus = '';
  filterDateFrom = '';
  filterDateTo = '';
  readonly debtRiskClass = debtRiskClass;

  // Payment history panel
  payPanelOpen  = false;
  payPanelResId: number | null = null;
  payPanelTotal = 0;
  payPanelPaid  = 0;
  payPanelTitle = '';

  constructor(
    private route: ActivatedRoute,
    private crud: CrudService,
    private invoiceSvc: InvoiceService,
    private ts: TranslationService,
    private activityLog: ActivityLogService,
    private bus: EventBusService,
  ) {}

  ngOnInit() {
    this.ts.direction$.subscribe(d => this.dir = d);
    const id = +this.route.snapshot.paramMap.get('id')!;
    this.activityLog.logView('Client', id);
    this.loadAll(id);
  }

  loadAll(id: number) {
    this.loading = true; this.error = '';
    forkJoin({
      client:           this.crud.getById('client', id).pipe(catchError(() => of(null))),
      reservations:     this.crud.getAll('reservation', { clientId: id }).pipe(catchError(() => of([]))),
      contrats:         this.crud.getAll('contrat').pipe(catchError(() => of([]))),
      financialSummary: this.crud.getById('client', `${id}/financial-summary`).pipe(catchError(() => of(null))),
    }).subscribe({
      next: ({ client, reservations, contrats, financialSummary }) => {
        this.client = client;
        this.reservations = Array.isArray(reservations) ? reservations : (reservations as any)?.data ?? [];
        const allContrats: any[] = Array.isArray(contrats) ? contrats : (contrats as any)?.data ?? [];
        this.contrats = allContrats.filter(c => c.clientId === id || c.client?.id === id);
        this.financialSummary = financialSummary;
        this.loading = false;

        if (this.payPanelResId) {
          const updated = this.reservations.find(r => r.id === this.payPanelResId);
          if (updated) {
            this.payPanelTotal = +updated.total || 0;
            this.payPanelPaid  = +updated.montantPaye || 0;
          }
        }
      },
      error: () => { this.error = this.ts.translate('loadError'); this.loading = false; }
    });
  }

  t(key: string): string { return this.ts.translate(key); }

  get clientName(): string {
    if (!this.client) return '—';
    return this.client.nom || `Client #${this.client.id}`;
  }

  private get activeReservations(): any[] {
    return this.reservations.filter(r =>
      !['cancelled', 'annulee', 'annule'].includes((r.reservationStatus || r.statut || '').toLowerCase())
    );
  }

  get totalSpent(): number {
    return this.activeReservations.reduce((sum, r) => sum + (+r.montantPaye || 0), 0);
  }

  get totalBilled(): number {
    return this.activeReservations.reduce((sum, r) => sum + (+r.total || 0), 0);
  }

  get activeCount(): number {
    return this.reservations.filter(r => ['confirmed', 'confirmee', 'in_progress', 'en_cours'].includes(r.reservationStatus)).length;
  }

  statusClass(s: string): string {
    const m: Record<string, string> = {
      confirmed: 'status-confirmed', pending: 'status-pending',
      cancelled: 'status-cancelled', terminee: 'status-done',
      in_progress: 'status-active',
    };
    return m[s] || '';
  }

  downloadInvoice(r: any) {
    this.invoiceSvc.generateFromData(r);
  }

  togglePaymentPanel(r: any): void {
    if (this.payPanelResId === r.id) { this.closePaymentModal(); return; }
    this.payPanelResId = r.id;
    this.payPanelTotal = +r.total || 0;
    this.payPanelPaid  = +r.montantPaye || 0;
    this.payPanelTitle = `${this.clientName} — #${r.id}`;
    this.payPanelOpen  = true;
  }

  closePaymentModal(): void {
    this.payPanelOpen  = false;
    this.payPanelResId = null;
  }

  onPaymentChanged(): void {
    this.bus.paymentsChanged$.next();
    const id = +this.route.snapshot.paramMap.get('id')!;
    this.loadAll(id);
  }

  setTab(t: 'reservations' | 'documents') { this.activeTab = t; }

  get filteredReservations(): any[] {
    return this.reservations.filter(r => {
      if (this.filterStatus) {
        const s = r.reservationStatus;
        let match: boolean;
        if (this.filterStatus === 'active')
          match = ['confirmed', 'confirmee', 'in_progress', 'en_cours'].includes(s);
        else if (this.filterStatus === 'cancelled')
          match = ['cancelled', 'annulee', 'annule'].includes(s);
        else
          match = s === this.filterStatus;
        if (!match) return false;
      }
      if (this.filterDateFrom) {
        const start = r.dateDebut?.substring(0, 10) ?? '';
        if (start < this.filterDateFrom) return false;
      }
      if (this.filterDateTo) {
        const start = r.dateDebut?.substring(0, 10) ?? '';
        if (start > this.filterDateTo) return false;
      }
      return true;
    });
  }

  get hasActiveFilter(): boolean {
    return !!(this.filterStatus || this.filterDateFrom || this.filterDateTo);
  }

  clearFilters() {
    this.filterStatus = '';
    this.filterDateFrom = '';
    this.filterDateTo = '';
  }

  get rentedCars(): any[] {
    const seen = new Set<number>();
    const cars: any[] = [];
    for (const r of this.reservations) {
      const v = r.voiture;
      if (v?.id && !seen.has(v.id)) {
        seen.add(v.id);
        cars.push(v);
      }
    }
    return cars;
  }

  carImgUrl(v: any): string {
    const path = v?.image || v?.images?.[0];
    if (!path) return CAR_PLACEHOLDER;
    return path.startsWith('http') ? path : environment.serverUrl + path;
  }

  onCarImgError(e: Event): void {
    (e.target as HTMLImageElement).src = CAR_PLACEHOLDER;
  }
}
