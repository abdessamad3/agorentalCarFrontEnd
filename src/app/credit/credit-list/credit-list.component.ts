import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { TranslationService } from '../../services/translation.service';
import { CrudService } from '../../services/crud.service';
import { catchError } from 'rxjs/operators';
import { of } from 'rxjs';

@Component({
  selector: 'app-credit-list',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, TranslatePipe],
  templateUrl: './credit-list.component.html',
  styleUrls: ['../../shared/styles/crud-list.css']
})
export class CreditListComponent implements OnInit {
  items: any[] = [];
  voitures: any[] = [];
  loading = true; error = ''; dir = 'ltr'; search = '';
  modalMode: 'view' | 'form' | 'delete' | null = null;
  selected: any = null; form: FormGroup; isSubmitting = false; deleteId: number | null = null; isEditing = false;
  readonly endpoint = 'credit';
  readonly objectEntries = Object.entries;

  dureeMois = 0;
  dernierMensualite = 0;

  constructor(private crud: CrudService, private ts: TranslationService, private fb: FormBuilder) {
    this.form = this.fb.group({
      voitureId:    [''],
      montantTotal: [0, [Validators.required, Validators.min(0)]],
      apport:       [0, [Validators.required, Validators.min(0)]],
      mensualite:   [0, [Validators.required, Validators.min(1)]],
      dateDebut:    [''],
      dateFin:      [''],
      statut:       ['en_cours']
    });

    ['montantTotal', 'apport', 'mensualite'].forEach(f =>
      this.form.get(f)?.valueChanges.subscribe(() => this.recalculate())
    );
  }

  ngOnInit() {
    this.ts.direction$.subscribe(d => this.dir = d);
    this.crud.getAll('voiture', { limit: 1000 }).pipe(catchError(() => of([]))).subscribe(r => {
      this.voitures = Array.isArray(r) ? r : (r as any)?.data ?? [];
    });
    this.load();
  }

  recalculate() {
    const total     = +(this.form.get('montantTotal')?.value ?? 0);
    const apport    = +(this.form.get('apport')?.value ?? 0);
    const mensualite = +(this.form.get('mensualite')?.value ?? 0);
    const reste = Math.max(0, total - apport);
    if (mensualite > 0) {
      this.dureeMois = Math.floor(reste / mensualite);
      this.dernierMensualite = +(reste - this.dureeMois * mensualite).toFixed(2);
    } else {
      this.dureeMois = 0;
      this.dernierMensualite = 0;
    }
  }

  load() {
    this.loading = true; this.error = '';
    this.crud.getAll(this.endpoint).subscribe({
      next: r => { this.items = Array.isArray(r) ? r : (r?.data ?? []); this.loading = false; },
      error: () => { this.error = this.ts.translate('loadError'); this.loading = false; }
    });
  }

  get filtered() {
    if (!this.search.trim()) return this.items;
    const q = this.search.toLowerCase();
    return this.items.filter(i => Object.values(i).some(v => String(v).toLowerCase().includes(q)));
  }

  openView(item: any)    { this.selected = item; this.modalMode = 'view'; }

  openAdd() {
    this.selected = null; this.isEditing = false;
    this.dureeMois = 0; this.dernierMensualite = 0;
    this.form.reset({ montantTotal: 0, apport: 0, mensualite: 0, statut: 'en_cours' });
    this.modalMode = 'form';
  }

  openEdit(item: any) {
    this.selected = item; this.isEditing = true;
    this.form.patchValue({ ...item, voitureId: item.voitureId ?? '' });
    this.dureeMois = item.dureeMois ?? 0;
    this.dernierMensualite = item.dernierMensualite ?? 0;
    this.modalMode = 'form';
  }

  openDelete(id: number) { this.deleteId = id; this.modalMode = 'delete'; }
  closeModal()           { this.modalMode = null; this.selected = null; this.deleteId = null; this.isSubmitting = false; this.isEditing = false; }

  @HostListener('document:keydown.escape') onEscape() { this.closeModal(); }

  save() {
    if (this.form.invalid) return;
    this.isSubmitting = true;
    const payload = { ...this.form.value, dureeMois: this.dureeMois, dernierMensualite: this.dernierMensualite };
    const req = this.isEditing
      ? this.crud.update(this.endpoint, this.selected.id, payload)
      : this.crud.create(this.endpoint, payload);
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
