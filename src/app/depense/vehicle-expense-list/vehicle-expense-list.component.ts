import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { TranslationService } from '../../services/translation.service';
import { CrudService } from '../../services/crud.service';
import { BtnComponent } from '../../shared/btn/btn.component';
import { PaginatorComponent } from '../../shared/paginator/paginator.component';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { Subject, of } from 'rxjs';
import { debounceTime, switchMap, takeUntil, catchError } from 'rxjs/operators';
import { PAGE_SIZE } from '../../shared/constants/pagination';

export const VEHICLE_EXPENSE_TYPES = [
  { value: 'assurance',       label: 'Insurance (Assurance)' },
  { value: 'reparation',      label: 'Repair (Réparation)' },
  { value: 'vignette',        label: 'Vignette' },
  { value: 'vidange',         label: 'Oil Change (Vidange)' },
  { value: 'adblue',          label: 'AdBlue' },
  { value: 'suivi_technique', label: 'Technical Inspection (Suivi Technique)' },
  { value: 'autre',           label: 'Other (Autre)' },
];

@Component({
  selector: 'app-vehicle-expense-list',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, BtnComponent, PaginatorComponent, TranslatePipe],
  templateUrl: './vehicle-expense-list.component.html',
  styleUrls: ['../../shared/styles/crud-list.css'],
})
export class VehicleExpenseListComponent implements OnInit, OnDestroy {
  items: any[] = [];
  voitures: any[] = [];
  loading = true;
  error = '';
  dir = 'ltr';
  search = '';
  page = 1;
  limit = PAGE_SIZE;
  total = 0;

  modalMode: 'form' | 'delete' | null = null;
  selected: any = null;
  form: FormGroup;
  isSubmitting = false;
  deleteId: number | null = null;
  isEditing = false;

  drawerOpen = false;
  drawerItem: any = null;

  pendingFile: File | null = null;
  pendingFileName = '';
  uploadingFile = false;
  fileError = '';

  readonly expenseTypes = VEHICLE_EXPENSE_TYPES;
  private searchSubject = new Subject<void>();
  private destroy$ = new Subject<void>();

  constructor(private crud: CrudService, private ts: TranslationService, private fb: FormBuilder) {
    this.form = this.fb.group({
      voitureId:   [null, Validators.required],
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
    this.loadVoitures();
    this.searchSubject.pipe(
      debounceTime(300),
      switchMap(() => {
        this.loading = true;
        return this.crud.getPage('depense', { page: this.page, limit: this.limit, search: this.search, type: 'vehicle' }).pipe(
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

  loadVoitures() {
    this.crud.getAll('voiture', { limit: 500 }).pipe(catchError(() => of([]))).subscribe(r => {
      this.voitures = Array.isArray(r) ? r : (r as any)?.data ?? [];
    });
  }

  load() {
    this.loading = true;
    this.error = '';
    this.crud.getPage('depense', { page: this.page, limit: this.limit, search: this.search, type: 'vehicle' }).subscribe({
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
    this.form.reset({ montant: 0, statut: 'pending', voitureId: null, typeDepense: '', date: new Date().toISOString().slice(0, 10) });
    this.clearFile();
    this.modalMode = 'form';
  }

  openEdit(item: any) {
    this.selected = item;
    this.isEditing = true;
    this.form.patchValue({
      voitureId:    item.voitureId,
      typeDepense:  item.typeDepense,
      montant:      item.montant,
      date:         item.dateDebut ?? item.date,
      statut:       item.statut,
      description:  item.description,
      datePaiement: item.datePaiement,
      dateFacture:  item.dateFacture,
    });
    this.clearFile();
    this.modalMode = 'form';
  }

  openDelete(id: number) { this.deleteId = id; this.modalMode = 'delete'; }
  openView(item: any)    { this.drawerItem = item; this.drawerOpen = true; }
  closeModal()           { this.modalMode = null; this.selected = null; this.deleteId = null; this.isSubmitting = false; this.isEditing = false; this.clearFile(); }
  closeDrawer()          { this.drawerOpen = false; this.drawerItem = null; }

  clearFile() { this.pendingFile = null; this.pendingFileName = ''; this.fileError = ''; }

  onFileChange(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.fileError = '';
    if (!file) { this.clearFile(); return; }
    if (file.size > 10 * 1024 * 1024) { this.fileError = 'Max 10 MB'; this.clearFile(); return; }
    const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) { this.fileError = 'PDF, JPEG ou PNG seulement'; this.clearFile(); return; }
    this.pendingFile = file;
    this.pendingFileName = file.name;
  }

  @HostListener('document:keydown.escape') onEscape() { this.closeModal(); this.closeDrawer(); }

  save() {
    if (this.form.invalid) return;
    this.isSubmitting = true;
    const payload: any = { ...this.form.value };
    if (payload.date) { payload.dateDebut = payload.date; delete payload.date; }
    if (!payload.datePaiement) delete payload.datePaiement;
    if (!payload.dateFacture)  delete payload.dateFacture;

    const req = this.isEditing
      ? this.crud.update('depense', this.selected.id, payload)
      : this.crud.create('depense', payload);

    req.subscribe({
      next: (res: any) => {
        const id = this.isEditing ? this.selected.id : res?.id;
        if (this.pendingFile && id) {
          this.uploadingFile = true;
          this.crud.uploadDepenseJustificatif(id, this.pendingFile).subscribe({
            next: () => { this.uploadingFile = false; this.closeModal(); this.load(); },
            error: () => { this.uploadingFile = false; this.closeModal(); this.load(); }
          });
        } else {
          this.closeModal(); this.load();
        }
      },
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

  t(key: string): string { return this.ts.translate(key); }

  voitureLabel(v: any): string {
    return `${v.marque ?? ''} ${v.modele ?? ''} · ${v.immatriculation ?? ''}`.trim();
  }

  typeLabel(val: string): string {
    return this.expenseTypes.find(t => t.value === val)?.label ?? val;
  }

  statutClass(s: string): string {
    return s === 'paid' ? 'badge-paid' : s === 'partial' ? 'badge-partial' : 'badge-pending';
  }
}
