import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { TranslationService } from '../../services/translation.service';
import { CrudService } from '../../services/crud.service';

@Component({
  selector: 'app-fournisseur-list',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './fournisseur-list.component.html',
  styleUrls: ['../../shared/styles/crud-list.css']
})
export class FournisseurListComponent implements OnInit {
  items: any[] = [];
  loading = true; error = ''; dir = 'ltr'; search = '';
  modalMode: 'view' | 'form' | 'delete' | null = null;
  selected: any = null; form: FormGroup; isSubmitting = false;
  deleteId: number | null = null; isEditing = false;
  readonly endpoint = 'fournisseur';

  constructor(private crud: CrudService, private ts: TranslationService, private fb: FormBuilder) {
    this.form = this.fb.group({
      raisonSociale: ['', Validators.required],
      nom:           [''],
      prenom:        [''],
      telephone:     [''],
      email:         ['', [Validators.email]],
      adresse:       [''],
      ville:         [''],
      ice:           [''],
      infoBancaire:  [''],
      notes:         ['']
    });
  }

  ngOnInit() {
    this.ts.direction$.subscribe(d => this.dir = d);
    this.load();
  }

  load() {
    this.loading = true; this.error = '';
    this.crud.getAll(this.endpoint).subscribe({
      next: r  => { this.items = Array.isArray(r) ? r : (r?.data ?? []); this.loading = false; },
      error: () => { this.error = this.ts.translate('loadError'); this.loading = false; }
    });
  }

  get filtered() {
    if (!this.search.trim()) return this.items;
    const q = this.search.toLowerCase();
    return this.items.filter(i => Object.values(i).some(v => String(v).toLowerCase().includes(q)));
  }

  openView(item: any)    { this.selected = item; this.modalMode = 'view'; }
  openAdd()              { this.selected = null; this.isEditing = false; this.form.reset(); this.modalMode = 'form'; }
  openEdit(item: any)    { this.selected = item; this.isEditing = true; this.form.patchValue(item); this.modalMode = 'form'; }
  openDelete(id: number) { this.deleteId = id; this.modalMode = 'delete'; }
  closeModal()           { this.modalMode = null; this.selected = null; this.deleteId = null; this.isSubmitting = false; this.isEditing = false; }

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
    this.crud.remove(this.endpoint, this.deleteId).subscribe({
      next: () => { this.closeModal(); this.load(); }, error: () => this.closeModal()
    });
  }

  t(key: string): string { return this.ts.translate(key); }
  initials(item: any): string {
    const name = item.raisonSociale || item.nom || '';
    return name.split(' ').slice(0, 2).map((w: string) => w[0] || '').join('').toUpperCase() || '?';
  }
}
