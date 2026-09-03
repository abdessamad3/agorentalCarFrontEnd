import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { TranslationService } from '../services/translation.service';
import { CrudService } from '../services/crud.service';
import { EventBusService } from '../services/event-bus.service';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { toArr } from '../shared/utils/rx.utils';
import { BtnComponent } from '../shared/btn/btn.component';

@Component({
  selector: 'app-paiement-client',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, BtnComponent],
  templateUrl: './paiement-client.component.html',
  styleUrls: ['./paiement-client.component.css']
})
export class PaiementClientComponent implements OnInit {
  items: any[] = [];
  reservations: any[] = [];
  loading = true;
  error = '';
  dir = 'ltr';
  search = '';

  modalOpen = false;
  deleteTarget: any = null;
  isSubmitting = false;
  form: FormGroup;

  constructor(
    private crud: CrudService,
    private ts: TranslationService,
    private fb: FormBuilder,
    private bus: EventBusService
  ) {
    this.form = this.fb.group({
      reservationId: ['', Validators.required],
      montant:       [null, [Validators.required, Validators.min(0.01)]],
      datePaiement:  ['', Validators.required],
      modePaiement:  ['especes'],
      note:          [''],
    });
  }

  ngOnInit() {
    this.ts.direction$.subscribe(d => this.dir = d);
    this.loadAll();
  }

  loadAll() {
    this.loading = true;
    forkJoin({
      history:      this.crud.getAll('paiement').pipe(catchError(() => of([]))),
      reservations: this.crud.getAll('reservation').pipe(catchError(() => of([]))),
    }).subscribe(({ history, reservations }) => {
      this.items        = toArr(history);
      this.reservations = toArr(reservations)
        .filter((r: any) => !['cancelled', 'annulee', 'annule'].includes((r.reservationStatus || r.statut || '').toLowerCase()));
      this.loading = false;
    });
  }


  get selectableReservations(): any[] {
    return this.reservations
      .filter((r: any) => {
        const remaining = parseFloat(r.total || 0) - parseFloat(r.montantPaye || 0);
        return remaining > 0;
      })
      .sort((a: any, b: any) =>
        new Date(a.dateDebut || 0).getTime() - new Date(b.dateDebut || 0).getTime()
      );
  }

  get filtered(): any[] {
    if (!this.search.trim()) return this.items;
    const q = this.search.toLowerCase();
    return this.items.filter(i => {
      const client = `${i.reservation?.client?.nom || ''} ${i.reservation?.client?.prenom || ''}`.toLowerCase();
      const car    = `${i.reservation?.voiture?.marque || ''} ${i.reservation?.voiture?.modele || ''}`.toLowerCase();
      const note   = (i.note || '').toLowerCase();
      return client.includes(q) || car.includes(q) || note.includes(q);
    });
  }

  get totalCollected(): number {
    return this.items.reduce((s, i) => s + parseFloat(i.montant || 0), 0);
  }

  maxPayable(reservationId: any): number {
    const r = this.reservations.find((x: any) => x.id == reservationId);
    if (!r) return Infinity;
    const total = parseFloat(r.total || r.montant || 0);
    const paid  = parseFloat(r.montantPaye || 0);
    return Math.max(0, total - paid);
  }

  reservationLabel(r: any): string {
    const client = `${r.client?.nom || ''} ${r.client?.prenom || ''}`.trim();
    const car    = `${r.voiture?.marque || ''} ${r.voiture?.modele || ''}`.trim();
    const dates  = `${r.dateDebut || ''} → ${r.dateFin || ''}`;
    const remaining = Math.max(0, parseFloat(r.total || 0) - parseFloat(r.montantPaye || 0));
    return `${client} — ${car} (${dates}) | reste: ${remaining.toFixed(0)} MAD`;
  }

  openAdd() {
    const today = new Date().toISOString().split('T')[0];
    this.form.reset({ datePaiement: today, modePaiement: 'especes' });
    this.modalOpen = true;
  }

  closeModal() { this.modalOpen = false; this.deleteTarget = null; }

  @HostListener('document:keydown.escape') onEsc() { this.closeModal(); }

  submit() {
    if (this.form.invalid) return;
    this.isSubmitting = true;
    this.crud.create('paiement', this.form.value).subscribe({
      next: () => { this.closeModal(); this.loadAll(); this.bus.paymentsChanged$.next(); this.isSubmitting = false; },
      error: () => { this.isSubmitting = false; }
    });
  }

  confirmDelete(item: any) { this.deleteTarget = item; }

  doDelete() {
    if (!this.deleteTarget) return;
    this.crud.remove('paiement', this.deleteTarget.id).subscribe({
      next: () => { this.deleteTarget = null; this.loadAll(); this.bus.paymentsChanged$.next(); },
      error: () => { this.deleteTarget = null; }
    });
  }

  get totalOutstanding(): number {
    return this.reservations
      .filter((r: any) => !['annulee','cancelled','annule'].includes((r.reservationStatus || r.statut || '').toLowerCase()))
      .reduce((s: number, r: any) => s + Math.max(0, parseFloat(r.total || 0) - parseFloat(r.montantPaye || 0)), 0);
  }

  clientInitials(item: any): string {
    const nom    = item.reservation?.client?.nom    || '';
    const prenom = item.reservation?.client?.prenom || '';
    return ((nom[0] || '') + (prenom[0] || '')).toUpperCase() || '?';
  }

  avatarColor(item: any): string {
    const palette = ['#3182ce','#38a169','#d69e2e','#805ad5','#e53e3e','#dd6b20','#319795'];
    const name = item.reservation?.client?.nom || '';
    return palette[name.charCodeAt(0) % palette.length] || palette[0];
  }

  isFullyPaid(item: any): boolean {
    const total = parseFloat(item.reservation?.total || 0);
    const paid  = parseFloat(item.reservation?.montantPaye || 0);
    return total > 0 && paid >= total;
  }

  paymentPct(item: any): number {
    const total = parseFloat(item.reservation?.total || 0);
    const paid  = parseFloat(item.reservation?.montantPaye || 0);
    if (total <= 0) return 0;
    return Math.min(100, Math.round((paid / total) * 100));
  }

  remaining(item: any): number {
    const total = parseFloat(item.reservation?.total || 0);
    const paid  = parseFloat(item.reservation?.montantPaye || 0);
    return Math.max(0, total - paid);
  }

  t(key: string) { return this.ts.translate(key); }
}
