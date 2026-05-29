import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { TranslationService } from '../../services/translation.service';
import { CrudService } from '../../services/crud.service';
import { PrintContratComponent } from '../print-contrat/print-contrat.component';

@Component({
  selector: 'app-contrat-list',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, TranslatePipe, PrintContratComponent],
  templateUrl: './contrat-list.component.html',
  styleUrls: ['../../shared/styles/crud-list.css']
})
export class ContratListComponent implements OnInit {
  items: any[] = [];
  loading = true; error = ''; dir = 'ltr'; search = '';
  modalMode: 'view' | 'form' | 'delete' | null = null;
  selected: any = null; form: FormGroup; isSubmitting = false; deleteId: number | null = null;
  printItem: any = null;
  readonly endpoint = 'contrat';
  readonly objectEntries = Object.entries;

  constructor(private crud: CrudService, private ts: TranslationService, private fb: FormBuilder) {
    this.form = this.fb.group({
      clientId:     ['', Validators.required],
      voitureId:    ['', Validators.required],
      dateDebut:    [''],
      dateFin:      [''],
      montantTotal: [0]
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

  openView(item: any)    { this.selected = item; this.modalMode = 'view'; }
  openAdd()              { this.selected = null; this.form.reset({ montantTotal: 0 }); this.modalMode = 'form'; }
  openDelete(id: number) { this.deleteId = id; this.modalMode = 'delete'; }
  openPrint(item: any)   { this.printItem = item; }
  closeModal()           { this.modalMode = null; this.selected = null; this.deleteId = null; this.isSubmitting = false; }

  @HostListener('document:keydown.escape') onEscape() { this.closeModal(); }

  save() {
    if (this.form.invalid) return;
    this.isSubmitting = true;
    this.crud.create(this.endpoint, this.form.value).subscribe({
      next: () => { this.closeModal(); this.load(); },
      error: () => { this.isSubmitting = false; }
    });
  }

  confirmDelete() {
    if (!this.deleteId) return;
    this.crud.remove(this.endpoint, this.deleteId).subscribe({
      next: () => { this.closeModal(); this.load(); },
      error: () => this.closeModal()
    });
  }

  displayValue(val: any): string {
    if (val === null || val === undefined) return '-';
    if (typeof val === 'object') return val.nom || val.name || val.libelle || val.marque || val.titre || JSON.stringify(val);
    return String(val);
  }
}
