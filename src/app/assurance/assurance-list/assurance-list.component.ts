import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TranslationService } from '../../services/translation.service';
import { CrudService } from '../../services/crud.service';

@Component({
  selector: 'app-assurance-list',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule],
  templateUrl: './assurance-list.component.html',
  styleUrls: ['./assurance-list.component.css']
})
export class AssuranceListComponent implements OnInit {
  items: any[] = [];
  voitures: any[] = [];
  loading = true;
  error = '';
  dir = 'ltr';
  search = '';
  statusFilter = '';
  companyFilter = '';
  sortCol = 'dateFin';
  sortAsc = true;

  modalMode: 'view' | 'form' | 'delete' | 'renew' | null = null;
  selected: any = null;
  isSubmitting = false;
  deleteId: number | null = null;
  isEditing = false;
  form: FormGroup;
  renewForm: FormGroup;

  readonly endpoint = 'assurance';
  readonly COVERAGE_TYPES = ['RC', 'Tous Risques', 'Tiers Étendu', 'Tiers Simple'];

  constructor(
    private crud: CrudService,
    private ts: TranslationService,
    private fb: FormBuilder
  ) {
    this.form = this.fb.group({
      voitureId:    [null],
      numeroContrat: ['', Validators.required],
      compagnie:    [''],
      typeAssurance: [''],
      dateDebut:    [''],
      dateFin:      ['', Validators.required],
      montant:      [null],
      depenseId:    [null]
    });
    this.renewForm = this.fb.group({
      dateDebut: ['', Validators.required],
      dateFin:   ['', Validators.required],
      montant:   [null]
    });
  }

  ngOnInit() {
    this.ts.direction$.subscribe(d => this.dir = d);
    this.load();
    this.loadVoitures();
  }

  load() {
    this.loading = true; this.error = '';
    this.crud.getAll(this.endpoint).subscribe({
      next: r => {
        this.items = Array.isArray(r) ? r : (r?.data ?? r?.['hydra:member'] ?? []);
        this.loading = false;
      },
      error: () => { this.error = this.ts.translate('loadError'); this.loading = false; }
    });
  }

  loadVoitures() {
    this.crud.getAll('voiture', { limit: 500 }).subscribe({
      next: r => { this.voitures = Array.isArray(r) ? r : (r?.data ?? r?.['hydra:member'] ?? []); },
      error: () => {}
    });
  }

  getStatus(item: any): 'active' | 'expiring' | 'expired' {
    if (!item.dateFin) return 'active';
    const diff = this.daysUntil(item.dateFin);
    if (diff < 0) return 'expired';
    if (diff <= 30) return 'expiring';
    return 'active';
  }

  daysUntil(dateStr: string): number {
    const d = new Date(dateStr);
    d.setHours(0, 0, 0, 0);
    const now = new Date(); now.setHours(0, 0, 0, 0);
    return Math.ceil((d.getTime() - now.getTime()) / 86400000);
  }

  get stats() {
    const active   = this.items.filter(i => this.getStatus(i) === 'active').length;
    const expiring = this.items.filter(i => this.getStatus(i) === 'expiring').length;
    const expired  = this.items.filter(i => this.getStatus(i) === 'expired').length;
    const totalCost = this.items.reduce((s, i) => s + (parseFloat(i.montant) || 0), 0);
    return { active, expiring, expired, totalCost };
  }

  get companies(): string[] {
    return [...new Set(this.items.map(i => i.compagnie).filter(Boolean))].sort();
  }

  get alerts(): any[] {
    return this.items
      .filter(i => i.dateFin && this.daysUntil(i.dateFin) <= 7)
      .sort((a, b) => this.daysUntil(a.dateFin) - this.daysUntil(b.dateFin));
  }

  get filtered(): any[] {
    let list = [...this.items];
    if (this.search.trim()) {
      const q = this.search.toLowerCase();
      list = list.filter(i =>
        (i.numeroContrat || '').toLowerCase().includes(q) ||
        (i.compagnie || '').toLowerCase().includes(q) ||
        this.voitureName(i).toLowerCase().includes(q)
      );
    }
    if (this.statusFilter) list = list.filter(i => this.getStatus(i) === this.statusFilter);
    if (this.companyFilter) list = list.filter(i => i.compagnie === this.companyFilter);

    return list.sort((a, b) => {
      let va: any = a[this.sortCol] ?? '';
      let vb: any = b[this.sortCol] ?? '';
      if (this.sortCol === 'dateFin' || this.sortCol === 'dateDebut') {
        va = va ? new Date(va).getTime() : 0;
        vb = vb ? new Date(vb).getTime() : 0;
      }
      const cmp = va < vb ? -1 : va > vb ? 1 : 0;
      return this.sortAsc ? cmp : -cmp;
    });
  }

  toggleSort(col: string) {
    if (this.sortCol === col) { this.sortAsc = !this.sortAsc; }
    else { this.sortCol = col; this.sortAsc = true; }
  }

  voitureName(item: any): string {
    if (item.voiture && typeof item.voiture === 'object')
      return `${item.voiture.marque || ''} ${item.voiture.modele || ''}`.trim();
    const vid = item.voitureId ?? item.voiture;
    if (vid) {
      const v = this.voitures.find(v => v.id === +vid);
      if (v) return `${v.marque || ''} ${v.modele || ''}`.trim();
      return `#${vid}`;
    }
    return '—';
  }

  voiturePlate(item: any): string {
    if (item.voiture && typeof item.voiture === 'object') return item.voiture.immatriculation || '';
    const vid = item.voitureId ?? item.voiture;
    const v = this.voitures.find(v => v.id === +vid);
    return v?.immatriculation || '';
  }

  openView(item: any) { this.selected = item; this.modalMode = 'view'; }

  openAdd() {
    this.selected = null; this.isEditing = false;
    this.form.reset();
    this.modalMode = 'form';
  }

  openEdit(item: any) {
    this.selected = item; this.isEditing = true;
    this.form.patchValue({
      voitureId:    item.voitureId ?? item.voiture?.id ?? null,
      numeroContrat: item.numeroContrat || '',
      compagnie:    item.compagnie || '',
      typeAssurance: item.typeAssurance || '',
      dateDebut:    item.dateDebut ? item.dateDebut.split('T')[0] : '',
      dateFin:      item.dateFin ? item.dateFin.split('T')[0] : '',
      montant:      item.montant ?? null,
      depenseId:    item.depenseId ?? null
    });
    this.modalMode = 'form';
  }

  openRenew(item: any) {
    this.selected = item;
    const oldEnd = item.dateFin ? new Date(item.dateFin) : new Date();
    const ns = new Date(oldEnd); ns.setDate(ns.getDate() + 1);
    const ne = new Date(ns);    ne.setFullYear(ne.getFullYear() + 1);
    this.renewForm.reset({
      dateDebut: ns.toISOString().split('T')[0],
      dateFin:   ne.toISOString().split('T')[0],
      montant:   item.montant ?? null
    });
    this.modalMode = 'renew';
  }

  openDelete(id: number) { this.deleteId = id; this.modalMode = 'delete'; }

  closeModal() {
    this.modalMode = null; this.selected = null;
    this.deleteId = null; this.isSubmitting = false; this.isEditing = false;
  }

  @HostListener('document:keydown.escape') onEscape() { this.closeModal(); }

  save() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.isSubmitting = true;
    const payload = Object.fromEntries(
      Object.entries(this.form.value).filter(([, v]) => v !== null && v !== '')
    );
    const req = this.isEditing
      ? this.crud.update(this.endpoint, this.selected.id, payload)
      : this.crud.create(this.endpoint, payload);
    req.subscribe({
      next: () => { this.closeModal(); this.load(); },
      error: () => { this.isSubmitting = false; }
    });
  }

  confirmRenew() {
    if (this.renewForm.invalid) { this.renewForm.markAllAsTouched(); return; }
    this.isSubmitting = true;
    const v = this.renewForm.value;
    this.crud.update(this.endpoint, this.selected.id, {
      dateDebut: v.dateDebut, dateFin: v.dateFin,
      ...(v.montant != null ? { montant: parseFloat(v.montant) } : {})
    }).subscribe({
      next: () => { this.closeModal(); this.load(); },
      error: () => { this.isSubmitting = false; }
    });
  }

  confirmDelete() {
    if (!this.deleteId) return;
    this.crud.remove(this.endpoint, this.deleteId).subscribe({
      next: () => { this.closeModal(); this.load(); },
      error: () => this.closeModal()
    });
  }

  t(key: string): string { return this.ts.translate(key); }
}
