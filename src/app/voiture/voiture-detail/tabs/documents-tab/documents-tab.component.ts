import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { CrudService } from '../../../../services/crud.service';
import { TranslationService } from '../../../../services/translation.service';
import { environment } from '../../../../../environments/environment';
import { DocBtnComponent } from '../../../../shared/btn/doc-btn.component';
import { UploadBtnComponent } from '../../../../shared/btn/upload-btn.component';
import { PayDepPanelComponent } from '../../../../shared/pay-dep-panel/pay-dep-panel.component';
import { payNotExceedTotal } from '../../../../shared/validators/pay-not-exceed-total.validator';

@Component({
  selector: 'app-documents-tab',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, DocBtnComponent, UploadBtnComponent, PayDepPanelComponent],
  templateUrl: './documents-tab.component.html',
  styleUrls: ['../../voiture-detail.component.css'],
})
export class DocumentsTabComponent implements OnInit {
  @Input() carId!: number;
  @Input() car!: any;
  @Input() reparations: any[] = [];
  @Input() dir = 'ltr';
  @Output() carRefresh = new EventEmitter<void>();

  // ── Expense config ──────────────────────────────────────────────────────
  readonly EXPENSE_TYPES = [
    { value: 'repairs',    labelKey: 'reparations', endpoint: 'reparation', icon: '🔧', color: '#ea580c', bg: '#fff7ed' },
    { value: 'adblue',     labelKey: 'adblue',      endpoint: 'adblue',     icon: '💧', color: '#9333ea', bg: '#faf5ff' },
    { value: 'oil-changes', labelKey: 'vidanges',   endpoint: 'vidange',    icon: '🛢️', color: '#16a34a', bg: '#f0fdf4' },
  ];

  private readonly EXPENSE_TYPE_MAP: Record<string, string> = {
    'repairs':    'reparation',
    'adblue':     'adblue',
    'oil-changes': 'vidange',
  };

  readonly currentYear = new Date().getFullYear();

  // ── Expense list state ──────────────────────────────────────────────────
  expenseTypeSelected = 'all';
  expenseLoadedTypes  = new Set<string>();
  expenseDataMap: Record<string, any[]>     = {};
  expenseIsLoading: Record<string, boolean> = {};
  expenseSearch = '';

  expFilterStatus  = '';
  expDateFrom      = '';
  expDateTo        = '';
  expQuickPeriod   = '';
  expAllTypesLoaded   = false;
  expAllTypesLoading  = false;
  expExportOpen = false;

  // ── Expense drawer ──────────────────────────────────────────────────────
  expDrawerRecord: any = null;
  expDrawerType        = '';

  // ── Generic expense modal ───────────────────────────────────────────────
  expModal: 'form' | 'delete' | 'pick' | null = null;
  expModalRecord: any   = null;
  expModalDeleteId: number | null = null;
  expModalIsEditing  = false;
  expModalSubmitting = false;
  expModalError: string | null = null;
  expModalForm!: FormGroup;
  expModalType        = '';
  expModalPickedType  = '';
  expFile: File | null = null;
  expTableUploading: Set<number> = new Set();

  // ── Repair modal ────────────────────────────────────────────────────────
  repairModalMode: 'form' | 'delete' | null = null;
  repairSelected:  any   = null;
  repairForm!: FormGroup;
  repairSubmitting  = false;
  repairDeleteId: number | null = null;
  repairIsEditing   = false;

  // ── PayDep panel ────────────────────────────────────────────────────────
  payDepPanelOpen  = false;
  payDepRecord: any = null;
  payDepType       = '';

  constructor(
    private crud: CrudService,
    private ts: TranslationService,
    private fb: FormBuilder,
  ) {
    this.repairForm = this.fb.group({
      descriptionTechnique: ['', Validators.required],
      dateDebut:  ['', Validators.required],
      dateFin:    [''],
      dateFacture: [null],
      montant:    [null],
      paye:       [null],
      statut:     ['en_cours'],
    }, { validators: payNotExceedTotal('montant', 'paye') });
    this.subscribeRepairAutoStatus();
    this.expModalForm = this.fb.group({});
  }

  ngOnInit(): void {
    this.loadAllExpenseTypes();
  }

  // ── Helpers ──────────────────────────────────────────────────────────────
  getFileUrl(path: string): string { return environment.serverUrl + path; }

  t(key: string):  string { return this.ts.translate(key); }
  fmt(v: any):     string { if (v === null || v === undefined || v === '') return '—'; return String(v); }

  openDatePicker(_event: MouseEvent, input: HTMLInputElement): void {
    try { (input as any).showPicker(); } catch {}
  }

  // ── Expense type loading ──────────────────────────────────────────────────
  onExpenseTypeChange(type: string): void {
    this.expenseTypeSelected = type;
    this.expenseSearch       = '';
    if (type === 'all') { this.loadAllExpenseTypes(); return; }
    if (type !== 'repairs' && !this.expenseLoadedTypes.has(type)) { this.loadExpenseType(type); }
  }

  loadExpenseType(type: string, onDone?: () => void): void {
    const config = this.EXPENSE_TYPES.find(t => t.value === type);
    if (!config || !this.car) return;
    this.expenseIsLoading[type] = true;
    this.expenseLoadedTypes.add(type);
    this.crud.getAll(config.endpoint, { voitureId: this.car.id }).pipe(catchError(() => of([]))).subscribe((data: any) => {
      const all: any[] = Array.isArray(data) ? data : (data?.data ?? []);
      this.expenseDataMap[type] = all;
      this.expenseIsLoading[type] = false;
      onDone?.();
    });
  }

  loadAllExpenseTypes(): void {
    if (!this.car) return;
    if (this.expAllTypesLoaded || this.expAllTypesLoading) return;
    this.expAllTypesLoading = true;
    const toLoad = this.EXPENSE_TYPES.filter(t => t.value !== 'repairs' && !this.expenseLoadedTypes.has(t.value));
    if (!toLoad.length) { this.expAllTypesLoaded = true; this.expAllTypesLoading = false; return; }
    let pending = toLoad.length;
    for (const config of toLoad) {
      this.expenseIsLoading[config.value] = true;
      this.expenseLoadedTypes.add(config.value);
      this.crud.getAll(config.endpoint, { voitureId: this.car.id }).pipe(catchError(() => of([]))).subscribe((data: any) => {
        const all: any[] = Array.isArray(data) ? data : (data?.data ?? []);
        this.expenseDataMap[config.value] = all;
        this.expenseIsLoading[config.value] = false;
        if (--pending === 0) { this.expAllTypesLoaded = true; this.expAllTypesLoading = false; }
      });
    }
  }

  // ── Expense table ─────────────────────────────────────────────────────────
  get currentExpenseItems(): any[] {
    if (this.expenseTypeSelected === 'all')     return this.filteredAllExpenseRows;
    if (this.expenseTypeSelected === 'repairs') return this.filteredReparations;
    let items = this.expenseDataMap[this.expenseTypeSelected] || [];
    if (this.expenseSearch.trim()) {
      const tokens = this.expenseSearch.trim().toLowerCase().split(/\s+/).filter(Boolean);
      const cfg = this.EXPENSE_TYPES.find(c => c.value === this.expenseTypeSelected);
      const category = cfg ? this.t(cfg.labelKey).toLowerCase() : '';
      items = items.filter((r: any) => {
        const detail   = this.normalizeExpenseRowForType(this.expenseTypeSelected, r).detail.toLowerCase();
        const haystack = category + ' ' + detail;
        return tokens.every(tok => haystack.includes(tok));
      });
    }
    if (this.expFilterStatus) items = items.filter((r: any) => this.matchExpStatus(this.expenseTypeSelected, r));
    if (this.expDateFrom)     items = items.filter((r: any) => (this.getExpDate(this.expenseTypeSelected, r) || '') >= this.expDateFrom);
    if (this.expDateTo)       items = items.filter((r: any) => (this.getExpDate(this.expenseTypeSelected, r) || '') <= this.expDateTo);
    return items;
  }

  get expIsAnyLoading(): boolean {
    if (this.expenseTypeSelected === 'all')     return this.expAllTypesLoading;
    if (this.expenseTypeSelected === 'repairs') return false;
    return !!this.expenseIsLoading[this.expenseTypeSelected];
  }

  get expCurrentTypeLabel(): string {
    return this.EXPENSE_TYPES.find(t => t.value === this.expenseTypeSelected)?.labelKey
      ? this.t(this.EXPENSE_TYPES.find(t => t.value === this.expenseTypeSelected)!.labelKey)
      : '';
  }

  get expModalTypeLabel(): string {
    const type = this.EXPENSE_TYPES.find(t => t.value === this.expModalType);
    return type ? this.t(type.labelKey) : this.expCurrentTypeLabel;
  }

  get selectedCategoryIcon(): string {
    if (this.expenseTypeSelected === 'all') return '📊';
    return this.EXPENSE_TYPES.find(t => t.value === this.expenseTypeSelected)?.icon || '📊';
  }

  get expHasActiveFilters(): boolean {
    return this.expenseTypeSelected !== 'all' || !!this.expFilterStatus || !!this.expDateFrom || !!this.expDateTo || !!this.expenseSearch.trim();
  }

  get expFilterStatusLabel(): string {
    switch (this.expFilterStatus) {
      case 'paid':    return this.t('paid');
      case 'partial': return this.t('partial');
      case 'unpaid':  return this.t('unpaid');
      case 'overdue': return 'Overdue';
      default:        return '';
    }
  }

  get expDetailColumnLabel(): string {
    switch (this.expenseTypeSelected) {
      case 'repairs':    return this.t('description');
      case 'adblue':     return this.t('quantiteLitres');
      case 'oil-changes': return this.t('mileage');
      default:           return this.t('description');
    }
  }

  clearExpFilter(): void {
    this.expenseTypeSelected = 'all';
    this.expFilterStatus = '';
    this.expDateFrom = '';
    this.expDateTo = '';
    this.expenseSearch = '';
    this.expQuickPeriod = '';
    this.loadAllExpenseTypes();
  }

  setExpQuickPeriod(period: string): void {
    if (this.expQuickPeriod === period) { this.expQuickPeriod = ''; this.expDateFrom = ''; this.expDateTo = ''; return; }
    this.expQuickPeriod = period;
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    switch (period) {
      case 'today':      { const t = fmt(now); this.expDateFrom = t; this.expDateTo = t; break; }
      case 'week':       {
        const day = now.getDay();
        const mon = new Date(now); mon.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
        const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
        this.expDateFrom = fmt(mon); this.expDateTo = fmt(sun); break;
      }
      case 'month':      {
        this.expDateFrom = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`;
        this.expDateTo   = fmt(new Date(now.getFullYear(), now.getMonth() + 1, 0)); break;
      }
      case 'last-month': {
        this.expDateFrom = fmt(new Date(now.getFullYear(), now.getMonth() - 1, 1));
        this.expDateTo   = fmt(new Date(now.getFullYear(), now.getMonth(), 0)); break;
      }
      case 'year':       { this.expDateFrom = `${now.getFullYear()}-01-01`; this.expDateTo = `${now.getFullYear()}-12-31`; break; }
    }
  }

  // ── Normalization helpers ─────────────────────────────────────────────────
  normalizeExpenseRow(r: any): any {
    const montantPaye  = r.montantPaye  != null ? +r.montantPaye  : 0;
    const montantTotal = r.montantTotal != null ? +r.montantTotal : (r.montant != null ? +r.montant : 0);
    const reste        = r.reste        != null ? +r.reste        : Math.max(0, montantTotal - montantPaye);
    const paymentStatut = r.paymentStatut || (montantPaye >= montantTotal && montantTotal > 0 ? 'paid' : montantPaye > 0 ? 'partial' : 'unpaid');
    switch (this.expenseTypeSelected) {
      case 'repairs':
        return { date: r.dateDebut || '', detail: r.descriptionTechnique || '—', amount: r.montant != null ? +r.montant : null, montantPaye, reste, paymentStatut, badge: this.repairStatusLabel(r), badgeClass: this.repairStatusClass(r) };
      case 'adblue':
        return { date: r.date || '', detail: r.quantite != null ? r.quantite + ' L' : '—', amount: r.montant != null ? +r.montant : null, montantPaye, reste, paymentStatut };
      case 'oil-changes':
        return { date: r.date || r.dateDebut || '', detail: r.kilometrage != null ? r.kilometrage + ' km' : '—', amount: r.montant != null ? +r.montant : null, montantPaye, reste, paymentStatut };
      default:
        return { date: '', detail: '—', amount: null, montantPaye: 0, reste: 0, paymentStatut: 'unpaid' };
    }
  }

  normalizeExpenseRowForType(type: string, r: any): { date: string; detail: string; amount: number | null } {
    switch (type) {
      case 'repairs':    return { date: r.dateDebut || '', detail: r.descriptionTechnique || '—', amount: r.montant != null ? +r.montant : null };
      case 'adblue':     return { date: r.date || '', detail: r.quantite != null ? r.quantite + ' L' : '—', amount: r.montant != null ? +r.montant : null };
      case 'oil-changes': return { date: r.date || '', detail: r.kilometrage != null ? r.kilometrage + ' km' : '—', amount: r.montant != null ? +r.montant : null };
      default:           return { date: '', detail: '—', amount: null };
    }
  }

  normalizeAllExpenseRow(r: any): any {
    const type = r._type as string;
    const norm = this.normalizeExpenseRowForType(type, r);
    const montantPaye   = r.montantPaye  != null ? +r.montantPaye  : 0;
    const montantTotal  = r.montantTotal != null ? +r.montantTotal : (r.montant != null ? +r.montant : 0);
    const reste         = r.reste        != null ? +r.reste        : Math.max(0, montantTotal - montantPaye);
    const paymentStatut = r.paymentStatut || (montantPaye >= montantTotal && montantTotal > 0 ? 'paid' : montantPaye > 0 ? 'partial' : 'unpaid');
    const endDate = type === 'repairs' ? (r.dateFin ? (r.dateFin as string).split('T')[0] : null) : null;
    return {
      ...norm, endDate,
      categoryLabel:  r._cfg ? this.t(r._cfg.labelKey) : type,
      categoryIcon:   r._cfg?.icon || '📋',
      montantPaye, reste, paymentStatut,
      statusClass: type === 'repairs' ? this.repairStatusClass(r) : this.payDepStatusClass(r),
      statusLabel: type === 'repairs' ? this.repairStatusLabel(r) : this.payDepStatusLabel(r),
    };
  }

  private getExpDate(type: string, r: any): string {
    switch (type) {
      case 'adblue': case 'oil-changes': return r.date || '';
      default:                           return r.dateDebut || r.date || '';
    }
  }

  private matchExpStatus(type: string, r: any): boolean {
    const s = this.expFilterStatus.toLowerCase();
    if (!s) return true;
    if (type === 'repairs') {
      const rs = (r.statut || '').toLowerCase();
      if (s === 'unpaid')  return ['en_cours', 'pending'].includes(rs);
      if (s === 'paid')    return rs === 'termine';
      if (s === 'overdue') return false;
      return false;
    }
    if (s === 'overdue') {
      const ps = (r.paymentStatut || 'unpaid');
      if (ps === 'paid') return false;
      const dateFin = r.dateFin ?? r.dateExpiration ?? r.dateLimite ?? null;
      return !!dateFin && new Date(dateFin) < new Date();
    }
    return (r.paymentStatut || 'unpaid') === s;
  }

  get filteredReparations(): any[] {
    let items = this.reparations;
    if (this.expenseSearch.trim()) {
      const tokens   = this.expenseSearch.trim().toLowerCase().split(/\s+/).filter(Boolean);
      const category = this.t(this.EXPENSE_TYPES[0].labelKey).toLowerCase();
      items = items.filter(r => {
        const haystack = category + ' ' + (r.descriptionTechnique || '').toLowerCase();
        return tokens.every(tok => haystack.includes(tok));
      });
    }
    if (this.expFilterStatus) items = items.filter(r => this.matchExpStatus('repairs', r));
    if (this.expDateFrom)     items = items.filter(r => (r.dateDebut || '') >= this.expDateFrom);
    if (this.expDateTo)       items = items.filter(r => (r.dateDebut || '') <= this.expDateTo);
    return items;
  }

  get filteredAllExpenseRows(): any[] {
    const q      = this.expenseSearch.trim().toLowerCase();
    const tokens = q ? q.split(/\s+/).filter(Boolean) : [];
    const rows: any[] = [];
    const repairCategory = this.t(this.EXPENSE_TYPES[0].labelKey).toLowerCase();
    for (const r of this.reparations) {
      if (tokens.length) {
        const haystack = repairCategory + ' ' + (r.descriptionTechnique || '').toLowerCase();
        if (!tokens.every(tok => haystack.includes(tok))) continue;
      }
      if (this.expFilterStatus && !this.matchExpStatus('repairs', r)) continue;
      if (this.expDateFrom && (r.dateDebut || '') < this.expDateFrom) continue;
      if (this.expDateTo   && (r.dateDebut || '') > this.expDateTo)   continue;
      rows.push({ ...r, _type: 'repairs', _cfg: this.EXPENSE_TYPES[0] });
    }
    for (const cfg of this.EXPENSE_TYPES) {
      if (cfg.value === 'repairs') continue;
      for (const r of (this.expenseDataMap[cfg.value] || [])) {
        if (tokens.length) {
          const category = this.t(cfg.labelKey).toLowerCase();
          const detail   = this.normalizeExpenseRowForType(cfg.value, r).detail.toLowerCase();
          if (!tokens.every(tok => (category + ' ' + detail).includes(tok))) continue;
        }
        if (this.expFilterStatus && !this.matchExpStatus(cfg.value, r)) continue;
        const d = this.getExpDate(cfg.value, r);
        if (this.expDateFrom && d < this.expDateFrom) continue;
        if (this.expDateTo   && d > this.expDateTo)   continue;
        rows.push({ ...r, _type: cfg.value, _cfg: cfg });
      }
    }
    return rows.sort((a, b) =>
      (this.getExpDate(b._type, b) || '').localeCompare(this.getExpDate(a._type, a) || '')
    );
  }

  // ── KPI & Analytics ───────────────────────────────────────────────────────
  get allExpensesFlat(): { type: string; date: string; amount: number; reste: number; status: string }[] {
    const out: { type: string; date: string; amount: number; reste: number; status: string }[] = [];
    for (const r of this.reparations) {
      const amt   = r.montantTotal != null ? +r.montantTotal : (r.montant != null ? +r.montant : 0);
      const paye  = r.montantPaye != null ? +r.montantPaye : 0;
      out.push({ type: 'repairs', date: r.dateDebut || '', amount: amt, reste: Math.max(0, amt - paye), status: r.statut || 'pending' });
    }
    for (const cfg of this.EXPENSE_TYPES) {
      if (cfg.value === 'repairs') continue;
      for (const r of (this.expenseDataMap[cfg.value] || [])) {
        const amt  = r.montantTotal != null ? +r.montantTotal : (r.montant != null ? +r.montant : 0);
        const reste = r.reste != null ? +r.reste : Math.max(0, amt - (r.montantPaye != null ? +r.montantPaye : 0));
        out.push({ type: cfg.value, date: this.getExpDate(cfg.value, r), amount: amt, reste, status: r.paymentStatut || 'unpaid' });
      }
    }
    return out;
  }

  get expTotalCost():      number { return this.allExpensesFlat.reduce((s, r) => s + r.amount, 0); }
  get expOperationsCount(): number { return this.allExpensesFlat.length; }

  get expThisMonthCost(): number {
    const y = new Date().getFullYear(); const m = new Date().getMonth();
    return this.allExpensesFlat.filter(r => {
      try { const d = new Date(r.date); return d.getFullYear() === y && d.getMonth() === m; } catch { return false; }
    }).reduce((s, r) => s + r.amount, 0);
  }

  get expPendingCost(): number {
    return this.allExpensesFlat.reduce((s, r) => s + r.reste, 0);
  }

  get expMonthlyTrend(): { month: string; amount: number; pct: number }[] {
    const months: { [k: string]: number } = {};
    for (let i = 0; i < 12; i++) months[`${this.currentYear}-${String(i + 1).padStart(2, '0')}`] = 0;
    for (const r of this.allExpensesFlat) {
      const key = (r.date || '').substring(0, 7);
      if (key in months) months[key] += r.amount;
    }
    const maxVal = Math.max(...Object.values(months), 1);
    return Object.entries(months).map(([k, v]) => ({
      month: new Date(k + '-01').toLocaleDateString('en', { month: 'short' }),
      amount: v, pct: Math.round((v / maxVal) * 100),
    }));
  }

  // ── Expense CRUD ─────────────────────────────────────────────────────────
  openExpenseAdd(): void {
    if (this.expenseTypeSelected === 'all') { this.expModalPickedType = ''; this.expModal = 'pick'; return; }
    const type = this.expenseTypeSelected;
    if (type === 'repairs') { this.openAddRepair(); return; }
    this.expModalType = type; this.expModalIsEditing = false; this.expModalRecord = null;
    this.expModalForm = this.buildExpenseForm(type, null); this.expModal = 'form';
  }

  confirmExpenseTypePick(): void {
    const type = this.expModalPickedType;
    if (!type) return;
    if (type === 'repairs') { this.closeExpModal(); this.openAddRepair(); return; }
    this.expModalType = type; this.expModalIsEditing = false; this.expModalRecord = null;
    this.expModalForm = this.buildExpenseForm(type, null); this.expModal = 'form';
  }

  openExpenseEdit(r: any): void {
    const type = r._type || this.expenseTypeSelected;
    if (type === 'repairs') { this.openEditRepair(r); return; }
    this.expModalType = type; this.expModalIsEditing = true; this.expModalRecord = r;
    this.expModalForm = this.buildExpenseForm(type, r); this.expModal = 'form';
  }

  openExpenseDelete(id: number, type?: string): void {
    const t = type || this.expenseTypeSelected;
    if (t === 'repairs') { this.openDeleteRepair(id); return; }
    this.expModalType = t; this.expModalDeleteId = id; this.expModal = 'delete';
  }

  closeExpModal(): void {
    this.expModal = null; this.expModalRecord = null; this.expModalDeleteId = null;
    this.expModalSubmitting = false; this.expModalIsEditing = false;
    this.expModalError = null; this.expModalType = ''; this.expFile = null;
  }

  openExpenseDrawer(r: any, type?: string): void { this.expDrawerRecord = r; this.expDrawerType = r._type || type || this.expenseTypeSelected; }
  closeExpenseDrawer(): void { this.expDrawerRecord = null; this.expDrawerType = ''; }

  onExpFileChange(file: File): void { this.expFile = file; }

  get adblueReste():    number { return Math.max(0, +(this.expModalForm?.get('montant')?.value ?? 0) - +(this.expModalForm?.get('montantPaye')?.value ?? 0)); }
  get oilChangeReste(): number { return Math.max(0, +(this.expModalForm?.get('montant')?.value ?? 0) - +(this.expModalForm?.get('montantPaye')?.value ?? 0)); }

  saveExpense(): void {
    if (this.expModalForm.invalid || !this.car) return;
    const type   = this.expModalType || this.expenseTypeSelected;
    const config = this.EXPENSE_TYPES.find(t => t.value === type);
    if (!config) return;
    this.expModalError      = null;
    this.expModalSubmitting = true;
    const v = this.expModalForm.value;
    const payload: any = { voitureId: this.car.id };
    Object.entries(v).forEach(([k, val]) => { if (val !== null && val !== '') payload[k] = val; });
    if (this.expModalIsEditing && (+(this.expModalRecord?.paiementCount ?? 0)) > 0) delete payload.montantPaye;
    const req = this.expModalIsEditing
      ? this.crud.update(config.endpoint, this.expModalRecord.id, payload)
      : this.crud.create(config.endpoint, payload);
    req.subscribe({
      next: (created: any) => {
        const file      = this.expFile;
        const editingId = this.expModalIsEditing ? this.expModalRecord?.id : null;
        const recordId  = created?.id ?? editingId;
        this.closeExpModal();
        this.expenseLoadedTypes.delete(type);
        this.loadExpenseType(type);
        if (this.expenseTypeSelected === 'all') { this.expAllTypesLoaded = false; this.loadAllExpenseTypes(); }
        if (file && recordId && type === 'oil-changes') {
          this.crud.uploadDocumentFile('vidange', recordId, file).subscribe({
            next: (res: any) => { if (res?.path) this.crud.update('vidange', recordId, { filePath: res.path }).subscribe(); }
          });
        }
      },
      error: () => { this.expModalSubmitting = false; },
    });
  }

  confirmDeleteExpense(): void {
    const type   = this.expModalType || this.expenseTypeSelected;
    const config = this.EXPENSE_TYPES.find(t => t.value === type);
    if (!config || !this.expModalDeleteId) return;
    this.crud.remove(config.endpoint, this.expModalDeleteId).subscribe({
      next:  () => { this.closeExpModal(); this.expenseLoadedTypes.delete(type); this.loadExpenseType(type); if (this.expenseTypeSelected === 'all') { this.expAllTypesLoaded = false; this.loadAllExpenseTypes(); } },
      error: () => { this.closeExpModal(); },
    });
  }

  private buildExpenseForm(type: string, r: any): FormGroup {
    const d = (s: string | undefined) => (s || '').split('T')[0];
    switch (type) {
      case 'adblue':
        return this.fb.group({ date: [d(r?.date), Validators.required], quantite: [r?.quantite ?? null], dateFacture: [r?.dateFacture ? d(r.dateFacture) : null], montant: [r?.montant ?? null], montantPaye: [r?.montantPaye ?? null] }, { validators: payNotExceedTotal('montant', 'montantPaye') });
      case 'oil-changes':
        return this.fb.group({ date: [d(r?.date), Validators.required], kilometrage: [r?.kilometrage ?? null], intervalleKm: [r?.intervalleKm ?? 10000], dateFacture: [r?.dateFacture ? d(r.dateFacture) : null], montant: [r?.montant ?? null], montantPaye: [r?.montantPaye ?? null] }, { validators: payNotExceedTotal('montant', 'montantPaye') });
      default:
        return this.fb.group({});
    }
  }

  // ── Repair CRUD ───────────────────────────────────────────────────────────
  openAddRepair(): void {
    this.repairSelected = null; this.repairIsEditing = false;
    this.repairForm.reset({ statut: 'en_cours' }); this.repairModalMode = 'form';
  }

  openEditRepair(r: any): void {
    this.repairSelected = r; this.repairIsEditing = true;
    this.repairForm.patchValue({
      descriptionTechnique: r.descriptionTechnique || '',
      dateDebut:   (r.dateDebut   || '').split('T')[0],
      dateFin:     (r.dateFin     || '').split('T')[0],
      dateFacture: (r.dateFacture || '').split('T')[0] || null,
      montant:     r.montant    ?? null,
      paye:        r.montantPaye ?? null,
      statut:      r.statut || 'en_cours',
    });
    this.repairModalMode = 'form';
  }

  openDeleteRepair(id: number): void { this.repairDeleteId = id; this.repairModalMode = 'delete'; }

  closeRepairModal(): void {
    this.repairModalMode = null; this.repairSelected = null;
    this.repairDeleteId = null; this.repairSubmitting = false; this.repairIsEditing = false;
  }

  saveRepair(): void {
    if (this.repairForm.invalid || !this.car) return;
    this.repairSubmitting = true;
    const v = this.repairForm.value;
    const payload: any = { voitureId: this.car.id, descriptionTechnique: v.descriptionTechnique, dateDebut: v.dateDebut };
    if (v.dateFin)  payload.dateFin     = v.dateFin;
    payload.dateFacture = v.dateFacture || null;
    if (v.montant != null && v.montant !== '') payload.montant     = parseFloat(v.montant);
    if (v.paye    != null && v.paye    !== '') payload.montantPaye = parseFloat(v.paye);
    if (v.statut) payload.statut = v.statut;
    const req = this.repairIsEditing
      ? this.crud.update('reparation', this.repairSelected.id, payload)
      : this.crud.create('reparation', payload);
    req.subscribe({
      next: () => { this.closeRepairModal(); this.carRefresh.emit(); },
      error: () => { this.repairSubmitting = false; },
    });
  }

  confirmDeleteRepair(): void {
    if (!this.repairDeleteId) return;
    this.crud.remove('reparation', this.repairDeleteId).subscribe({
      next:  () => { this.closeRepairModal(); this.carRefresh.emit(); },
      error: () => { this.closeRepairModal(); },
    });
  }

  get repairReste(): number {
    return Math.max(0,
      (parseFloat(this.repairForm.get('montant')?.value) || 0) -
      (parseFloat(this.repairForm.get('paye')?.value)    || 0)
    );
  }

  private subscribeRepairAutoStatus(): void {
    const update = () => {
      const montant = parseFloat(this.repairForm.get('montant')?.value) || 0;
      const paye    = parseFloat(this.repairForm.get('paye')?.value)    || 0;
      const next    = montant > 0 && paye >= montant ? 'termine' : 'en_cours';
      this.repairForm.get('statut')?.setValue(next, { emitEvent: false });
    };
    this.repairForm.get('montant')?.valueChanges.subscribe(update);
    this.repairForm.get('paye')?.valueChanges.subscribe(update);
  }

  repairStatusClass(r: any): string {
    const s = (r.statut || '').toLowerCase();
    if (s === 'en_cours') return 'rs-active';
    if (s === 'termine')  return 'rs-done';
    if (s === 'annule')   return 'rs-cancelled';
    return 'rs-pending';
  }

  repairStatusLabel(r: any): string {
    const s = (r.statut || '').toLowerCase();
    if (s === 'en_cours') return this.t('inProgress');
    if (s === 'termine')  return this.t('done');
    if (s === 'annule')   return this.t('cancelled');
    return s ? s.charAt(0).toUpperCase() + s.slice(1) : '—';
  }

  // ── PayDep panel ─────────────────────────────────────────────────────────
  openPayDepPanel(r: any, type?: string): void {
    this.payDepRecord    = r;
    this.payDepType      = this.EXPENSE_TYPE_MAP[type || this.expenseTypeSelected] || (type || this.expenseTypeSelected);
    this.payDepPanelOpen = true;
  }

  closePayDepPanel(): void {
    this.payDepPanelOpen = false;
    this.payDepRecord    = null;
    this.payDepType      = '';
  }

  refreshExpenseAfterPayment(): void {
    const expType = Object.entries(this.EXPENSE_TYPE_MAP).find(([, v]) => v === this.payDepType)?.[0];
    if (!expType) return;
    if (expType === 'repairs') {
      this.carRefresh.emit();
    } else {
      const recordId = this.payDepRecord?.id;
      this.expenseLoadedTypes.delete(expType);
      this.loadExpenseType(expType, () => {
        if (recordId && this.payDepPanelOpen) {
          const fresh = this.expenseDataMap[expType]?.find((r: any) => r.id === recordId);
          if (fresh) this.payDepRecord = fresh;
        }
      });
      if (this.expenseTypeSelected === 'all') { this.expAllTypesLoaded = false; this.loadAllExpenseTypes(); }
    }
  }

  payDepStatusClass(r: any): string {
    const s = (r.paymentStatut || '').toLowerCase();
    if (s === 'paid')    return 'ps-paid';
    if (s === 'partial') return 'ps-partial';
    return 'ps-unpaid';
  }

  payDepStatusLabel(r: any): string {
    const s = (r.paymentStatut || '').toLowerCase();
    if (s === 'paid')    return this.t('paid');
    if (s === 'partial') return this.t('partial');
    return this.t('unpaid');
  }

  get carTitle(): string { return this.car ? `${this.car.marque} ${this.car.modele}` : ''; }
}
