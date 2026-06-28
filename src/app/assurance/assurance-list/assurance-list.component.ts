import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslationService } from '../../services/translation.service';
import { CrudService } from '../../services/crud.service';
import { EventBusService } from '../../services/event-bus.service';
import { InsuranceModalComponent, InsuranceSavePayload } from '../../shared/insurance-modal/insurance-modal.component';
import { PaginatorComponent } from '../../shared/paginator/paginator.component';

@Component({
  selector: 'app-assurance-list',
  standalone: true,
  imports: [CommonModule, FormsModule, InsuranceModalComponent, PaginatorComponent],
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
  showArchived = false;
  page = 1; limit = 20; total = 0;

  modalMode: 'add' | 'edit' | 'view' | 'delete' | 'renew' | null = null;
  selected: any = null;
  isSubmitting = false;
  deleteId: number | null = null;

  readonly endpoint = 'assurance';

  constructor(
    private crud: CrudService,
    private ts: TranslationService,
    private bus: EventBusService,
  ) {}


  ngOnInit() {
    this.ts.direction$.subscribe(d => this.dir = d);
    this.load();
    this.loadVoitures();
  }

  load() {
    this.loading = true; this.error = '';
    const params: Record<string, any> = { page: this.page, limit: this.limit };
    if (this.showArchived) params['archived'] = true;
    if (this.search.trim()) params['search'] = this.search;
    this.crud.getPage(this.endpoint, params).subscribe({
      next: r => { this.items = r.data ?? []; this.total = r.meta?.total ?? 0; this.loading = false; },
      error: () => { this.error = this.ts.translate('loadError'); this.loading = false; }
    });
  }

  toggleArchived() {
    this.showArchived = !this.showArchived;
    this.statusFilter = '';
    this.load();
  }

  loadVoitures() {
    this.crud.getAll('voiture', { limit: 500 }).subscribe({
      next: r => { this.voitures = Array.isArray(r) ? r : (r?.data ?? r?.['hydra:member'] ?? []); },
      error: () => {}
    });
  }

  get allItems(): any[] {
    return this.items;
  }

  getStatus(item: any): 'active' | 'expiring' | 'expired' | 'archived' {
    if (item.status === 'archived' || item.archivedAt) return 'archived';
    if (!item.dateFin) return 'active';
    const diff = this.daysUntil(item.dateFin);
    if (diff < 0) return 'expired';
    if (diff <= 30) return 'expiring';
    return 'active';
  }

  daysUntil(dateStr: string): number {
    const parts = dateStr.slice(0, 10).split('-').map(Number);
    const d = new Date(parts[0], parts[1] - 1, parts[2]);
    const now = new Date(); now.setHours(0, 0, 0, 0);
    return Math.floor((d.getTime() - now.getTime()) / 86400000);
  }

  get stats() {
    const active   = this.allItems.filter(i => this.getStatus(i) === 'active').length;
    const expiring = this.allItems.filter(i => this.getStatus(i) === 'expiring').length;
    const expired  = this.allItems.filter(i => this.getStatus(i) === 'expired').length;
    const totalCost = this.items.reduce((s, i) => s + (parseFloat(i.montant) || 0), 0);
    return { active, expiring, expired, totalCost };
  }

  get companies(): string[] {
    return [...new Set(this.items.map(i => i.compagnie).filter(Boolean))].sort();
  }

  get alerts(): any[] {
    return this.allItems
      .filter(i => i.dateFin && this.daysUntil(i.dateFin) <= 7)
      .sort((a, b) => this.daysUntil(a.dateFin) - this.daysUntil(b.dateFin));
  }

  get filtered(): any[] {
    let list = [...this.allItems];
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

  get paged(): any[] { return this.filtered; }

  onSearch(): void { this.page = 1; this.load(); }
  onPageChange(p: number): void { this.page = p; this.load(); }

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
  openAdd()           { this.selected = null; this.modalMode = 'add'; }
  openEdit(item: any) { this.selected = item; this.modalMode = 'edit'; }
  openRenew(item: any){ this.selected = item; this.modalMode = 'renew'; }
  openDelete(item: any){ this.selected = item; this.deleteId = item.id; this.modalMode = 'delete'; }

  openFormalize(carItem: any) {
    this.selected = {
      voitureId:    carItem.voitureId,
      dateFin:      carItem.dateFin ? carItem.dateFin.split('T')[0] : '',
      compagnie:    '',
      typeAssurance: '',
      numeroContrat: '',
      dateDebut:    '',
      montant:      null,
    };
    this.modalMode = 'add';
  }

  closeModal() {
    this.modalMode = null; this.selected = null;
    this.deleteId = null; this.isSubmitting = false;
  }

  onModalSaved(payload: InsuranceSavePayload): void {
    this.isSubmitting = true;
    const raw = payload.value;
    const body = Object.fromEntries(
      Object.entries(raw).filter(([, v]) => v !== null && v !== '')
    );
    const req = (this.modalMode === 'edit' && this.selected?.id)
      ? this.crud.update(this.endpoint, this.selected.id, body)
      : this.crud.create(this.endpoint, body);
    req.subscribe({
      next: () => { this.closeModal(); this.load(); this.bus.paymentsChanged$.next(); },
      error: () => { this.isSubmitting = false; }
    });
  }

  onRenewConfirmed(data: {
    dateDebut: string; dateFin: string; montant: number | null;
    compagnie: string | null; typeAssurance: string | null;
    numeroContrat: string | null; montantPaye: number | null;
  }): void {
    if (!this.selected?.id) return;
    this.isSubmitting = true;
    const body: Record<string, any> = {
      dateDebut: data.dateDebut,
      dateFin:   data.dateFin,
    };
    if (data.montant      != null) body['montant']       = data.montant;
    if (data.compagnie)            body['compagnie']     = data.compagnie;
    if (data.typeAssurance)        body['typeAssurance'] = data.typeAssurance;
    if (data.numeroContrat)        body['numeroContrat'] = data.numeroContrat;
    if (data.montantPaye  != null) body['montantPaye']   = data.montantPaye;

    this.crud.customAction(`assurance/${this.selected.id}/renew`, body, 'Insurance renewed successfully')
      .subscribe({
        next: () => { this.closeModal(); this.load(); this.bus.paymentsChanged$.next(); },
        error: () => { this.isSubmitting = false; }
      });
  }

  onDeleteConfirmed(): void {
    if (!this.deleteId) return;
    this.crud.remove(this.endpoint, this.deleteId).subscribe({
      next: () => { this.closeModal(); this.load(); },
      error: () => this.closeModal()
    });
  }

  t(key: string): string { return this.ts.translate(key); }
}
