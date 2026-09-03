import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { TranslationService } from '../../services/translation.service';
import { CrudService } from '../../services/crud.service';
import { EventBusService } from '../../services/event-bus.service';
import { BtnComponent } from '../../shared/btn/btn.component';
import { PaginatorComponent } from '../../shared/paginator/paginator.component';
import { Subject, of } from 'rxjs';
import { debounceTime, switchMap, takeUntil, catchError } from 'rxjs/operators';
import { PAGE_SIZE } from '../../shared/constants/pagination';

@Component({
  selector: 'app-depense-list',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, TranslatePipe, BtnComponent, PaginatorComponent],
  templateUrl: './depense-list.component.html',
  styleUrls: ['../../shared/styles/crud-list.css']
})
export class DepenseListComponent implements OnInit, OnDestroy {
  items: any[] = [];
  loading = true; error = ''; dir = 'ltr'; search = '';
  page = 1; limit = PAGE_SIZE; total = 0;
  modalMode: 'form' | 'delete' | null = null;
  selected: any = null; form: FormGroup; isSubmitting = false; deleteId: number | null = null; isEditing = false;
  readonly endpoint = 'depense';
  readonly objectEntries = Object.entries;

  drawerOpen = false;
  drawerItem: any = null;

  pendingFile: File | null = null;
  pendingFileName = '';
  uploadingFile = false;
  fileError = '';

  private searchSubject = new Subject<void>();
  private destroy$ = new Subject<void>();

  constructor(private crud: CrudService, private ts: TranslationService, private fb: FormBuilder, private bus: EventBusService) {
    this.form = this.fb.group({
      montant:     [0, [Validators.required, Validators.min(0)]],
      description: [''],
      date:        [''],
      categorie:   ['']
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
    ).subscribe(r => { if (r) { this.items = r.data ?? []; this.total = r.meta?.total ?? this.items.length; } this.loading = false; });
    this.load();
  }

  ngOnDestroy() { this.destroy$.next(); this.destroy$.complete(); }

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

  openView(item: any)   { this.drawerItem = item; this.drawerOpen = true; }
  openAdd()             { this.selected = null; this.isEditing = false; this.form.reset({ montant: 0 }); this.clearFile(); this.modalMode = 'form'; }
  openEdit(item: any)   { this.selected = item; this.isEditing = true; this.form.patchValue(item); this.clearFile(); this.modalMode = 'form'; }
  openDelete(id: number){ this.deleteId = id; this.modalMode = 'delete'; }
  closeModal()          { this.modalMode = null; this.selected = null; this.deleteId = null; this.isSubmitting = false; this.isEditing = false; this.clearFile(); }
  closeDrawer()         { this.drawerOpen = false; this.drawerItem = null; }

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
    const req = this.isEditing
      ? this.crud.update(this.endpoint, this.selected.id, this.form.value)
      : this.crud.create(this.endpoint, this.form.value);
    req.subscribe({
      next: (res: any) => {
        const id = this.isEditing ? this.selected.id : res?.id;
        if (this.pendingFile && id) {
          this.uploadingFile = true;
          this.crud.uploadDepenseJustificatif(id, this.pendingFile).subscribe({
            next: () => { this.uploadingFile = false; this.closeModal(); this.load(); this.bus.paymentsChanged$.next(); },
            error: () => { this.uploadingFile = false; this.closeModal(); this.load(); this.bus.paymentsChanged$.next(); }
          });
        } else {
          this.closeModal(); this.load(); this.bus.paymentsChanged$.next();
        }
      },
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