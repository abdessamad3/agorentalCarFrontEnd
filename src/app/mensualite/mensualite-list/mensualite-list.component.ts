import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { TranslationService } from '../../services/translation.service';
import { CrudService } from '../../services/crud.service';
import { PaginatorComponent } from '../../shared/paginator/paginator.component';
import { UploadBtnComponent } from '../../shared/btn/upload-btn.component';

export interface Installment {
  id: number;
  achatId: number;
  num: number;
  dueDate: string;
  amount: number;
  balance: number;
  /** Component-level status — 'overdue' from API is mapped to 'late' for template compatibility */
  status: 'pending' | 'paid' | 'late' | 'partial';
  paidDate?: string;
  /** DataURL — kept in component memory, not persisted as binary on server */
  invoiceFile?: string;
  invoiceName?: string;
  notes?: string;
  voitureName?: string;
  immatriculation?: string;
  fournisseurName?: string;
}

@Component({
  selector: 'app-mensualite-list',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, PaginatorComponent, UploadBtnComponent],
  templateUrl: './mensualite-list.component.html',
  styleUrls: ['../../shared/styles/crud-list.css', './mensualite-list.component.css']
})
export class MensualiteListComponent implements OnInit {
  achats: any[]            = [];
  allInstallments: Installment[] = [];
  loading  = true;
  error    = '';
  dir      = 'ltr';
  filterStatus = '';
  filterAchat  = '';
  search       = '';
  page  = 1;
  limit = 20;
  total = 0;

  modalMode: 'pay' | 'invoice-preview' | null = null;
  selectedInstallment: Installment | null = null;
  payForm: FormGroup;
  isSubmitting = false;
  previewUrl: string | null = null;

  /** Local DataURL store: installment.id → dataURL (not uploaded to server) */
  private invoiceFiles: Record<number, string> = {};

  constructor(
    private crud: CrudService,
    private ts: TranslationService,
    private fb: FormBuilder
  ) {
    this.payForm = this.fb.group({
      paidDate:    [new Date().toISOString().split('T')[0]],
      notes:       [''],
      status:      ['paid'],
      amountPaid:  [null]
    });
  }

  ngOnInit() {
    this.ts.direction$.subscribe(d => this.dir = d);
    this.loadAll();
  }

  loadAll() {
    this.loading = true;
    this.error   = '';
    const params: Record<string, any> = { page: this.page, limit: this.limit };
    if (this.search.trim()) params['search'] = this.search;
    if (this.filterStatus) params['status'] = this.filterStatus;
    if (this.filterAchat) params['achatId'] = this.filterAchat;
    this.crud.getPage('achat-installment', params).subscribe({
      next: (r: any) => {
        const list: any[] = r.data ?? [];
        this.total = r.meta?.total ?? 0;
        this.allInstallments = list.map(item => this.fromApi(item));
        // Rebuild unique achat options for the filter
        const seen = new Set<number>();
        this.achats = [];
        for (const i of this.allInstallments) {
          if (!seen.has(i.achatId)) {
            seen.add(i.achatId);
            this.achats.push({ id: i.achatId, label: i.voitureName || String(i.achatId) });
          }
        }
        this.loading = false;
      },
      error: () => {
        this.error   = this.ts.translate('loadError');
        this.loading = false;
      }
    });
  }

  private fromApi(item: any): Installment {
    const rawStatus = item.status ?? 'pending';
    const status: Installment['status'] = rawStatus === 'overdue' ? 'late' : rawStatus;
    return {
      id:              item.id,
      achatId:         item.achatId,
      num:             item.num,
      dueDate:         item.dueDate,
      amount:          item.amount,
      balance:         item.balance ?? item.amount,
      status,
      paidDate:        item.paidDate  ?? undefined,
      invoiceName:     item.invoiceName ?? undefined,
      invoiceFile:     this.invoiceFiles[item.id] ?? undefined,
      notes:           item.notes    ?? undefined,
      voitureName:     item.voitureName    ?? '',
      immatriculation: item.immatriculation ?? '',
      fournisseurName: item.fournisseurName ?? ''
    };
  }

  // ── Filters & pagination ─────────────────────────────────────────────────────

  get filtered(): Installment[] {
    let res = this.allInstallments;
    if (this.filterStatus) res = res.filter(i => i.status === this.filterStatus);
    if (this.filterAchat)  res = res.filter(i => String(i.achatId) === this.filterAchat);
    if (this.search.trim()) {
      const q = this.search.toLowerCase();
      res = res.filter(i =>
        (i.voitureName || '').toLowerCase().includes(q) ||
        (i.fournisseurName || '').toLowerCase().includes(q) ||
        i.dueDate.includes(q)
      );
    }
    return [...res].sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  }

  get paged(): Installment[] { return this.filtered; }

  onSearch(): void { this.page = 1; this.loadAll(); }
  onPageChange(p: number): void { this.page = p; this.loadAll(); }

  // ── Stats ─────────────────────────────────────────────────────────────────────

  get totalPending() { return this.allInstallments.filter(i => i.status === 'pending').length; }
  get totalLate()    { return this.allInstallments.filter(i => i.status === 'late').length; }
  get totalPaid()    { return this.allInstallments.filter(i => i.status === 'paid').length; }
  get amountDue()    { return this.allInstallments.filter(i => i.status !== 'paid').reduce((s, i) => s + i.amount, 0); }

  // ── Modals ────────────────────────────────────────────────────────────────────

  openPay(inst: Installment) {
    this.selectedInstallment = inst;
    this.payForm.reset({
      paidDate:   new Date().toISOString().split('T')[0],
      status:     'paid',
      notes:      inst.notes || '',
      amountPaid: inst.amount
    });
    this.modalMode = 'pay';
  }

  openInvoicePreview(inst: Installment) {
    if (!inst.invoiceFile) return;
    this.selectedInstallment = inst;
    this.previewUrl = inst.invoiceFile;
    this.modalMode = 'invoice-preview';
  }

  closeModal() {
    this.modalMode              = null;
    this.selectedInstallment    = null;
    this.previewUrl             = null;
    this.isSubmitting           = false;
  }

  @HostListener('document:keydown.escape') onEscape() { this.closeModal(); }

  savePay() {
    if (!this.selectedInstallment) return;
    this.isSubmitting = true;
    const val = this.payForm.value;
    this.crud.create(`achat-installment/${this.selectedInstallment.id}/pay`, {
      amountPaid:  parseFloat(val.amountPaid ?? this.selectedInstallment.amount),
      paidDate:    val.paidDate,
      notes:       val.notes || null,
      invoiceName: this.selectedInstallment.invoiceName ?? null
    }).subscribe({
      next: () => {
        this.closeModal();
        this.loadAll();
      },
      error: () => { this.isSubmitting = false; }
    });
  }

  // ── Invoice file handling (DataURL, kept in memory only) ─────────────────────

  onFileSelected(file: File, inst: Installment) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      this.invoiceFiles[inst.id] = dataUrl;
      // Persist invoiceName to backend
      this.crud.update('achat-installment', inst.id, { invoiceName: file.name }).subscribe();
      // Update in-memory list
      const found = this.allInstallments.find(i => i.id === inst.id);
      if (found) { found.invoiceFile = dataUrl; found.invoiceName = file.name; }
    };
    reader.readAsDataURL(file);
  }

  removeInvoice(inst: Installment) {
    delete this.invoiceFiles[inst.id];
    this.crud.update('achat-installment', inst.id, { invoiceName: null }).subscribe();
    const found = this.allInstallments.find(i => i.id === inst.id);
    if (found) { found.invoiceFile = undefined; found.invoiceName = undefined; }
  }

  downloadInvoice(inst: Installment) {
    if (!inst.invoiceFile || !inst.invoiceName) return;
    const a = document.createElement('a');
    a.href = inst.invoiceFile;
    a.download = inst.invoiceName;
    a.click();
  }

  isImage(name?: string): boolean {
    if (!name) return false;
    return /\.(jpg|jpeg|png|webp)$/i.test(name);
  }

  // ── Helpers ───────────────────────────────────────────────────────────────────

  get achatOptions() { return this.achats; }

  payStatusClass(s: string): string {
    return { pending: 'pay-pending', paid: 'pay-paid', late: 'pay-late', partial: 'pay-partial' }[s] ?? '';
  }

  isOverdue(dueDate: string, status: string): boolean {
    if (status === 'paid') return false;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    return new Date(dueDate) < today;
  }

  daysUntil(dueDate: string): number {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const due   = new Date(dueDate); due.setHours(0, 0, 0, 0);
    return Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  }

  t(key: string): string { return this.ts.translate(key); }
  fmt(n: number): string { return (n ?? 0).toLocaleString('fr-MA') + ' MAD'; }
}
