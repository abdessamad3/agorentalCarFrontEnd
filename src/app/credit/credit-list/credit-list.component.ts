import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { TranslationService } from '../../services/translation.service';
import { CrudService } from '../../services/crud.service';
import { Subject, of } from 'rxjs';
import { debounceTime, switchMap, takeUntil, catchError } from 'rxjs/operators';
import { BtnComponent } from '../../shared/btn/btn.component';
import { PaginatorComponent } from '../../shared/paginator/paginator.component';

@Component({
  selector: 'app-credit-list',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, TranslatePipe, BtnComponent, PaginatorComponent, RouterLink],
  templateUrl: './credit-list.component.html',
  styleUrls: ['../../shared/styles/crud-list.css']
})
export class CreditListComponent implements OnInit, OnDestroy {
  items: any[] = [];
  voitures: any[] = [];
  loading = true; error = ''; dir = 'ltr'; search = '';
  page = 1; limit = 20; total = 0;
  modalMode: 'form' | 'delete' | null = null;
  selected: any = null; form: FormGroup; isSubmitting = false; deleteId: number | null = null; isEditing = false;
  readonly endpoint = 'credit';
  readonly objectEntries = Object.entries;

  drawerOpen = false;
  drawerItem: any = null;

  dureeMois = 0;
  dernierMensualite = 0;

  private searchSubject = new Subject<void>();
  private destroy$ = new Subject<void>();

  constructor(private crud: CrudService, private ts: TranslationService, private fb: FormBuilder, private router: Router) {
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
    this.crud.getAll('voiture').pipe(catchError(() => of([]))).subscribe(r => {
      this.voitures = Array.isArray(r) ? r : (r as any)?.data ?? [];
    });
    this.searchSubject.pipe(
      debounceTime(300),
      switchMap(() => {
        this.loading = true; this.error = '';
        return this.crud.getPage(this.endpoint, { page: this.page, limit: this.limit, search: this.search }).pipe(
          catchError(() => { this.error = this.ts.translate('loadError'); return of(null); })
        );
      }),
      takeUntil(this.destroy$)
    ).subscribe(r => { if (r) { this.items = r.data ?? []; this.total = r.meta?.total ?? this.items.length; } this.loading = false; });
    this.load();
  }

  ngOnDestroy() { this.destroy$.next(); this.destroy$.complete(); }

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
    this.crud.getPage(this.endpoint, { page: this.page, limit: this.limit, search: this.search }).subscribe({
      next: r => { this.items = r.data ?? []; this.total = r.meta?.total ?? this.items.length; this.loading = false; },
      error: () => { this.error = this.ts.translate('loadError'); this.loading = false; }
    });
  }

  get filtered() { return this.items; }
  get paged(): any[] { return this.items; }

  onSearch(): void { this.page = 1; this.searchSubject.next(); }
  onPageChange(p: number): void { this.page = p; this.load(); }

  openView(item: any)    { this.drawerItem = item; this.drawerOpen = true; }

  /** This legacy form is superseded by VehicleCredit — new records go through the richer form there. */
  openAdd() {
    this.router.navigate(['/vehicle-financing/create']);
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
  closeDrawer()          { this.drawerOpen = false; this.drawerItem = null; }

  @HostListener('document:keydown.escape') onEscape() { this.closeModal(); this.closeDrawer(); }

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
