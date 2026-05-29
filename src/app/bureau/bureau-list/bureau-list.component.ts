import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { BureauService } from '../../services/bureauservice.service';
import { TranslationService } from '../../services/translation.service';
import { TranslatePipe } from '../../pipes/translate.pipe';

@Component({
  selector: 'app-bureau-list',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, TranslatePipe],
  templateUrl: './bureau-list.component.html',
  styleUrls: ['./bureau-list.component.css']
})
export class BureauListComponent implements OnInit {
  dir = 'ltr';
  bureaus: any[] = [];
  loading = true;
  error = '';
  page = 1;
  limit = 10;
  total = 0;
  pages = 0;
  search = '';
  statut = '';

  // Modal state
  modalMode: 'view' | 'edit' | 'delete' | null = null;
  selectedBureau: any = null;
  editForm: FormGroup;
  isSubmitting = false;
  deleteId: number | null = null;

  constructor(
    private bureauService: BureauService,
    private translationService: TranslationService,
    private fb: FormBuilder,
    public router: Router
  ) {
    this.editForm = this.fb.group({
      nom:    ['', Validators.required],
      adresse: [''],
      statut: ['actif', Validators.required]
    });
  }

  ngOnInit(): void {
    this.translationService.direction$.subscribe(d => this.dir = d);
    this.loadBureaus();
  }

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

  // ─── Modal openers ────────────────────────────────────────────────────────

  openView(bureau: any): void {
    this.selectedBureau = bureau;
    this.modalMode = 'view';
  }

  openEdit(bureau: any): void {
    this.selectedBureau = bureau;
    this.editForm.patchValue({
      nom:    bureau.nom,
      adresse: bureau.adresse || '',
      statut: bureau.statut
    });
    this.modalMode = 'edit';
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

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.closeModal();
  }

  // ─── Actions ──────────────────────────────────────────────────────────────

  saveEdit(): void {
    if (this.editForm.invalid || !this.selectedBureau) return;
    this.isSubmitting = true;
    this.bureauService.updateBureau(this.selectedBureau.id, this.editForm.value).subscribe({
      next: () => {
        this.closeModal();
        this.loadBureaus();
      },
      error: () => {
        this.isSubmitting = false;
      }
    });
  }

  confirmDelete(): void {
    if (!this.deleteId) return;
    this.bureauService.deleteBureau(this.deleteId).subscribe({
      next: () => {
        this.closeModal();
        this.loadBureaus();
      },
      error: () => this.closeModal()
    });
  }

  // ─── Filters / pagination ─────────────────────────────────────────────────

  private searchTimer: any;
  onSearchChange(): void {
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => { this.page = 1; this.loadBureaus(); }, 350);
  }

  onSearch(): void        { this.page = 1; this.loadBureaus(); }
  onFilterByStatus(s: string): void { this.statut = s; this.page = 1; this.loadBureaus(); }
  clearFilters(): void    { this.search = ''; this.statut = ''; this.page = 1; this.loadBureaus(); }
  onPreviousPage(): void  { if (this.page > 1)            { this.page--; this.loadBureaus(); } }
  onNextPage(): void      { if (this.page < this.pages)   { this.page++; this.loadBureaus(); } }
}
