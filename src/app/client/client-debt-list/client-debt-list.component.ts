import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { CrudService } from '../../services/crud.service';
import { TranslationService } from '../../services/translation.service';
import { EventBusService } from '../../services/event-bus.service';
import { debtRiskClass, debtRiskLevel } from '../../shared/utils/debt.utils';

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
}

@Component({
  selector: 'app-client-debt-list',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule],
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

  // Payment modal state
  payModalOpen = false;
  payReservation: ReservationDebt | null = null;
  payClientName = '';
  paySubmitting = false;
  payError = '';
  payForm: FormGroup;

  readonly debtRiskClass = debtRiskClass;
  readonly debtRiskLevel = debtRiskLevel;

  readonly PAY_MODES = [
    { value: 'especes',   label: 'Espèces / Cash' },
    { value: 'virement',  label: 'Virement' },
    { value: 'cheque',    label: 'Chèque' },
    { value: 'carte',     label: 'Carte bancaire' },
  ];

  constructor(
    private crud: CrudService,
    private ts: TranslationService,
    private fb: FormBuilder,
    private bus: EventBusService,
    private router: Router
  ) {
    this.payForm = this.fb.group({
      montant:      [null, [Validators.required, Validators.min(0.01)]],
      datePaiement: ['',   Validators.required],
      modePaiement: ['especes'],
      note:         [''],
    });
  }

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
        entry.reservations.push({ id: r.id, dateDebut: r.dateDebut, dateFin: r.dateFin, total: parseFloat(r.total || 0), montantPaye: parseFloat(r.montantPaye || 0), remaining });
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

  // ── Payment modal ────────────────────────────────────────────────────────────

  openPayment(r: ReservationDebt, clientName: string) {
    this.payReservation = r;
    this.payClientName  = clientName;
    this.payError       = '';
    const today = new Date().toISOString().split('T')[0];
    this.payForm.reset({
      montant:      r.remaining,
      datePaiement: today,
      modePaiement: 'especes',
      note:         '',
    });
    this.payForm.get('montant')!.setValidators([Validators.required, Validators.min(0.01), Validators.max(r.remaining)]);
    this.payForm.get('montant')!.updateValueAndValidity();
    this.payModalOpen = true;
  }

  closePayModal() {
    this.payModalOpen   = false;
    this.payReservation = null;
    this.payClientName  = '';
    this.payError       = '';
    this.paySubmitting  = false;
  }

  submitPayment() {
    if (this.payForm.invalid || !this.payReservation) return;
    this.paySubmitting = true;
    this.payError = '';
    const payload = { ...this.payForm.value, reservationId: this.payReservation.id };
    this.crud.create('paiement', payload).subscribe({
      next: () => {
        this.bus.paymentsChanged$.next();
        this.closePayModal();
        this.load();
      },
      error: (err: any) => {
        this.paySubmitting = false;
        this.payError = err?.error?.message || this.ts.translate('saveError') || 'Error saving payment';
      },
    });
  }

  @HostListener('document:keydown.escape') onEsc() { this.closePayModal(); }

  t(key: string) { return this.ts.translate(key); }
}
