import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { TranslationService } from '../../services/translation.service';
import { CrudService } from '../../services/crud.service';
import { BtnComponent } from '../../shared/btn/btn.component';

@Component({
  selector: 'app-paiement-list',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, TranslatePipe, BtnComponent],
  templateUrl: './paiement-list.component.html',
  styleUrls: ['../../shared/styles/crud-list.css']
})
export class PaiementListComponent implements OnInit {
  items: any[] = [];
  contrats: any[] = [];
  loading = true; error = ''; dir = 'ltr'; search = '';
  modalMode: 'view' | 'form' | 'delete' | null = null;
  selected: any = null; form: FormGroup; isSubmitting = false; deleteId: number | null = null; isEditing = false;
  readonly endpoint = 'paiement';
  readonly objectEntries = Object.entries;

  constructor(private crud: CrudService, private ts: TranslationService, private fb: FormBuilder) {
    this.form = this.fb.group({
      contratId:    ['', Validators.required],
      montant:      [0, [Validators.required, Validators.min(0)]],
      date:         [''],
      modePaiement: ['especes'],
      statut:       ['en_attente']
    });
  }

  ngOnInit() { this.ts.direction$.subscribe(d => this.dir = d); this.load(); }

  load() {
    this.loading = true; this.error = '';
    this.crud.getAll(this.endpoint).subscribe({
      next: r => { this.items = Array.isArray(r) ? r : (r?.data ?? []); this.loading = false; },
      error: () => { this.error = this.ts.translate('loadError'); this.loading = false; }
    });
    this.crud.getAll('contrat', { limit: 1000 }).subscribe({
      next: r => { this.contrats = Array.isArray(r) ? r : (r?.data ?? r?.['hydra:member'] ?? []); },
      error: () => {}
    });
  }

  get filteredContrats(): any[] {
    return this.contrats
      .filter(c => parseFloat(c.montantTotal) > 0)
      .sort((a, b) => new Date(a.dateDebut || 0).getTime() - new Date(b.dateDebut || 0).getTime());
  }

  contratLabel(c: any): string {
    const id = c.id;
    const date = c.dateDebut ? c.dateDebut.split('T')[0] : '—';
    const amount = c.montantTotal != null ? `${parseFloat(c.montantTotal).toFixed(0)} MAD` : '';
    const client = c.clientId || c.client?.id || '';
    return `#${id} | ${date} | ${amount}${client ? ' | Client ' + client : ''}`;
  }

  get filtered() {
    if (!this.search.trim()) return this.items;
    const q = this.search.toLowerCase();
    return this.items.filter(i => Object.values(i).some(v => String(v).toLowerCase().includes(q)));
  }

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
  displayValue(val: any): string {
    if (val === null || val === undefined) return '-';
    if (typeof val === 'object') return val.nom || val.name || val.libelle || val.marque || val.titre || JSON.stringify(val);
    return String(val);
  }
}