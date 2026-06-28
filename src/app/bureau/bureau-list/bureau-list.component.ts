import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { BureauService } from '../../services/bureauservice.service';
import { CrudService } from '../../services/crud.service';
import { ToastService } from '../../services/toast.service';
import { TranslationService } from '../../services/translation.service';
import { AuthService } from '../../services/auth.service';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { BtnComponent } from '../../shared/btn/btn.component';
import { Subject, of } from 'rxjs';
import { debounceTime, switchMap, takeUntil, catchError } from 'rxjs/operators';

@Component({
  selector: 'app-bureau-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, ReactiveFormsModule, TranslatePipe, BtnComponent],
  templateUrl: './bureau-list.component.html',
  styleUrls: ['../../shared/styles/crud-list.css', './bureau-list.component.css']
})
export class BureauListComponent implements OnInit, OnDestroy {
  dir = 'ltr';
  bureaus: any[] = [];
  loading = true;
  error = '';
  page = 1;
  limit = 20;
  total = 0;
  pages = 0;
  search = '';
  statut = '';

  modalMode: 'create' | 'edit' | 'delete' | null = null;
  selectedBureau: any = null;
  createForm: FormGroup;
  editForm: FormGroup;
  isSubmitting = false;
  deleteId: number | null = null;

  drawerOpen = false;
  drawerItem: any = null;
  readonly objectEntries = Object.entries;

  managers: any[] = [];
  companies: any[] = [];
  isAdmin = false;

  private searchSubject = new Subject<void>();
  private destroy$ = new Subject<void>();

  constructor(
    private bureauService: BureauService,
    private crud: CrudService,
    private translationService: TranslationService,
    private toast: ToastService,
    private fb: FormBuilder,
    private authService: AuthService,
  ) {
    this.createForm = this.fb.group({
      nom:       ['', Validators.required],
      adresse:   [''],
      telephone: [''],
      statut:    ['actif', Validators.required],
      managerId: [null],
      companyId: [null],
    });
    this.editForm = this.fb.group({
      nom:       ['', Validators.required],
      adresse:   [''],
      telephone: [''],
      statut:    ['actif', Validators.required],
      managerId: [null],
      companyId: [null],
    });
  }

  ngOnInit(): void {
    this.isAdmin = this.authService.hasRole('ROLE_ADMIN');
    this.translationService.direction$.subscribe(d => this.dir = d);
    this.crud.getAll('utilisateur').subscribe({
      next: r => { this.managers = Array.isArray(r) ? r : (r?.data ?? []); },
      error: () => {}
    });
    this.crud.getAll('company').subscribe({
      next: r => { this.companies = Array.isArray(r) ? r : (r?.data ?? []); },
      error: () => {}
    });
    this.searchSubject.pipe(
      debounceTime(300),
      switchMap(() => {
        this.loading = true; this.error = '';
        return this.bureauService.getBureaus(this.page, this.limit, this.search, this.statut).pipe(
          catchError(() => { this.error = 'Failed to load bureaus.'; return of(null); })
        );
      }),
      takeUntil(this.destroy$)
    ).subscribe(r => {
      if (r) {
        if (Array.isArray(r)) { this.bureaus = r; this.total = r.length; this.pages = 1; }
        else if (r?.data) { this.bureaus = r.data; this.total = r.meta?.total ?? r.data.length; this.pages = r.meta?.pages ?? 1; }
        else { this.bureaus = []; this.total = 0; this.pages = 0; }
      }
      this.loading = false;
    });
    this.loadBureaus();
  }

  ngOnDestroy() { this.destroy$.next(); this.destroy$.complete(); }

  loadBureaus(): void {
    this.loading = true;
    this.bureauService.getBureaus(this.page, this.limit, this.search, this.statut).subscribe({
      next: (response) => {
        if (Array.isArray(response)) {
          this.bureaus = response;
          this.total = response.length;
          this.pages = 1;
        } else if (response?.data && Array.isArray(response.data)) {
          this.bureaus = response.data;
          this.total = response.meta?.total || response.data.length;
          this.pages = response.meta?.pages || 1;
        } else {
          this.bureaus = [];
          this.total = 0;
          this.pages = 0;
        }
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.error = 'Failed to load bureaus. Please try again.';
        this.bureaus = [];
      }
    });
  }

  openCreate(): void {
    this.createForm.reset({ nom: '', adresse: '', telephone: '', statut: 'actif', managerId: null, companyId: null });
    this.modalMode = 'create';
  }

  openView(bureau: any): void {
    this.drawerItem = bureau;
    this.drawerOpen = true;
  }

  openEdit(bureau: any): void {
    this.selectedBureau = bureau;
    this.editForm.patchValue({
      nom: bureau.nom,
      adresse: bureau.adresse || '',
      telephone: bureau.telephone || '',
      statut: bureau.statut,
      managerId: bureau.managerId ?? null,
      companyId: bureau.companyId ?? null,
    });
    this.modalMode = 'edit';
  }

  getManagerLabel(user: any): string {
    return [user.prenom, user.nom].filter(Boolean).join(' ') || user.email || `#${user.id}`;
  }

  openDelete(id: number): void {
    this.deleteId = id;
    this.modalMode = 'delete';
  }

  closeModal(): void {
    this.modalMode = null;
    this.selectedBureau = null;
    this.deleteId = null;
    this.isSubmitting = false;
  }

  closeDrawer(): void { this.drawerOpen = false; this.drawerItem = null; }

  @HostListener('document:keydown.escape')
  onEscape(): void { this.closeModal(); this.closeDrawer(); }

  displayValue(val: any): string {
    if (val === null || val === undefined) return '—';
    if (typeof val === 'object') return val.nom || val.name || val.libelle || val.marque || val.titre || JSON.stringify(val);
    return String(val);
  }

  submitCreate(): void {
    if (this.createForm.invalid) return;
    this.isSubmitting = true;
    this.bureauService.createBureau(this.createForm.value).subscribe({
      next: () => {
        this.toast.show('Bureau created successfully', 'success');
        this.closeModal();
        this.loadBureaus();
      },
      error: (err) => {
        this.isSubmitting = false;
        this.toast.show(err?.error?.message || 'Failed to create bureau', 'error');
      }
    });
  }

  saveEdit(): void {
    if (this.editForm.invalid || !this.selectedBureau) return;
    this.isSubmitting = true;
    this.bureauService.updateBureau(this.selectedBureau.id, this.editForm.value).subscribe({
      next: () => {
        this.toast.show('Bureau updated successfully', 'success');
        this.closeModal();
        this.loadBureaus();
      },
      error: (err) => {
        this.isSubmitting = false;
        this.toast.show(err?.error?.message || 'Failed to update bureau', 'error');
      }
    });
  }

  confirmDelete(): void {
    if (!this.deleteId) return;
    this.bureauService.deleteBureau(this.deleteId).subscribe({
      next: () => {
        this.toast.show('Bureau deleted', 'info');
        this.closeModal();
        this.loadBureaus();
      },
      error: (err) => {
        this.toast.show(err?.error?.message || 'Failed to delete bureau', 'error');
        this.closeModal();
      }
    });
  }

  private searchTimer: any;
  onSearchChange(): void {
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => { this.page = 1; this.loadBureaus(); }, 350);
  }

  onSearch(): void                    { this.page = 1; this.searchSubject.next(); }
  onFilterByStatus(s: string): void   { this.statut = s; this.page = 1; this.loadBureaus(); }
  clearFilters(): void                { this.search = ''; this.statut = ''; this.page = 1; this.loadBureaus(); }
  onPreviousPage(): void              { if (this.page > 1)          { this.page--; this.loadBureaus(); } }
  onNextPage(): void                  { if (this.page < this.pages) { this.page++; this.loadBureaus(); } }
}
