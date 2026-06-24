import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { TranslationService } from '../../services/translation.service';
import { CrudService } from '../../services/crud.service';
import { catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { BtnComponent } from '../../shared/btn/btn.component';
import { PaginatorComponent } from '../../shared/paginator/paginator.component';

export interface PaymentRow {
  num: number;
  dueDate: string;
  amount: number;
  balance: number;
  status: 'pending' | 'paid' | 'late' | 'partial';
  paidDate?: string;
  invoiceUrl?: string;
  notes?: string;
}

@Component({
  selector: 'app-achat-list',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, BtnComponent, PaginatorComponent],
  templateUrl: './achat-list.component.html',
  styleUrls: ['../../shared/styles/crud-list.css', './achat-list.component.css']
})
export class AchatListComponent implements OnInit {
  items: any[] = [];
  voitures: any[] = [];
  fournisseurs: any[] = [];
  loading = true; error = ''; dir = 'ltr'; search = '';
  page = 1; limit = 20; total = 0;
  filterStatus = ''; filterType = '';
  modalMode: 'form' | 'delete' | 'schedule' | null = null;
  selected: any = null; form: FormGroup; isSubmitting = false;
  deleteId: number | null = null; isEditing = false;
  readonly endpoint = 'achat-voiture';

  drawerOpen = false;
  drawerItem: any = null;
  readonly objectEntries = Object.entries;

  resteAFinancer = 0;
  dureeMoisCalc = 0;
  dernierMensualiteCalc = 0;

  scheduleAchat: any = null;
  scheduleRows: PaymentRow[] = [];

  get totalFinancedVehicles() { return this.items.filter(i => i.typeFinancement !== 'comptant').length; }
  get totalRemainingDebt() {
    return this.items
      .filter(i => i.statut === 'actif' && i.typeFinancement !== 'comptant')
      .reduce((sum, i) => sum + Math.max(0, (i.prixAchat || 0) - (i.apport || 0)), 0);
  }
  get totalMonthlyDue() {
    return this.items.filter(i => i.statut === 'actif' && i.typeFinancement !== 'comptant')
      .reduce((sum, i) => sum + (i.mensualite || 0), 0);
  }
  get overdueCount() {
    let count = 0;
    this.items.filter(i => i.statut === 'actif' && i.typeFinancement !== 'comptant').forEach(i => {
      const rows = this.generateSchedule(i);
      count += rows.filter(r => r.status === 'late').length;
    });
    return count;
  }

  constructor(private crud: CrudService, private ts: TranslationService, private fb: FormBuilder) {
    this.form = this.fb.group({
      voitureId:       ['', Validators.required],
      fournisseurId:   [''],
      dateAchat:       ['', Validators.required],
      prixAchat:       [0, [Validators.required, Validators.min(1)]],
      apport:          [0, [Validators.required, Validators.min(0)]],
      typeFinancement: ['comptant', Validators.required],
      mensualite:      [0],
      tauxInteret:     [0],
      dateDebutCredit: [''],
      notes:           [''],
      statut:          ['actif']
    });

    ['prixAchat', 'apport', 'mensualite'].forEach(f =>
      this.form.get(f)?.valueChanges.subscribe(() => this.recalculate())
    );
    this.form.get('typeFinancement')?.valueChanges.subscribe(type => {
      if (type === 'comptant') {
        this.form.get('mensualite')?.setValue(0, { emitEvent: false });
        this.resteAFinancer = 0; this.dureeMoisCalc = 0; this.dernierMensualiteCalc = 0;
      } else { this.recalculate(); }
    });
  }

  get isCreditType(): boolean {
    const t = this.form.get('typeFinancement')?.value;
    return t === 'credit' || t === 'leasing';
  }

  ngOnInit() {
    this.ts.direction$.subscribe(d => this.dir = d);
    this.crud.getAll('voiture').pipe(catchError(() => of([]))).subscribe(r => {
      this.voitures = Array.isArray(r) ? r : (r as any)?.data ?? [];
    });
    this.crud.getAll('fournisseur').pipe(catchError(() => of([]))).subscribe(r => {
      this.fournisseurs = Array.isArray(r) ? r : (r as any)?.data ?? [];
    });
    this.load();
  }

  recalculate() {
    const price     = +(this.form.get('prixAchat')?.value  ?? 0);
    const apport    = +(this.form.get('apport')?.value     ?? 0);
    const mensualite = +(this.form.get('mensualite')?.value ?? 0);
    this.resteAFinancer = Math.max(0, price - apport);
    if (mensualite > 0) {
      this.dureeMoisCalc = Math.floor(this.resteAFinancer / mensualite);
      this.dernierMensualiteCalc = +(this.resteAFinancer - this.dureeMoisCalc * mensualite).toFixed(2);
    } else { this.dureeMoisCalc = 0; this.dernierMensualiteCalc = 0; }
  }

  load() {
    this.loading = true; this.error = '';
    this.crud.getPage(this.endpoint, { page: this.page, limit: this.limit, search: this.search, status: this.filterStatus, type: this.filterType }).subscribe({
      next: r => { this.items = r.data ?? []; this.total = r.meta?.total ?? 0; this.loading = false; },
      error: () => { this.error = this.ts.translate('loadError'); this.loading = false; }
    });
  }

  get filtered(): any[] {
    let res = this.items;
    if (this.search.trim()) {
      const q = this.search.toLowerCase();
      res = res.filter(i => Object.values(i).some(v => String(v).toLowerCase().includes(q)));
    }
    if (this.filterStatus) res = res.filter(i => i.statut === this.filterStatus);
    if (this.filterType)   res = res.filter(i => i.typeFinancement === this.filterType);
    return res;
  }

  get paged(): any[] { return this.items; }

  onSearch(): void { this.page = 1; this.load(); }
  onPageChange(p: number): void { this.page = p; this.load(); }

  openView(item: any)     { this.drawerItem = item; this.drawerOpen = true; }
  openSchedule(item: any) {
    this.scheduleAchat = item;
    this.scheduleRows  = this.generateSchedule(item);
    this.modalMode = 'schedule';
  }
  openAdd() {
    this.selected = null; this.isEditing = false;
    this.resteAFinancer = 0; this.dureeMoisCalc = 0; this.dernierMensualiteCalc = 0;
    this.form.reset({ typeFinancement: 'comptant', prixAchat: 0, apport: 0, mensualite: 0, tauxInteret: 0, statut: 'actif' });
    this.modalMode = 'form';
  }
  openEdit(item: any) {
    this.selected = item; this.isEditing = true;
    this.form.patchValue({ ...item });
    this.recalculate();
    this.modalMode = 'form';
  }
  openDelete(id: number)  { this.deleteId = id; this.modalMode = 'delete'; }
  closeModal()            {
    this.modalMode = null; this.selected = null; this.deleteId = null;
    this.isSubmitting = false; this.isEditing = false; this.scheduleAchat = null;
  }
  closeDrawer()           { this.drawerOpen = false; this.drawerItem = null; }

  @HostListener('document:keydown.escape') onEscape() { this.closeModal(); this.closeDrawer(); }

  displayValue(val: any): string {
    if (val === null || val === undefined) return '—';
    if (typeof val === 'object') return val.nom || val.name || val.libelle || val.marque || val.titre || JSON.stringify(val);
    return String(val);
  }

  save() {
    if (this.form.invalid) return;
    this.isSubmitting = true;
    const payload = {
      ...this.form.value,
      dureeMois:         this.isCreditType ? this.dureeMoisCalc         : 0,
      dernierMensualite: this.isCreditType ? this.dernierMensualiteCalc : 0,
      resteAFinancer:    this.isCreditType ? this.resteAFinancer        : 0
    };
    const req = this.isEditing
      ? this.crud.update(this.endpoint, this.selected.id, payload)
      : this.crud.create(this.endpoint, payload);
    req.subscribe({ next: () => { this.closeModal(); this.load(); }, error: () => { this.isSubmitting = false; } });
  }

  confirmDelete() {
    if (!this.deleteId) return;
    this.crud.remove(this.endpoint, this.deleteId).subscribe({
      next: () => { this.closeModal(); this.load(); }, error: () => this.closeModal()
    });
  }

  generateSchedule(achat: any): PaymentRow[] {
    const rest = Math.max(0, (achat.prixAchat || 0) - (achat.apport || 0));
    const mensualite = achat.mensualite || 0;
    if (mensualite <= 0 || rest <= 0 || achat.typeFinancement === 'comptant') return [];
    const months = Math.floor(rest / mensualite);
    const lastAmt = +(rest - months * mensualite).toFixed(2);
    const rows: PaymentRow[] = [];
    const base = achat.dateDebutCredit
      ? new Date(achat.dateDebutCredit)
      : new Date(achat.dateAchat || new Date());
    const today = new Date(); today.setHours(0, 0, 0, 0);
    let balance = rest;

    for (let i = 1; i <= months; i++) {
      const d = new Date(base);
      d.setMonth(d.getMonth() + i);
      balance = +(balance - mensualite).toFixed(2);
      const due = new Date(d); due.setHours(0, 0, 0, 0);
      rows.push({ num: i, dueDate: d.toISOString().split('T')[0], amount: mensualite, balance: Math.max(0, balance), status: due < today ? 'late' : 'pending' });
    }
    if (lastAmt > 0) {
      const d = new Date(base);
      d.setMonth(d.getMonth() + months + 1);
      const due = new Date(d); due.setHours(0, 0, 0, 0);
      rows.push({ num: months + 1, dueDate: d.toISOString().split('T')[0], amount: lastAmt, balance: 0, status: due < today ? 'late' : 'pending' });
    }
    return rows;
  }

  getVoitureName(id: any): string {
    const v = this.voitures.find(x => x.id == id);
    return v ? `${v.marque} ${v.modele}` : (id || '-');
  }

  getFournisseurName(id: any): string {
    const f = this.fournisseurs.find(x => x.id == id);
    return f ? (f.raisonSociale || f.nom || f.name || '-') : (id || '-');
  }

  statusClass(s: string): string {
    return { actif: 'st-actif', brouillon: 'st-brouillon', termine: 'st-termine', annule: 'st-annule', archive: 'st-archive' }[s] ?? '';
  }
  typeClass(t: string): string {
    return { comptant: 'type-comptant', credit: 'type-credit', leasing: 'type-leasing' }[t] ?? '';
  }
  payStatusClass(s: string): string {
    return { pending: 'pay-pending', paid: 'pay-paid', late: 'pay-late', partial: 'pay-partial' }[s] ?? '';
  }
  t(key: string): string { return this.ts.translate(key); }
  fmt(n: number): string { return (n ?? 0).toLocaleString('fr-MA') + ' MAD'; }

  scheduleStats() {
    const paid = this.scheduleRows.filter(r => r.status === 'paid').length;
    const late = this.scheduleRows.filter(r => r.status === 'late').length;
    const paidAmt = this.scheduleRows.filter(r => r.status === 'paid').reduce((s, r) => s + r.amount, 0);
    const remaining = this.scheduleRows.filter(r => r.status !== 'paid').reduce((s, r) => s + r.amount, 0);
    return { paid, late, paidAmt, remaining };
  }
}
