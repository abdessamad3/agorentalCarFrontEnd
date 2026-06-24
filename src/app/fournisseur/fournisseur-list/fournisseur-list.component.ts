import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { TranslationService } from '../../services/translation.service';
import { CrudService } from '../../services/crud.service';
import { BtnComponent } from '../../shared/btn/btn.component';
import { PaginatorComponent } from '../../shared/paginator/paginator.component';
import { Subject, of } from 'rxjs';
import { debounceTime, switchMap, takeUntil, catchError } from 'rxjs/operators';

@Component({
  selector: 'app-fournisseur-list',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, BtnComponent, PaginatorComponent],
  templateUrl: './fournisseur-list.component.html',
  styleUrls: ['../../shared/styles/crud-list.css']
})
export class FournisseurListComponent implements OnInit, OnDestroy {
  items: any[] = [];
  loading = true; error = ''; dir = 'ltr'; search = '';
  page = 1; limit = 20; total = 0;
  modalMode: 'form' | 'delete' | null = null;
  selected: any = null; form: FormGroup; isSubmitting = false;
  deleteId: number | null = null; isEditing = false;
  readonly endpoint = 'fournisseur';

  drawerOpen = false;
  drawerItem: any = null;
  readonly objectEntries = Object.entries;

  private searchSubject = new Subject<void>();
  private destroy$ = new Subject<void>();

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
    this.searchSubject.pipe(
      debounceTime(300),
      switchMap(() => {
        this.loading = true; this.error = '';
        return this.crud.getPage(this.endpoint, { page: this.page, limit: this.limit, search: this.search }).pipe(
          catchError(() => { this.error = this.ts.translate('loadError'); return of(null); })
        );
      }),
      takeUntil(this.destroy$)
    ).subscribe(r => { if (r) { this.items = r.data ?? []; this.total = r.meta?.total ?? 0; } this.loading = false; });
    this.load();
  }

  ngOnDestroy() { this.destroy$.next(); this.destroy$.complete(); }

  load() {
    this.loading = true; this.error = '';
    this.crud.getPage(this.endpoint, { page: this.page, limit: this.limit, search: this.search }).subscribe({
      next: r  => { this.items = r.data ?? []; this.total = r.meta?.total ?? 0; this.loading = false; },
      error: () => { this.error = this.ts.translate('loadError'); this.loading = false; }
    });
  }

  get filtered() { return this.items; }
  get paged(): any[] { return this.items; }

  onSearch(): void { this.page = 1; this.searchSubject.next(); }
  onPageChange(p: number): void { this.page = p; this.load(); }

  openView(item: any)    { this.drawerItem = item; this.drawerOpen = true; }
  openAdd()              { this.selected = null; this.isEditing = false; this.form.reset(); this.modalMode = 'form'; }
  openEdit(item: any)    { this.selected = item; this.isEditing = true; this.form.patchValue(item); this.modalMode = 'form'; }
  openDelete(id: number) { this.deleteId = id; this.modalMode = 'delete'; }
  closeModal()           { this.modalMode = null; this.selected = null; this.deleteId = null; this.isSubmitting = false; this.isEditing = false; }
  closeDrawer()          { this.drawerOpen = false; this.drawerItem = null; }

  @HostListener('document:keydown.escape') onEscape() { this.closeModal(); this.closeDrawer(); }

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

  displayValue(val: any): string {
    if (val === null || val === undefined) return '—';
    if (typeof val === 'object') return val.nom || val.name || val.libelle || val.marque || val.titre || JSON.stringify(val);
    return String(val);
  }

  t(key: string): string { return this.ts.translate(key); }
  initials(item: any): string {
    const name = item.raisonSociale || item.nom || '';
    return name.split(' ').slice(0, 2).map((w: string) => w[0] || '').join('').toUpperCase() || '?';
  }
}
