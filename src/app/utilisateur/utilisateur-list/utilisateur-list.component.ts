import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { TranslationService } from '../../services/translation.service';
import { CrudService } from '../../services/crud.service';

@Component({
  selector: 'app-utilisateur-list',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, TranslatePipe],
  templateUrl: './utilisateur-list.component.html',
  styleUrls: ['../../shared/styles/crud-list.css']
})
export class UtilisateurListComponent implements OnInit {
  items: any[] = [];
  loading = true; error = ''; dir = 'ltr'; search = '';
  modalMode: 'view' | 'form' | 'delete' | null = null;
  selected: any = null; form: FormGroup; isSubmitting = false; deleteId: number | null = null;
  readonly endpoint = 'utilisateur';
  readonly objectEntries = Object.entries;

  constructor(private crud: CrudService, private ts: TranslationService, private fb: FormBuilder) {
    this.form = this.fb.group({
      nom:    [''],
      prenom: [''],
      actif:  [true]
    });
  }

  ngOnInit() { this.ts.direction$.subscribe(d => this.dir = d); this.load(); }

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

  openView(item: any)   { this.selected = item; this.modalMode = 'view'; }
  openEdit(item: any)   { this.selected = item; this.form.patchValue(item); this.modalMode = 'form'; }
  openDelete(id: number){ this.deleteId = id; this.modalMode = 'delete'; }
  closeModal()          { this.modalMode = null; this.selected = null; this.deleteId = null; this.isSubmitting = false; }

  @HostListener('document:keydown.escape') onEscape() { this.closeModal(); }

  save() {
    this.isSubmitting = true;
    this.crud.update(this.endpoint, this.selected.id, this.form.value).subscribe({
      next: () => { this.closeModal(); this.load(); },
      error: () => { this.isSubmitting = false; }
    });
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