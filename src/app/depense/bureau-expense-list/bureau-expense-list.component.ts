import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { TranslationService } from '../../services/translation.service';
import { CrudService } from '../../services/crud.service';
import { AuthService } from '../../services/auth.service';
import { BtnComponent } from '../../shared/btn/btn.component';
import { PaginatorComponent } from '../../shared/paginator/paginator.component';
import { Subject, of } from 'rxjs';
import { debounceTime, switchMap, takeUntil, catchError } from 'rxjs/operators';

export const BUREAU_EXPENSE_TYPES = [
  { value: 'loyer',        label: 'Rent (Loyer)' },
  { value: 'salaire',      label: 'Salary (Salaire)' },
  { value: 'telephone',    label: 'Phone (Téléphone)' },
  { value: 'electricite',  label: 'Electricity (Électricité)' },
  { value: 'eau',          label: 'Water (Eau)' },
  { value: 'internet',     label: 'Internet' },
  { value: 'fournitures',  label: 'Office Supplies (Fournitures)' },
  { value: 'publicite',    label: 'Advertising (Publicité)' },
  { value: 'nettoyage',    label: 'Cleaning (Nettoyage)' },
  { value: 'autre',        label: 'Other (Autre)' },
];

@Component({
  selector: 'app-bureau-expense-list',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, BtnComponent, PaginatorComponent],
  templateUrl: './bureau-expense-list.component.html',
  styleUrls: ['../../shared/styles/crud-list.css'],
})
export class BureauExpenseListComponent implements OnInit, OnDestroy {
  items: any[] = [];
  bureaux: any[] = [];
  loading = true;
  error = '';
  dir = 'ltr';
  search = '';
  page = 1;
  limit = 20;
  total = 0;

  modalMode: 'form' | 'delete' | null = null;
  selected: any = null;
  form: FormGroup;
  isSubmitting = false;
  deleteId: number | null = null;
  isEditing = false;

  drawerOpen = false;
  drawerItem: any = null;

  readonly expenseTypes = BUREAU_EXPENSE_TYPES;

  get isAdmin(): boolean { return this.auth.hasRole('ROLE_ADMIN'); }

  private searchSubject = new Subject<void>();
  private destroy$ = new Subject<void>();

  constructor(
    private crud: CrudService,
    private ts: TranslationService,
    private auth: AuthService,
    private fb: FormBuilder
  ) {
    this.form = this.fb.group({
      bureauId:    [null],
      typeDepense: ['', Validators.required],
      montant:     [0, [Validators.required, Validators.min(0.01)]],
      date:        ['', Validators.required],
      statut:      ['pending'],
      description: [''],
      datePaiement:[''],
      dateFacture: [''],
    });
  }

  ngOnInit() {
    this.ts.direction$.subscribe(d => this.dir = d);
    if (this.isAdmin) this.loadBureaux();
    this.searchSubject.pipe(
      debounceTime(300),
      switchMap(() => {
        this.loading = true;
        return this.crud.getPage('depense', { page: this.page, limit: this.limit, search: this.search, type: 'bureau' }).pipe(
          catchError(() => { this.error = this.ts.translate('loadError'); return of(null); })
        );
      }),
      takeUntil(this.destroy$)
    ).subscribe(r => {
      if (r) { this.items = r.data ?? []; this.total = r.meta?.total ?? 0; }
      this.loading = false;
    });
    this.load();
  }

  ngOnDestroy() { this.destroy$.next(); this.destroy$.complete(); }

  loadBureaux() {
    this.crud.getAll('bureau', { limit: 200 }).pipe(catchError(() => of([]))).subscribe(r => {
      this.bureaux = Array.isArray(r) ? r : (r as any)?.data ?? [];
    });
  }

  load() {
    this.loading = true;
    this.error = '';
    this.crud.getPage('depense', { page: this.page, limit: this.limit, search: this.search, type: 'bureau' }).subscribe({
      next: r => { this.items = r.data ?? []; this.total = r.meta?.total ?? 0; this.loading = false; },
      error: () => { this.error = this.ts.translate('loadError'); this.loading = false; },
    });
  }

  get paged(): any[] { return this.items; }

  onSearch() { this.page = 1; this.searchSubject.next(); }
  onPageChange(p: number) { this.page = p; this.load(); }

  openAdd() {
    this.selected = null;
    this.isEditing = false;
    this.form.reset({ montant: 0, statut: 'pending', bureauId: null, typeDepense: '', date: new Date().toISOString().slice(0, 10) });
    this.modalMode = 'form';
  }

  openEdit(item: any) {
    this.selected = item;
    this.isEditing = true;
    this.form.patchValue({
      bureauId:     item.bureauId,
      typeDepense:  item.typeDepense,
      montant:      item.montant,
      date:         item.date,
      statut:       item.statut,
      description:  item.description,
      datePaiement: item.datePaiement,
      dateFacture:  item.dateFacture,
    });
    this.modalMode = 'form';
  }

  openDelete(id: number) { this.deleteId = id; this.modalMode = 'delete'; }
  openView(item: any)    { this.drawerItem = item; this.drawerOpen = true; }
  closeModal()           { this.modalMode = null; this.selected = null; this.deleteId = null; this.isSubmitting = false; this.isEditing = false; }
  closeDrawer()          { this.drawerOpen = false; this.drawerItem = null; }

  @HostListener('document:keydown.escape') onEscape() { this.closeModal(); this.closeDrawer(); }

  save() {
    if (this.form.invalid) return;
    this.isSubmitting = true;
    const payload: any = { ...this.form.value };
    if (!payload.datePaiement) delete payload.datePaiement;
    if (!payload.dateFacture)  delete payload.dateFacture;
    if (!payload.bureauId)     delete payload.bureauId;

    const req = this.isEditing
      ? this.crud.update('depense', this.selected.id, payload)
      : this.crud.create('depense', payload);

    req.subscribe({
      next: () => { this.closeModal(); this.load(); },
      error: () => { this.isSubmitting = false; },
    });
  }

  confirmDelete() {
    if (!this.deleteId) return;
    this.crud.remove('depense', this.deleteId).subscribe({
      next: () => { this.closeModal(); this.load(); },
      error: () => this.closeModal(),
    });
  }

  typeLabel(val: string): string {
    return this.expenseTypes.find(t => t.value === val)?.label ?? val;
  }

  statutClass(s: string): string {
    return s === 'paid' ? 'badge-paid' : s === 'partial' ? 'badge-partial' : 'badge-pending';
  }
}
