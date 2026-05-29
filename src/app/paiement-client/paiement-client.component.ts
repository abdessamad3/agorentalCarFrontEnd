import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TranslationService } from '../services/translation.service';
import { CrudService } from '../services/crud.service';
import { EventBusService } from '../services/event-bus.service';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { BtnComponent } from '../shared/btn/btn.component';

@Component({
  selector: 'app-paiement-client',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule, BtnComponent],
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
      history:      this.crud.getAll('historique-paiement').pipe(catchError(() => of([]))),
      reservations: this.crud.getAll('reservation').pipe(catchError(() => of([]))),
    }).subscribe(({ history, reservations }) => {
      this.items        = this.toArr(history);
      this.reservations = this.toArr(reservations)
        .filter((r: any) => !['cancelled', 'annulee', 'annule'].includes((r.reservationStatus || r.statut || '').toLowerCase()));
      this.loading = false;
    });
  }

  private toArr(r: any): any[] {
    return Array.isArray(r) ? r : (r?.data ?? []);
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
    this.crud.create('historique-paiement', this.form.value).subscribe({
      next: () => { this.closeModal(); this.loadAll(); this.bus.paymentsChanged$.next(); this.isSubmitting = false; },
      error: () => { this.isSubmitting = false; }
    });
  }

  confirmDelete(item: any) { this.deleteTarget = item; }

  doDelete() {
    if (!this.deleteTarget) return;
    this.crud.remove('historique-paiement', this.deleteTarget.id).subscribe({
      next: () => { this.deleteTarget = null; this.loadAll(); this.bus.paymentsChanged$.next(); },
      error: () => { this.deleteTarget = null; }
    });
  }

  t(key: string) { return this.ts.translate(key); }
}
