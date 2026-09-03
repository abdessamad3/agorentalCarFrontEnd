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

const CAR_PLACEHOLDER = `data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMzIwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2VkZjJmNyIvPjx0ZXh0IHg9IjE2MCIgeT0iMTAwIiBmaWxsPSIjYTBhZWMwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkb21pbmFudC1iYXNlbGluZT0ibWlkZGxlIiBmb250LXNpemU9IjUwIj7wn5qlPC90ZXh0Pjwvc3ZnPg==`;

@Component({
  selector: 'app-client-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, BtnComponent, ClientDocumentsComponent, StatusPipe],
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

  // Payment history drawer modal
  selectedResForPayment: any = null;
  paymentPanelResId: number | null = null;
  paymentCache: Record<number, any[]> = {};
  paymentLoading: Record<number, boolean> = {};
  newPayment = { montant: 0, datePaiement: '', note: '', modePaiement: 'especes' };
  addingPayment = false;

  constructor(
    private route: ActivatedRoute,
    private crud: CrudService,
    private invoiceSvc: InvoiceService,
    private ts: TranslationService,
    private activityLog: ActivityLogService,
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
      },
      error: () => { this.error = 'Erreur de chargement.'; this.loading = false; }
    });
  }

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
    if (this.selectedResForPayment?.id === r.id) { this.closePaymentModal(); return; }
    this.selectedResForPayment = r;
    this.paymentPanelResId = r.id;
    if (this.paymentCache[r.id] !== undefined) return;
    this.paymentLoading[r.id] = true;
    this.crud.getAll('paiement', { reservationId: r.id }).pipe(catchError(() => of([]))).subscribe((data: any) => {
      this.paymentCache[r.id] = Array.isArray(data) ? data : (data?.data ?? []);
      this.paymentLoading[r.id] = false;
    });
  }

  closePaymentModal(): void {
    this.selectedResForPayment = null;
    this.paymentPanelResId = null;
    this.newPayment = { montant: 0, datePaiement: '', note: '', modePaiement: 'especes' };
  }

  get payProgressPct(): number {
    if (!this.selectedResForPayment) return 0;
    const total = +this.selectedResForPayment.total || 0;
    if (total === 0) return 0;
    const paid = +this.selectedResForPayment.montantPaye || 0;
    return Math.min(100, Math.round((paid / total) * 100));
  }

  addInstallment(): void {
    if (!this.selectedResForPayment || !this.newPayment.montant || !this.newPayment.datePaiement) return;
    this.addingPayment = true;
    const res = this.selectedResForPayment;
    const payload = {
      reservationId: res.id,
      montant: this.newPayment.montant,
      datePaiement: this.newPayment.datePaiement,
      note: this.newPayment.note,
      modePaiement: this.newPayment.modePaiement,
    };
    this.crud.create('paiement', payload).pipe(catchError(() => of(null))).subscribe((result: any) => {
      this.addingPayment = false;
      if (result) {
        delete this.paymentCache[res.id];
        this.newPayment = { montant: 0, datePaiement: '', note: '', modePaiement: 'especes' };
        this.paymentLoading[res.id] = true;
        this.crud.getAll('paiement', { reservationId: res.id }).pipe(catchError(() => of([]))).subscribe((data: any) => {
          this.paymentCache[res.id] = Array.isArray(data) ? data : (data?.data ?? []);
          this.paymentLoading[res.id] = false;
        });
      }
    });
  }

  paymentModeLabel(m: string | null): string {
    const map: Record<string, string> = {
      especes: 'Espèces', virement: 'Virement', cheque: 'Chèque',
      carte: 'Carte', cb: 'Carte', online: 'En ligne',
    };
    return m ? (map[m.toLowerCase()] ?? m) : '—';
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
