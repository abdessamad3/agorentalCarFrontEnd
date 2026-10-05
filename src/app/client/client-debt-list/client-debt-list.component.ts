import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { CrudService } from '../../services/crud.service';
import { TranslationService } from '../../services/translation.service';
import { EventBusService } from '../../services/event-bus.service';
import { debtRiskClass, debtRiskLevel } from '../../shared/utils/debt.utils';
import { PayResPanelComponent } from '../../shared/pay-res-panel/pay-res-panel.component';

export interface ClientDebt {
  clientId: number;
  nom: string;
  prenom: string;
  telephone: string;
  cin: string;
  totalOwed: number;
  reservations: ReservationDebt[];
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
  imports: [CommonModule, FormsModule, RouterModule, PayResPanelComponent],
  templateUrl: './client-debt-list.component.html',
  styleUrls: ['./client-debt-list.component.css']
})
export class ClientDebtListComponent implements OnInit {
  debtors: ClientDebt[] = [];
  loading = true;
  error = '';
  search = '';
  dir = 'ltr';
  expandedId: number | null = null;

  // Payment history panel state
  payPanelOpen  = false;
  payPanelResId: number | null = null;
  payPanelTotal = 0;
  payPanelPaid  = 0;
  payPanelTitle = '';

  readonly debtRiskClass = debtRiskClass;
  readonly debtRiskLevel = debtRiskLevel;

  constructor(
    private crud: CrudService,
    private ts: TranslationService,
    private bus: EventBusService,
    private router: Router
  ) {}

  ngOnInit() {
    this.ts.direction$.subscribe(d => this.dir = d);
    this.load();
  }

  load() {
    this.loading = true;
    this.error = '';
    forkJoin({
      reservations: this.crud.getAll('reservation').pipe(catchError(() => of([]))),
      clients:      this.crud.getAll('client').pipe(catchError(() => of([]))),
    }).subscribe(({ reservations, clients }) => {
      const all: any[] = Array.isArray(reservations) ? reservations : (reservations as any)?.data ?? [];

      // Build a phone/cin lookup from the full client list
      const clientMap = new Map<number, { telephone: string; cin: string; prenom: string }>();
      const clientArr: any[] = Array.isArray(clients) ? clients : (clients as any)?.data ?? [];
      for (const cl of clientArr) {
        clientMap.set(cl.id, { telephone: cl.telephone || '', cin: cl.cin || '', prenom: cl.prenom || '' });
      }

      const unpaid = all.filter(r => {
        const status = (r.reservationStatus || r.statut || '').toLowerCase();
        if (['cancelled', 'annulee', 'annule', 'pending'].includes(status)) return false;
        const remaining = parseFloat(r.total || 0) - parseFloat(r.montantPaye || 0);
        return remaining > 0.01;
      });

      const map = new Map<number, ClientDebt>();
      for (const r of unpaid) {
        const c = r.client;
        if (!c) continue;
        const remaining = parseFloat(r.total || 0) - parseFloat(r.montantPaye || 0);
        if (!map.has(c.id)) {
          const extra = clientMap.get(c.id);
          map.set(c.id, {
            clientId:     c.id,
            nom:          c.nom || '',
            prenom:       extra?.prenom || c.prenom || '',
            telephone:    extra?.telephone || c.telephone || '',
            cin:          extra?.cin || c.cin || '',
            totalOwed:    0,
            reservations: [],
          });
        }
        const entry = map.get(c.id)!;
        entry.totalOwed += remaining;
        entry.reservations.push({ id: r.id, dateDebut: r.dateDebut, dateFin: r.dateFin, total: parseFloat(r.total || 0), montantPaye: parseFloat(r.montantPaye || 0), remaining, matricule: r.voiture?.immatriculation || '' });
      }

      this.debtors = Array.from(map.values()).sort((a, b) => b.totalOwed - a.totalOwed);
      this.loading = false;
    });
  }

  get filtered(): ClientDebt[] {
    if (!this.search.trim()) return this.debtors;
    const q = this.search.toLowerCase();
    return this.debtors.filter(c =>
      (c.nom || '').toLowerCase().includes(q) ||
      (c.prenom || '').toLowerCase().includes(q) ||
      (c.telephone || '').includes(q) ||
      (c.cin || '').toLowerCase().includes(q)
    );
  }

  get grandTotal(): number { return this.debtors.reduce((s, c) => s + c.totalOwed, 0); }
  get highRiskCount(): number { return this.debtors.filter(c => debtRiskLevel(c.totalOwed) === 'high').length; }

  riskLabel(amount: number): string {
    const level = debtRiskLevel(amount);
    const keys: Record<string, string> = { low: 'debtLowRisk', medium: 'debtMediumRisk', high: 'debtHighRisk' };
    return this.ts.translate(keys[level] ?? 'debtLowRisk');
  }

  toggleExpand(id: number) {
    this.expandedId = this.expandedId === id ? null : id;
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
    // so refresh the panel's own totals straight from the reservation, not from `debtors`.
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
