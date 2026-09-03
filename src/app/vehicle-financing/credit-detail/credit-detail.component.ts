import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CrudService } from '../../services/crud.service';
import { TranslationService } from '../../services/translation.service';
import { ActivityLogService } from '../../services/activity-log.service';
import { environment } from '../../../environments/environment';
import { UploadBtnComponent } from '../../shared/btn/upload-btn.component';
import { StatusPipe } from '../../shared/pipes/status.pipe';

interface Installment {
  id: number;
  installmentNumber: number;
  dueDate: string;
  principalAmount: number;
  interestAmount: number;
  amountDue: number;
  amountPaid: number;
  remainingAmount: number;
  paidAt?: string;
  status: string;
  daysUntilDue?: number;
}

interface Payment {
  id: number;
  amount: number;
  paymentDate: string;
  paymentType: string;
  paymentMethod: string;
  referenceNumber?: string;
  notes?: string;
  installmentNumber?: number;
  attachments: { id: number; fileName: string; filePath: string; fileType: string }[];
}

interface Document {
  id: number;
  documentType: string;
  filePath: string;
  fileName?: string;
  notes?: string;
  uploadedAt?: string;
}

@Component({
  selector: 'app-credit-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, UploadBtnComponent, StatusPipe],
  templateUrl: './credit-detail.component.html',
  styleUrls: ['../../shared/styles/reports.css'],
})
export class CreditDetailComponent implements OnInit {
  loading = true;
  dir = 'ltr';
  id = 0;

  credit: any = null;
  installments: Installment[] = [];
  payments: Payment[] = [];
  documents: Document[] = [];

  activeTab: 'installments' | 'payments' | 'documents' = 'installments';

  // Payment modal
  showPaymentModal = false;
  savingPayment    = false;
  paymentForm = {
    installmentId:   null as number | null,
    paymentType:     'scheduled',
    paymentMethod:   'bank_transfer',
    amount:          0,
    paymentDate:     new Date().toISOString().substring(0, 10),
    referenceNumber: '',
    notes:           '',
  };
  paymentFiles: File[] = [];
  paymentError = '';

  // Document upload
  showDocModal = false;
  savingDoc    = false;
  docForm = { documentType: 'financing_contract', notes: '' };
  docFile: File | null = null;
  docError = '';

  // Status modal
  showStatusModal = false;
  newStatus = '';

  get paymentTypes() {
    return [
      { value: 'scheduled',  label: this.t('scheduledPayment') },
      { value: 'partial',    label: this.t('partialPayment') },
      { value: 'advance',    label: this.t('advancePayment') },
      { value: 'extra',      label: this.t('extraPayment') },
      { value: 'settlement', label: this.t('fullSettlement') },
      { value: 'refund',     label: this.t('refundPayment') },
    ];
  }

  get paymentMethods() {
    return [
      { value: 'bank_transfer', label: this.t('transfer') },
      { value: 'check',         label: this.t('cheque') },
      { value: 'cash',          label: this.t('especes') || 'Espèces' },
      { value: 'direct_debit',  label: 'Prélèvement auto' },
      { value: 'other',         label: this.t('other') },
    ];
  }

  get docTypes() {
    return [
      { value: 'financing_contract',    label: this.t('newFinancingContractTitle') },
      { value: 'bank_approval',         label: this.t('creditPendingApproval') },
      { value: 'amortization_schedule', label: this.t('scheduleTab').replace(/📅\s*/, '') },
      { value: 'insurance',             label: this.t('typeInsuranceLbl').replace(/🛡️\s*/, '') },
      { value: 'settlement_certificate',label: this.t('fullSettlement') },
      { value: 'other',                 label: this.t('other') || 'Autre' },
    ];
  }

  get contractStatuses() {
    return [
      { value: 'draft',            label: this.t('creditDraft') },
      { value: 'pending_approval', label: this.t('creditPendingApproval') },
      { value: 'active',           label: this.t('creditActive') },
      { value: 'completed',        label: this.t('creditCompleted') },
      { value: 'defaulted',        label: this.t('creditDefaulted') },
      { value: 'cancelled',        label: this.t('creditCancelled2') },
    ];
  }

  serverBase = environment.serverUrl ?? 'http://localhost:8000';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private crud: CrudService,
    private ts: TranslationService,
    private activityLog: ActivityLogService,
  ) {}

  t(key: string): string { return this.ts.translate(key); }

  ngOnInit() {
    this.ts.direction$.subscribe(d => this.dir = d);
    this.id = +this.route.snapshot.paramMap.get('id')!;
    this.activityLog.logView('Credit', this.id);
    this.load();
  }

  load() {
    this.loading = true;
    this.crud.getAll('vehicle-credit/' + this.id).subscribe({
      next: (res: any) => {
        this.credit       = res;
        this.installments = res.installments ?? [];
        this.payments     = res.payments     ?? [];
        this.loading      = false;
        this.loadDocuments();
      },
      error: () => { this.loading = false; },
    });
  }

  loadDocuments() {
    this.crud.getAll('vehicle-credit-document', { vehicleCreditId: this.id }).subscribe({
      next: (res: any) => { this.documents = Array.isArray(res) ? res : []; },
    });
  }

  // ── Installments ──────────────────────────────────────────────────────────

  get nextUnpaidInstallment(): Installment | undefined {
    return this.installments.find(i => i.status !== 'paid');
  }

  // ── Payments ──────────────────────────────────────────────────────────────

  openPaymentModal(installment?: Installment) {
    this.paymentError = '';
    this.paymentFiles = [];
    this.paymentForm  = {
      installmentId:   installment?.id ?? this.nextUnpaidInstallment?.id ?? null,
      paymentType:     'scheduled',
      paymentMethod:   'bank_transfer',
      amount:          installment ? +installment.remainingAmount : +(this.credit?.monthlyInstallment ?? 0),
      paymentDate:     new Date().toISOString().substring(0, 10),
      referenceNumber: '',
      notes:           '',
    };
    this.showPaymentModal = true;
  }

  onPaymentFiles(files: File[]) {
    this.paymentFiles = files;
  }

  submitPayment() {
    if (!this.paymentForm.amount || this.paymentForm.amount <= 0) {
      this.paymentError = 'Please enter a valid amount.';
      return;
    }
    this.paymentError  = '';
    this.savingPayment = true;

    const payload = { vehicleCreditId: this.id, ...this.paymentForm };

    this.crud.create('vehicle-credit-payment', payload).subscribe({
      next: (res: any) => {
        // Upload attachments if any
        if (this.paymentFiles.length > 0 && res?.id) {
          this.uploadPaymentFiles(res.id, () => {
            this.savingPayment = false;
            this.showPaymentModal = false;
            this.load();
          });
        } else {
          this.savingPayment = false;
          this.showPaymentModal = false;
          this.load();
        }
      },
      error: (err: any) => {
        this.savingPayment = false;
        this.paymentError  = err?.error?.error ?? 'Error registering payment';
      },
    });
  }

  private uploadPaymentFiles(paymentId: number, done: () => void) {
    const uploads = this.paymentFiles.map(file => {
      const fd = new FormData();
      fd.append('file', file);
      return fetch(`${environment.apiUrl}/vehicle-credit-payment/${paymentId}/attachment`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('token') ?? ''}` },
        body: fd,
      });
    });
    Promise.all(uploads).finally(done);
  }

  deletePayment(paymentId: number) {
    if (!confirm('Delete this payment?')) return;
    this.crud.remove('vehicle-credit-payment', paymentId).subscribe(() => this.load());
  }

  // ── Documents ─────────────────────────────────────────────────────────────

  openDocModal() {
    this.docError = '';
    this.docFile  = null;
    this.docForm  = { documentType: 'financing_contract', notes: '' };
    this.showDocModal = true;
  }

  onDocFile(file: File) {
    this.docFile = file;
  }

  submitDocument() {
    if (!this.docFile) { this.docError = 'Please select a file.'; return; }
    this.docError  = '';
    this.savingDoc = true;

    const fd = new FormData();
    fd.append('file', this.docFile);
    fd.append('vehicleCreditId', String(this.id));
    fd.append('documentType', this.docForm.documentType);
    fd.append('notes', this.docForm.notes ?? '');

    fetch(`${environment.apiUrl}/vehicle-credit-document`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${localStorage.getItem('token') ?? ''}` },
      body: fd,
    })
      .then(r => r.json())
      .then(() => {
        this.savingDoc    = false;
        this.showDocModal = false;
        this.loadDocuments();
      })
      .catch(() => {
        this.savingDoc = false;
        this.docError  = 'Upload failed';
      });
  }

  deleteDocument(docId: number) {
    if (!confirm('Delete document?')) return;
    this.crud.remove('vehicle-credit-document', docId).subscribe(() => this.loadDocuments());
  }

  // ── Status change ─────────────────────────────────────────────────────────

  openStatusModal() {
    this.newStatus     = this.credit?.status ?? 'active';
    this.showStatusModal = true;
  }

  updateStatus() {
    this.crud.update('vehicle-credit', this.id, { status: this.newStatus }).subscribe({
      next: () => { this.showStatusModal = false; this.load(); },
    });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  statusClass(s: string): string {
    const map: Record<string, string> = {
      draft: 'sp-other', pending_approval: 'sp-maintenance',
      active: 'sp-available', completed: 'sp-rented',
      defaulted: 'sp-other', cancelled: 'sp-other',
    };
    return map[s] ?? 'sp-other';
  }

  installmentStatusClass(s: string): string {
    const map: Record<string, string> = {
      pending: 'doc-none', due_soon: 'doc-soon', due_today: 'doc-soon',
      partial: 'doc-soon', paid: 'doc-ok', overdue: 'doc-expired',
    };
    return map[s] ?? 'doc-none';
  }

  paymentTypeLabel(t: string): string {
    return this.paymentTypes.find(x => x.value === t)?.label ?? t;
  }

  paymentMethodLabel(m: string): string {
    return this.paymentMethods.find(x => x.value === m)?.label ?? m;
  }

  docTypeLabel(t: string): string {
    return this.docTypes.find(x => x.value === t)?.label ?? t;
  }

  fmt(n: number | string): string {
    const v = +n || 0;
    return v.toLocaleString('fr-MA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' MAD';
  }

  fileUrl(path: string): string {
    return this.serverBase + path;
  }

  progressColor(pct: number): string {
    if (pct >= 80) return '#276749';
    if (pct >= 50) return '#2b6cb0';
    if (pct >= 25) return '#d69e2e';
    return '#c53030';
  }

  isImageFile(path: string): boolean {
    return /\.(jpg|jpeg|png|gif|webp)$/i.test(path);
  }
}
