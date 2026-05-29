import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { TranslationService } from '../../services/translation.service';
import { CrudService } from '../../services/crud.service';
import { catchError } from 'rxjs/operators';
import { of } from 'rxjs';

export interface Installment {
  id: string;
  achatId: number;
  num: number;
  dueDate: string;
  amount: number;
  balance: number;
  status: 'pending' | 'paid' | 'late' | 'partial';
  paidDate?: string;
  invoiceFile?: string;
  invoiceName?: string;
  notes?: string;
  // enriched from purchase
  voitureName?: string;
  fournisseurName?: string;
}

@Component({
  selector: 'app-mensualite-list',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './mensualite-list.component.html',
  styleUrls: ['../../shared/styles/crud-list.css', './mensualite-list.component.css']
})
export class MensualiteListComponent implements OnInit {
  achats: any[]        = [];
  voitures: any[]      = [];
  fournisseurs: any[]  = [];
  allInstallments: Installment[] = [];
  loading = true; error = ''; dir = 'ltr';
  filterStatus = ''; filterAchat = ''; search = '';

  modalMode: 'pay' | 'invoice-preview' | null = null;
  selectedInstallment: Installment | null = null;
  payForm: FormGroup;
  isSubmitting = false;
  uploadingFile = false;
  previewUrl: string | null = null;

  // local payment state (keyed by installment id)
  private paymentState: Record<string, Partial<Installment>> = {};

  constructor(
    private crud: CrudService,
    private ts: TranslationService,
    private fb: FormBuilder
  ) {
    this.payForm = this.fb.group({
      paidDate: [new Date().toISOString().split('T')[0]],
      notes:    [''],
      status:   ['paid']
    });
  }

  ngOnInit() {
    this.ts.direction$.subscribe(d => this.dir = d);
    this.loadAll();
  }

  loadAll() {
    this.loading = true; this.error = '';
    const voitures$    = this.crud.getAll('voiture',      { limit: 1000 }).pipe(catchError(() => of([])));
    const fournisseurs$ = this.crud.getAll('fournisseur', { limit: 1000 }).pipe(catchError(() => of([])));
    const achats$      = this.crud.getAll('achat-voiture').pipe(catchError(() => of([])));

    voitures$.subscribe(r => { this.voitures = Array.isArray(r) ? r : (r as any)?.data ?? []; });
    fournisseurs$.subscribe(r => { this.fournisseurs = Array.isArray(r) ? r : (r as any)?.data ?? []; });
    achats$.subscribe({
      next: r => {
        this.achats = Array.isArray(r) ? r : (r as any)?.data ?? [];
        this.buildInstallments();
        this.loading = false;
      },
      error: () => {
        this.error = this.ts.translate('loadError');
        this.loading = false;
      }
    });
  }

  buildInstallments() {
    this.allInstallments = [];
    const today = new Date(); today.setHours(0, 0, 0, 0);

    for (const achat of this.achats) {
      if (achat.typeFinancement === 'comptant') continue;
      const rest = Math.max(0, (achat.prixAchat || 0) - (achat.apport || 0));
      const mensualite = achat.mensualite || 0;
      if (mensualite <= 0 || rest <= 0) continue;

      const months  = Math.floor(rest / mensualite);
      const lastAmt = +(rest - months * mensualite).toFixed(2);
      const base    = achat.dateDebutCredit ? new Date(achat.dateDebutCredit) : new Date(achat.dateAchat || Date.now());
      let balance   = rest;
      const vName   = this.getVoitureName(achat.voitureId);
      const fName   = this.getFournisseurName(achat.fournisseurId);

      for (let i = 1; i <= months; i++) {
        const d = new Date(base);
        d.setMonth(d.getMonth() + i);
        balance = +(balance - mensualite).toFixed(2);
        const due = new Date(d); due.setHours(0, 0, 0, 0);
        const id  = `${achat.id}-${i}`;
        const saved = this.paymentState[id];
        let status: Installment['status'] = saved?.status ?? (due < today ? 'late' : 'pending');
        this.allInstallments.push({
          id, achatId: achat.id, num: i,
          dueDate: d.toISOString().split('T')[0],
          amount: mensualite,
          balance: Math.max(0, balance),
          status,
          paidDate:    saved?.paidDate,
          invoiceFile: saved?.invoiceFile,
          invoiceName: saved?.invoiceName,
          notes:       saved?.notes,
          voitureName: vName,
          fournisseurName: fName
        });
      }

      if (lastAmt > 0) {
        const d = new Date(base);
        d.setMonth(d.getMonth() + months + 1);
        const due = new Date(d); due.setHours(0, 0, 0, 0);
        const id  = `${achat.id}-${months + 1}`;
        const saved = this.paymentState[id];
        this.allInstallments.push({
          id, achatId: achat.id, num: months + 1,
          dueDate: d.toISOString().split('T')[0],
          amount: lastAmt,
          balance: 0,
          status: saved?.status ?? (due < today ? 'late' : 'pending'),
          paidDate:    saved?.paidDate,
          invoiceFile: saved?.invoiceFile,
          invoiceName: saved?.invoiceName,
          notes:       saved?.notes,
          voitureName: vName,
          fournisseurName: fName
        });
      }
    }
  }

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
    return res.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  }

  // Stats
  get totalPending()  { return this.allInstallments.filter(i => i.status === 'pending').length; }
  get totalLate()     { return this.allInstallments.filter(i => i.status === 'late').length; }
  get totalPaid()     { return this.allInstallments.filter(i => i.status === 'paid').length; }
  get amountDue()     { return this.allInstallments.filter(i => i.status !== 'paid').reduce((s, i) => s + i.amount, 0); }

  openPay(inst: Installment) {
    this.selectedInstallment = inst;
    this.payForm.reset({ paidDate: new Date().toISOString().split('T')[0], status: 'paid', notes: inst.notes || '' });
    this.modalMode = 'pay';
  }

  openInvoicePreview(inst: Installment) {
    if (!inst.invoiceFile) return;
    this.selectedInstallment = inst;
    this.previewUrl = inst.invoiceFile;
    this.modalMode = 'invoice-preview';
  }

  closeModal() {
    this.modalMode = null;
    this.selectedInstallment = null;
    this.previewUrl = null;
    this.isSubmitting = false;
  }

  @HostListener('document:keydown.escape') onEscape() { this.closeModal(); }

  savePay() {
    if (!this.selectedInstallment) return;
    this.isSubmitting = true;
    const val = this.payForm.value;
    this.paymentState[this.selectedInstallment.id] = {
      ...this.paymentState[this.selectedInstallment.id],
      status:   val.status,
      paidDate: val.paidDate,
      notes:    val.notes
    };
    this.buildInstallments();
    this.closeModal();
  }

  onFileSelected(event: Event, inst: Installment) {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    const file = input.files[0];
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      this.paymentState[inst.id] = {
        ...this.paymentState[inst.id],
        invoiceFile: dataUrl,
        invoiceName: file.name
      };
      this.buildInstallments();
    };
    reader.readAsDataURL(file);
  }

  removeInvoice(inst: Installment) {
    if (this.paymentState[inst.id]) {
      delete this.paymentState[inst.id].invoiceFile;
      delete this.paymentState[inst.id].invoiceName;
    }
    this.buildInstallments();
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

  getVoitureName(id: any): string {
    const v = this.voitures.find(x => x.id == id);
    return v ? `${v.marque} ${v.modele}` : (id || '-');
  }
  getFournisseurName(id: any): string {
    const f = this.fournisseurs.find(x => x.id == id);
    return f ? (f.raisonSociale || f.nom || '-') : (id || '-');
  }
  payStatusClass(s: string): string {
    return { pending: 'pay-pending', paid: 'pay-paid', late: 'pay-late', partial: 'pay-partial' }[s] ?? '';
  }
  t(key: string): string { return this.ts.translate(key); }
  fmt(n: number): string { return (n ?? 0).toLocaleString('fr-MA') + ' MAD'; }

  get achatOptions() {
    return this.achats.filter(a => a.typeFinancement !== 'comptant').map(a => ({
      id: String(a.id),
      label: this.getVoitureName(a.voitureId)
    }));
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
}
