import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { CrudService } from '../../services/crud.service';
import { InvoiceService } from '../../services/invoice.service';
import { TranslationService } from '../../services/translation.service';
import { BtnComponent } from '../../shared/btn/btn.component';
import { debtRiskClass } from '../../shared/utils/debt.utils';

@Component({
  selector: 'app-client-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, BtnComponent],
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
  activeTab: 'reservations' | 'contrats' = 'reservations';
  readonly debtRiskClass = debtRiskClass;

  constructor(
    private route: ActivatedRoute,
    private crud: CrudService,
    private invoiceSvc: InvoiceService,
    private ts: TranslationService
  ) {}

  ngOnInit() {
    this.ts.direction$.subscribe(d => this.dir = d);
    const id = +this.route.snapshot.paramMap.get('id')!;
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

  get totalSpent(): number {
    return this.reservations.reduce((sum, r) => sum + (+r.montantPaye || 0), 0);
  }

  get totalBilled(): number {
    return this.reservations.reduce((sum, r) => sum + (+r.total || 0), 0);
  }

  get activeCount(): number {
    return this.reservations.filter(r => ['confirmed', 'in_progress'].includes(r.reservationStatus)).length;
  }

  statusLabel(s: string): string {
    const m: Record<string, string> = {
      confirmed:   'Confirmée', pending: 'En attente',
      cancelled:   'Annulée',   terminee: 'Terminée',
      in_progress: 'En cours',
    };
    return m[s] || s;
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
    this.invoiceSvc.generateForReservation(r.id);
  }

  setTab(t: 'reservations' | 'contrats') { this.activeTab = t; }
}
