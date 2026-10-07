import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { TranslationService } from '../../services/translation.service';
import { CrudService } from '../../services/crud.service';
import { BtnComponent } from '../../shared/btn/btn.component';
import { PaginatorComponent } from '../../shared/paginator/paginator.component';
import { PAGE_SIZE } from '../../shared/constants/pagination';

@Component({
  selector: 'app-tarif-saisonnier-list',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, TranslatePipe, BtnComponent, PaginatorComponent],
  templateUrl: './tarif-saisonnier-list.component.html',
  styleUrls: ['../../shared/styles/crud-list.css', './tarif-saisonnier-list.component.css']
})
export class TarifSaisonnierListComponent implements OnInit {
  items: any[] = [];
  bureaux: any[] = [];
  loading = true; error = ''; dir = 'ltr'; search = '';
  page = 1; limit = PAGE_SIZE; total = 0;
  modalMode: 'form' | 'delete' | null = null;
  selected: any = null; form: FormGroup; isSubmitting = false; deleteId: number | null = null; isEditing = false;
  readonly endpoint = 'tarif-saisonnier';
  readonly objectEntries = Object.entries;

  drawerOpen = false;
  drawerItem: any = null;

  constructor(private crud: CrudService, private ts: TranslationService, private fb: FormBuilder) {
    this.form = this.fb.group({
      libelle:        ['', Validators.required],
      dateDebut:      ['', Validators.required],
      dateFin:        ['', Validators.required],
      typeAjustement: ['percentage', Validators.required],
      valeur:         [0, Validators.required],
      bureauId:       [''],
      actif:          [true],
    });
  }

  ngOnInit() {
    this.ts.direction$.subscribe(d => this.dir = d);
    this.load();
    this.crud.getAll('bureau').subscribe({ next: r => this.bureaux = r ?? [], error: () => {} });
  }

  load() {
    this.loading = true; this.error = '';
    this.crud.getPage(this.endpoint, { page: this.page, limit: this.limit, search: this.search }).subscribe({
      next: r => { this.items = r.data ?? []; this.total = r.meta?.total ?? 0; this.loading = false; },
      error: () => { this.error = this.ts.translate('loadError'); this.loading = false; }
    });
  }

  get filtered() { return this.items; }
  get paged(): any[] { return this.items; }

  onSearch(): void { this.page = 1; this.load(); }
  onPageChange(p: number): void { this.page = p; this.load(); }

  bureauLabel(bureauId: number | null): string {
    if (!bureauId) return this.ts.translate('allBureaus');
    return this.bureaux.find(b => b.id === bureauId)?.nom ?? '—';
  }

  adjustmentLabel(item: any): string {
    const sign = (+item.valeur) >= 0 ? '+' : '';
    const unit = item.typeAjustement === 'percentage' ? '%' : ' MAD';
    return `${sign}${item.valeur}${unit}`;
  }

  openView(item: any)   { this.drawerItem = item; this.drawerOpen = true; }
  openAdd()             { this.selected = null; this.isEditing = false; this.form.reset({ typeAjustement: 'percentage', valeur: 0, actif: true, bureauId: '' }); this.modalMode = 'form'; }
  openEdit(item: any)   { this.selected = item; this.isEditing = true; this.form.patchValue({ ...item, bureauId: item.bureauId ?? '' }); this.modalMode = 'form'; }
  openDelete(id: number){ this.deleteId = id; this.modalMode = 'delete'; }
  closeModal()          { this.modalMode = null; this.selected = null; this.deleteId = null; this.isSubmitting = false; this.isEditing = false; }
  closeDrawer()         { this.drawerOpen = false; this.drawerItem = null; }

  @HostListener('document:keydown.escape') onEscape() { this.closeModal(); this.closeDrawer(); }

  save() {
    if (this.form.invalid) return;
    this.isSubmitting = true;
    const payload = { ...this.form.value, bureauId: this.form.value.bureauId || null };
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
    if (typeof val === 'object') return val.nom || val.name || val.libelle || JSON.stringify(val);
    return String(val);
  }
}
