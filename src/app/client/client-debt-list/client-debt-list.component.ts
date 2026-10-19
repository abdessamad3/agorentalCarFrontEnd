import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { Subject, of } from 'rxjs';
import { catchError, debounceTime, switchMap, takeUntil } from 'rxjs/operators';
import { CrudService } from '../../services/crud.service';
import { TranslationService } from '../../services/translation.service';
import { EventBusService } from '../../services/event-bus.service';
import { debtRiskClass, debtRiskLevel } from '../../shared/utils/debt.utils';
import { PayResPanelComponent } from '../../shared/pay-res-panel/pay-res-panel.component';
import { PaginatorComponent } from '../../shared/paginator/paginator.component';
import { PAGE_SIZE } from '../../shared/constants/pagination';

export interface ClientDebt {
  id: number;
  nom: string;
  prenom: string;
  telephone: string;
  cin: string;
  outstandingDebt: number;
}

export interface ReservationDebt {
  id: number;
  dateDebut: string;
  dateFin: string;
  total: number;
  montantPaye: number;
  remaining: number;
  matricule: string;
}

@Component({
  selector: 'app-client-debt-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, PayResPanelComponent, PaginatorComponent],
  templateUrl: './client-debt-list.component.html',
  styleUrls: ['./client-debt-list.component.css']
})
export class ClientDebtListComponent implements OnInit, OnDestroy {
  debtors: ClientDebt[] = [];
  loading = true;
  error = '';
  search = '';
  dir = 'ltr';
  expandedId: number | null = null;

  // Current page only -- grandTotal/highRiskCount come from the backend (meta), computed
  // across every debtor that matches the filter, not just this page.
  page = 1;
  limit = PAGE_SIZE;
  total = 0;
  grandTotal = 0;
  highRiskCount = 0;

  // Lazy-loaded reservation breakdown for whichever card is expanded -- fetched on demand
  // (scoped to that one client, never the whole reservation table) rather than upfront.
  expandedReservations: ReservationDebt[] = [];
  expandedLoading = false;

  // Payment history panel state
  payPanelOpen  = false;
  payPanelResId: number | null = null;
  payPanelTotal = 0;
  payPanelPaid  = 0;
  payPanelTitle = '';

  readonly debtRiskClass = debtRiskClass;
  readonly debtRiskLevel = debtRiskLevel;

  private searchSubject = new Subject<void>();
  private destroy$ = new Subject<void>();

  constructor(
    private crud: CrudService,
    private ts: TranslationService,
    private bus: EventBusService,
    private router: Router
  ) {}

  ngOnInit() {
    this.ts.direction$.subscribe(d => this.dir = d);
    this.searchSubject.pipe(
      debounceTime(300),
      switchMap(() => this.fetchPage()),
      takeUntil(this.destroy$)
    ).subscribe(r => this.applyPage(r));
    this.load();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private fetchPage() {
    this.loading = true;
    this.error = '';
    return this.crud.getPage<ClientDebt>('client/debtors', { page: this.page, limit: this.limit, search: this.search }).pipe(
      catchError(() => { this.error = this.ts.translate('loadError'); return of(null); })
    );
  }

  // On a failed request (r === null, from fetchPage()'s catchError), reset to empty
  // rather than leaving a previous page's data on screen underneath the error banner.
  private applyPage(r: any) {
    this.debtors       = r?.data ?? [];
    this.total         = r?.meta?.total ?? 0;
    this.grandTotal     = r?.meta?.grandTotal ?? 0;
    this.highRiskCount = r?.meta?.highRiskCount ?? 0;
    this.loading = false;
  }

  load() {
    this.fetchPage().subscribe(r => this.applyPage(r));
  }

  onSearch(): void { this.page = 1; this.searchSubject.next(); }
  onPageChange(p: number): void { this.page = p; this.expandedId = null; this.load(); }

  /** Global rank across all pages (page 2's first row is #101, not #1), since this list
   *  is specifically ranked by debt amount. */
  rankOf(indexOnPage: number): number { return (this.page - 1) * this.limit + indexOnPage + 1; }

  riskLabel(amount: number): string {
    const level = debtRiskLevel(amount);
    const keys: Record<string, string> = { low: 'debtLowRisk', medium: 'debtMediumRisk', high: 'debtHighRisk' };
    return this.ts.translate(keys[level] ?? 'debtLowRisk');
  }

  toggleExpand(c: ClientDebt) {
    if (this.expandedId === c.id) {
      this.expandedId = null;
      this.expandedReservations = [];
      return;
    }
    this.expandedId = c.id;
    this.loadReservationsFor(c.id);
  }

  /** Scoped to one client's own reservations -- bounded by nature, never the full table. */
  private loadReservationsFor(clientId: number) {
    this.expandedLoading = true;
    this.expandedReservations = [];
    this.crud.getAll('reservation', { clientId }).pipe(
      catchError(() => of([]))
    ).subscribe((reservations: any) => {
      const all: any[] = Array.isArray(reservations) ? reservations : reservations?.data ?? [];
      this.expandedReservations = all
        .filter(r => {
          const status = (r.reservationStatus || r.statut || '').toLowerCase();
          if (['cancelled', 'annulee', 'annule', 'pending'].includes(status)) return false;
          const remaining = parseFloat(r.montantRestant ?? (r.total || 0) - (r.montantPaye || 0));
          return remaining > 0.01;
        })
        .map(r => ({
          id: r.id,
          dateDebut: r.dateDebut,
          dateFin: r.dateFin,
          total: parseFloat(r.total || 0),
          montantPaye: parseFloat(r.montantPaye || 0),
          remaining: parseFloat(r.montantRestant ?? (r.total || 0) - (r.montantPaye || 0)),
          matricule: r.voiture?.immatriculation || '',
        }));
      this.expandedLoading = false;
    });
  }

  goProfile(clientId: number) { this.router.navigate(['/client', clientId]); }

  goToReservation(id: number) { this.router.navigate(['/location', id]); }

  // ── Payment history panel ────────────────────────────────────────────────────

  openPayment(r: ReservationDebt, clientName: string) {
    this.payPanelResId = r.id;
    this.payPanelTotal = r.total;
    this.payPanelPaid  = r.montantPaye;
    this.payPanelTitle = `${clientName} — #${r.id}`;
    this.payPanelOpen  = true;
  }

  closePayPanel() {
    this.payPanelOpen  = false;
    this.payPanelResId = null;
  }

  onPaymentChanged() {
    this.bus.paymentsChanged$.next();
    this.load();
    // A reservation that just became fully paid drops out of the debtors list entirely,
    // so refresh the expanded breakdown (if open) straight from the server too.
    if (this.expandedId) this.loadReservationsFor(this.expandedId);
    if (this.payPanelResId) {
      this.crud.getById('reservation', this.payPanelResId).subscribe((r: any) => {
        if (r) {
          this.payPanelTotal = parseFloat(r.total || 0);
          this.payPanelPaid  = parseFloat(r.montantPaye || 0);
        }
      });
    }
  }

  t(key: string) { return this.ts.translate(key); }
}
