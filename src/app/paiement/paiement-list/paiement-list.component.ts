import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { TranslationService } from '../../services/translation.service';
import { CrudService } from '../../services/crud.service';
import { BtnComponent } from '../../shared/btn/btn.component';
import { PaginatorComponent } from '../../shared/paginator/paginator.component';
import { Paiement } from '../../models/paiement.model';

@Component({
  selector: 'app-paiement-list',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, TranslatePipe, BtnComponent, PaginatorComponent],
  templateUrl: './paiement-list.component.html',
  styleUrls: ['../../shared/styles/crud-list.css']
})
export class PaiementListComponent implements OnInit {
  items: Paiement[] = [];
  contrats: any[] = [];
  loading = true; error = ''; dir = 'ltr'; search = '';
  page = 1; limit = 20; total = 0;
  modalMode: 'view' | 'form' | 'delete' | null = null;
  selected: any = null; form: FormGroup; isSubmitting = false; deleteId: number | null = null; isEditing = false;
  readonly endpoint = 'paiement';
  readonly objectEntries = Object.entries;
  voitures: any[] = [];

  constructor(private crud: CrudService, private ts: TranslationService, private fb: FormBuilder) {
    this.form = this.fb.group({
      reservationId: ['', Validators.required],
      montant:       [0, [Validators.required, Validators.min(0)]],
      datePaiement:  [''],
      modePaiement:  ['especes'],
      statut:        ['en_attente']
    });
  }

  ngOnInit() { this.ts.direction$.subscribe(d => this.dir = d); this.load(); }

  load() {
    this.loading = true; this.error = '';
    this.crud.getPage(this.endpoint, { page: this.page, limit: this.limit, search: this.search }).subscribe({
      next: r => { this.items = r.data ?? []; this.total = r.meta?.total ?? 0; this.loading = false; },
      error: () => { this.error = this.ts.translate('loadError'); this.loading = false; }
    });
    this.crud.getAll('contrat').subscribe({
      next: r => { this.contrats = Array.isArray(r) ? r : (r?.data ?? r?.['hydra:member'] ?? []); },
      error: () => {}
    });
    this.crud.getAll('voiture').subscribe({
      next: r => { this.voitures = Array.isArray(r) ? r : (r?.data ?? []); },
      error: () => {}
    });
  }

  get filteredContrats(): any[] {
    return this.contrats
      .filter(c => c.reservation?.id && parseFloat(c.reservation?.total) > 0)
      .sort((a, b) => new Date(a.reservation?.dateDebut || 0).getTime() - new Date(b.reservation?.dateDebut || 0).getTime());
  }

  contratLabel(c: any): string {
    const res = c.reservation;
    const date = res?.dateDebut ? res.dateDebut.split('T')[0] : '—';
    const amount = res?.total != null ? `${parseFloat(res.total).toFixed(0)} MAD` : '';
    const client = res?.client?.nom || '';
    return `#${c.numero || c.id} | ${date} | ${amount}${client ? ' | ' + client : ''}`;
  }

  get filtered() { return this.items; }

  get paged(): any[] { return this.items; }

  onSearch(): void { this.page = 1; this.load(); }
  onPageChange(p: number): void { this.page = p; this.load(); }

  openView(item: any)   { this.selected = item; this.modalMode = 'view'; }
  openAdd()             { this.selected = null; this.isEditing = false; this.form.reset({ montant: 0, modePaiement: 'especes', statut: 'en_attente' }); this.modalMode = 'form'; }
  openEdit(item: any)   { this.selected = item; this.isEditing = true; this.form.patchValue(item); this.modalMode = 'form'; }
  openDelete(id: number){ this.deleteId = id; this.modalMode = 'delete'; }
  closeModal()          { this.modalMode = null; this.selected = null; this.deleteId = null; this.isSubmitting = false; this.isEditing = false; }

  @HostListener('document:keydown.escape') onEscape() { this.closeModal(); }

  save() {
    if (this.form.invalid) return;
    this.isSubmitting = true;
    const req = this.isEditing
      ? this.crud.update(this.endpoint, this.selected.id, this.form.value)
      : this.crud.create(this.endpoint, this.form.value);
    req.subscribe({ next: () => { this.closeModal(); this.load(); }, error: () => { this.isSubmitting = false; } });
  }

  confirmDelete() {
    if (!this.deleteId) return;
    this.crud.remove(this.endpoint, this.deleteId).subscribe({ next: () => { this.closeModal(); this.load(); }, error: () => this.closeModal() });
  }
  carForPayment(item: any): any {
    const vId = item.reservation?.voiture?.id ?? item.reservation?.voitureId;
    if (!vId) return null;
    return this.voitures.find(v => +v.id === +vId) ?? null;
  }

  /** The contract (if any) generated from this payment's reservation — for display only. */
  contratForPayment(item: any): any {
    const resId = item.reservationId ?? item.reservation?.id;
    if (!resId) return null;
    return this.contrats.find(c => +(c.reservation?.id) === +resId) ?? null;
  }

  displayValue(val: any): string {
    if (val === null || val === undefined) return '-';
    if (typeof val === 'object') return val.nom || val.name || val.libelle || val.marque || val.titre || JSON.stringify(val);
    return String(val);
  }
}