import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { TranslationService } from '../../services/translation.service';
import { CrudService } from '../../services/crud.service';
import { AuthService } from '../../services/auth.service';
import { EventBusService } from '../../services/event-bus.service';
import { BtnComponent } from '../../shared/btn/btn.component';
import { PaginatorComponent } from '../../shared/paginator/paginator.component';
import { PayDepPanelComponent } from '../../shared/pay-dep-panel/pay-dep-panel.component';
import { Subject, of } from 'rxjs';
import { debounceTime, switchMap, takeUntil, catchError } from 'rxjs/operators';
import { PAGE_SIZE } from '../../shared/constants/pagination';

export const BUREAU_EXPENSE_TYPE_KEYS = [
  'loyer', 'salaire', 'telephone', 'electricite', 'eau',
  'internet', 'fournitures', 'publicite', 'nettoyage', 'vignetteBureau', 'autre',
];

const REPETITIVE_TYPES = ['loyer', 'salaire', 'telephone', 'electricite', 'eau', 'internet', 'vignette'];

const MONTHS = [
  { value: 1,  label: 'Janvier' },  { value: 2,  label: 'Février' },
  { value: 3,  label: 'Mars' },     { value: 4,  label: 'Avril' },
  { value: 5,  label: 'Mai' },      { value: 6,  label: 'Juin' },
  { value: 7,  label: 'Juillet' },  { value: 8,  label: 'Août' },
  { value: 9,  label: 'Septembre' },{ value: 10, label: 'Octobre' },
  { value: 11, label: 'Novembre' }, { value: 12, label: 'Décembre' },
];

interface BureauSummary {
  thisMonthPlanned: number;
  thisMonthPaid:    number;
  thisMonthPending: number;
  yearTotal:        number;
  overdueCount:     number;
  overdueAmount:    number;
}

@Component({
  selector: 'app-bureau-expense-list',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, BtnComponent, PaginatorComponent, PayDepPanelComponent],
  templateUrl: './bureau-expense-list.component.html',
  styleUrls: ['../../shared/styles/crud-list.css'],
})
export class BureauExpenseListComponent implements OnInit, OnDestroy {
  items: any[] = [];
  bureaux: any[] = [];
  loading = true;
  error   = '';
  dir     = 'ltr';
  search  = '';
  page    = 1;
  limit   = 20;
  total   = 0;

  // ── Tabs ──────────────────────────────────────────────────────────────────
  activeTab: 'all' | 'monthly' | 'yearly' | 'onetime' = 'all';

  // ── Summary ───────────────────────────────────────────────────────────────
  summary: BureauSummary | null = null;
  summaryLoading = false;

  // ── Modal / form ──────────────────────────────────────────────────────────
  modalMode: 'form' | 'delete' | null = null;
  selected: any = null;
  form: FormGroup;
  isSubmitting = false;
  deleteId: number | null = null;
  isEditing = false;

  // ── Pay panel (paiement-depense) ──────────────────────────────────────────
  payPanelOpen = false;
  payPanelItem: any = null;

  // ── Drawer ────────────────────────────────────────────────────────────────
  drawerOpen = false;
  drawerItem: any = null;

  // ── File upload ───────────────────────────────────────────────────────────
  pendingFile: File | null = null;
  pendingFileName = '';
  uploadingFile = false;
  fileError = '';

  updateTemplatePrice = false;
  originalMontant: any = null;

  // ── Filters ───────────────────────────────────────────────────────────────
  filterStatus   = '';
  filterType     = '';
  filterMonth    = '';
  filterYear     = '';
  filterBureauId = '';

  readonly expenseTypeKeys = BUREAU_EXPENSE_TYPE_KEYS;
  readonly months          = MONTHS;
  readonly currentYear     = new Date().getFullYear();
  readonly years           = Array.from({ length: 5 }, (_, i) => this.currentYear + i);
  readonly Math            = Math;

  get expenseTypes() {
    return this.expenseTypeKeys.map(k => ({
      value: k === 'vignetteBureau' ? 'vignette' : k,
      label: this.t(k),
    }));
  }

  get isAdmin(): boolean { return this.auth.hasRole('ROLE_ADMIN'); }

  isRepetitiveType(type?: string): boolean {
    return REPETITIVE_TYPES.includes(type ?? this.form.value.typeDepense ?? '');
  }

  get showFrequencyFields(): boolean { return !this.isEditing && this.isRepetitiveType(); }
  get isVariablePrice(): boolean     { return this.form.value.priceType === 'variable'; }

  get showUpdateTemplateCheckbox(): boolean {
    return this.isEditing
      && !!this.selected?.recurringTemplateId
      && this.selected?.templatePriceType === 'fixed'
      && String(this.form.value.montant) !== String(this.originalMontant);
  }

  // Overdue: pending + past effective period
  isOverdue(item: any): boolean {
    if (item.statut !== 'pending') return false;
    if (item.periodMonth != null && item.periodYear != null) {
      const now = new Date();
      const cy = now.getFullYear(), cm = now.getMonth() + 1;
      return item.periodYear < cy || (item.periodYear === cy && item.periodMonth < cm);
    }
    return new Date(item.dateDebut) < new Date(new Date().toDateString());
  }

  // Paid amount — if payee but montantPaye not set, assume fully paid
  paidAmount(item: any): number {
    if (item.statut === 'payee' && (!item.montantPaye || +item.montantPaye === 0)) {
      return +item.montant;
    }
    return +(item.montantPaye || 0);
  }

  hasMontantDiff(item: any): boolean {
    return item.montantPaye != null && +item.montantPaye > 0
      && Math.abs(+item.montantPaye - +item.montant) > 0.001;
  }

  private searchSubject = new Subject<void>();
  private destroy$      = new Subject<void>();

  constructor(
    private crud: CrudService,
    private ts:   TranslationService,
    private auth: AuthService,
    private fb:   FormBuilder,
    private bus:  EventBusService,
  ) {
    this.form = this.fb.group({
      bureauId:     [null],
      typeDepense:  ['', Validators.required],
      montant:      [0, [Validators.required, Validators.min(0.01)]],
      dateDebut:    [new Date().toISOString().slice(0, 10)],
      statut:       ['pending'],
      description:  [''],
      datePaiement: [''],
      dateFacture:  [''],
      frequency:    ['monthly'],
      priceType:    ['fixed'],
      periodMonth:  [new Date().getMonth() + 2 > 12 ? 1 : new Date().getMonth() + 2],
      periodYear:   [new Date().getMonth() + 2 > 12 ? new Date().getFullYear() + 1 : new Date().getFullYear()],
    });

    this.form.get('priceType')?.valueChanges.subscribe(pt => {
      const ctrl = this.form.get('montant');
      if (pt === 'variable') {
        ctrl?.setValue(0);
        ctrl?.setValidators([Validators.required]);
      } else {
        ctrl?.setValidators([Validators.required, Validators.min(0.01)]);
      }
      ctrl?.updateValueAndValidity();
    });
  }

  ngOnInit() {
    this.ts.direction$.subscribe(d => this.dir = d);
    if (this.isAdmin) this.loadBureaux();

    this.searchSubject.pipe(
      debounceTime(300),
      switchMap(() => {
        this.loading = true;
        return this.crud.getPage('depense', this.buildParams()).pipe(
          catchError(() => { this.error = this.ts.translate('loadError'); return of(null); })
        );
      }),
      takeUntil(this.destroy$),
    ).subscribe(r => {
      if (r) { this.items = r.data ?? []; this.total = r.meta?.total ?? 0; }
      this.loading = false;
    });

    this.load();
    this.loadSummary();
  }

  ngOnDestroy() { this.destroy$.next(); this.destroy$.complete(); }

  loadBureaux() {
    this.crud.getAll('bureau', { limit: 200 }).pipe(catchError(() => of([]))).subscribe(r => {
      this.bureaux = Array.isArray(r) ? r : (r as any)?.data ?? [];
    });
  }

  loadSummary() {
    this.summaryLoading = true;
    const params: any = {};
    if (this.filterBureauId) params['bureauId'] = this.filterBureauId;
    this.crud.getAll('depense/summary', params)
      .pipe(catchError(() => of(null)))
      .subscribe(r => { this.summary = r as BureauSummary | null; this.summaryLoading = false; });
  }

  private buildParams(): Record<string, any> {
    const p: Record<string, any> = {
      page: this.page, limit: this.limit, search: this.search, type: 'bureau',
    };
    if (this.filterStatus)        p['statut']            = this.filterStatus;
    if (this.filterType)          p['typeDepense']        = this.filterType;
    if (this.filterMonth)         p['month']              = this.filterMonth;
    if (this.filterYear)          p['year']               = this.filterYear;
    if (this.filterBureauId)      p['bureauId']           = this.filterBureauId;
    if (this.activeTab !== 'all') p['recurringFrequency'] = this.activeTab === 'onetime' ? 'one_time' : this.activeTab;
    return p;
  }

  load() {
    this.loading = true;
    this.error   = '';
    this.crud.getPage('depense', this.buildParams()).subscribe({
      next:  r => { this.items = r.data ?? []; this.total = r.meta?.total ?? 0; this.loading = false; },
      error: () => { this.error = this.ts.translate('loadError'); this.loading = false; },
    });
  }

  setTab(tab: 'all' | 'monthly' | 'yearly' | 'onetime') {
    this.activeTab = tab;
    this.page = 1;
    this.load();
  }

  get paged(): any[] { return this.items; }

  onSearch()              { this.page = 1; this.searchSubject.next(); }
  onFilterChange()        { this.page = 1; this.load(); this.loadSummary(); }
  onPageChange(p: number) { this.page = p; this.load(); }

  clearFilters() {
    this.filterStatus = ''; this.filterType = '';
    this.filterMonth  = ''; this.filterYear = ''; this.filterBureauId = '';
    this.search = ''; this.activeTab = 'all'; this.page = 1;
    this.load(); this.loadSummary();
  }

  get hasActiveFilter(): boolean {
    return !!(this.filterStatus || this.filterType || this.filterMonth
      || this.filterYear || this.filterBureauId || this.search || this.activeTab !== 'all');
  }

  // ── Open/close ────────────────────────────────────────────────────────────

  openAdd() {
    this.selected = null; this.isEditing = false;
    this.updateTemplatePrice = false; this.originalMontant = null;
    const nextMonth = new Date().getMonth() + 2 > 12 ? 1 : new Date().getMonth() + 2;
    const nextYear  = new Date().getMonth() + 2 > 12 ? new Date().getFullYear() + 1 : new Date().getFullYear();
    this.form.reset({
      montant: 0, statut: 'pending', bureauId: null, typeDepense: '',
      dateDebut: new Date().toISOString().slice(0, 10),
      frequency: 'monthly', priceType: 'fixed',
      periodMonth: nextMonth, periodYear: nextYear,
    });
    this.clearFile();
    this.modalMode = 'form';
  }

  openEdit(item: any) {
    this.selected = item; this.isEditing = true;
    this.updateTemplatePrice = false; this.originalMontant = item.montant;
    this.form.patchValue({
      bureauId: item.bureauId, typeDepense: item.typeDepense,
      montant: item.montant, dateDebut: item.dateDebut, statut: item.statut,
      description: item.description, datePaiement: item.datePaiement, dateFacture: item.dateFacture,
    });
    this.clearFile();
    this.modalMode = 'form';
  }

  openPayPanel(item: any) { this.payPanelItem = item; this.payPanelOpen = true; }
  closePayPanel()         { this.payPanelOpen = false; this.payPanelItem = null; }

  onPaymentChanged() {
    this.bus.paymentsChanged$.next();
    this.crud.getPage('depense', this.buildParams()).subscribe({
      next: r => {
        this.items = r.data ?? [];
        this.total = r.meta?.total ?? 0;
        this.loading = false;
        if (this.payPanelItem) {
          const fresh = this.items.find((i: any) => i.id === this.payPanelItem.id);
          if (fresh) this.payPanelItem = fresh;
        }
      },
    });
    this.loadSummary();
  }

  openDelete(id: number) { this.deleteId = id; this.modalMode = 'delete'; }
  openView(item: any)    { this.drawerItem = item; this.drawerOpen = true; }

  closeModal() {
    this.modalMode = null; this.selected = null; this.deleteId = null;
    this.isSubmitting = false; this.isEditing = false;
    this.updateTemplatePrice = false; this.originalMontant = null;
    this.clearFile();
  }
  closeDrawer() { this.drawerOpen = false; this.drawerItem = null; }

  @HostListener('document:keydown.escape') onEscape() { this.closeModal(); this.closeDrawer(); }

  // ── Actions ───────────────────────────────────────────────────────────────

  openDoc(url: string): void {
    const a = document.createElement('a');
    a.href = url;
    a.download = url.split('/').pop() || 'document';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  dismiss(item: any): void {
    this.crud.rawPost(`depense/${item.id}/dismiss`, {}).subscribe({
      next:  () => { this.load(); this.loadSummary(); },
      error: () => {},
    });
  }

  save() {
    if (this.form.invalid) return;
    this.isSubmitting = true;
    const v = this.form.value;

    const payload: any = {
      bureauId:    v.bureauId   || undefined,
      typeDepense: v.typeDepense,
      montant:     v.montant,
      dateDebut:   v.dateDebut,
      description: v.description || undefined,
      dateFacture: v.dateFacture  || undefined,
    };
    if (!this.isEditing) payload['statut'] = 'pending';

    if (this.isEditing && this.updateTemplatePrice) payload['updateTemplatePrice'] = true;

    if (!this.isEditing && this.isRepetitiveType(v.typeDepense)) {
      payload['periodMonth'] = v.frequency === 'monthly' ? v.periodMonth : null;
      payload['periodYear']  = v.periodYear;

      this.crud.rawPost('recurring-expense-template', {
        typeDepense:      v.typeDepense,
        frequency:        v.frequency,
        priceType:        v.priceType,
        fixedAmount:      v.priceType === 'fixed' ? v.montant : null,
        startPeriodMonth: v.frequency === 'monthly' ? v.periodMonth : null,
        startPeriodYear:  v.periodYear,
        bureauId:         v.bureauId || undefined,
      }).subscribe();
    }

    const req = this.isEditing
      ? this.crud.update('depense', this.selected.id, payload)
      : this.crud.create('depense', payload);

    req.subscribe({
      next: (res: any) => {
        const id = this.isEditing ? this.selected.id : res?.id;
        this.bus.paymentsChanged$.next();
        if (this.pendingFile && id) {
          this.uploadingFile = true;
          this.crud.uploadDepenseJustificatif(id, this.pendingFile).subscribe({
            next:  () => { this.uploadingFile = false; this.closeModal(); this.load(); this.loadSummary(); },
            error: () => { this.uploadingFile = false; this.closeModal(); this.load(); this.loadSummary(); },
          });
        } else {
          this.closeModal(); this.load(); this.loadSummary();
        }
      },
      error: () => { this.isSubmitting = false; },
    });
  }

  confirmDelete() {
    if (!this.deleteId) return;
    this.crud.remove('depense', this.deleteId).subscribe({
      next:  () => { this.bus.paymentsChanged$.next(); this.closeModal(); this.load(); this.loadSummary(); },
      error: () => this.closeModal(),
    });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  clearFile() { this.pendingFile = null; this.pendingFileName = ''; this.fileError = ''; }

  onFileChange(event: Event) {
    const input = event.target as HTMLInputElement;
    const file  = input.files?.[0] ?? null;
    this.fileError = '';
    if (!file) { this.clearFile(); return; }
    if (file.size > 10 * 1024 * 1024) { this.fileError = 'Max 10 MB'; this.clearFile(); return; }
    const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) { this.fileError = 'PDF, JPEG ou PNG seulement'; this.clearFile(); return; }
    this.pendingFile     = file;
    this.pendingFileName = file.name;
  }

  rowClass(item: any): string {
    if (this.isOverdue(item))    return 'row-overdue';
    if (!item.isAutoGenerated)   return '';
    if (item.dismissedAt)        return 'row-dismissed';
    return 'row-pending-auto';
  }

  typeLabel(val: string): string {
    const key = val === 'vignette' ? 'vignetteBureau' : val;
    const tr  = this.t(key);
    return tr !== key ? tr : val;
  }

  statutClass(s: string, item?: any): string {
    if (item && this.isOverdue(item)) return 'badge-danger';
    if (s === 'payee')   return 'badge-payee';
    if (s === 'partiel') return 'badge-partiel';
    return 'badge-pending';
  }

  statutLabel(s: string, item?: any): string {
    if (item && this.isOverdue(item)) return this.t('beOverdue');
    return this.t(s);
  }

  fmt(n: number | string | null | undefined): string {
    return (+( n ?? 0)).toLocaleString('fr-FR', { minimumFractionDigits: 2 });
  }

  t(key: string): string { return this.ts.translate(key); }
}
