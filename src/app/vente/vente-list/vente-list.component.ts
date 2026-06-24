import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { forkJoin } from 'rxjs';
import { CrudService } from '../../services/crud.service';
import { TranslationService } from '../../services/translation.service';
import { BtnComponent } from '../../shared/btn/btn.component';
import { PaginatorComponent } from '../../shared/paginator/paginator.component';

@Component({
  selector: 'app-vente-list',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule, BtnComponent, PaginatorComponent],
  templateUrl: './vente-list.component.html',
  styleUrls: ['../../shared/styles/crud-list.css', './vente-list.component.css']
})
export class VenteListComponent implements OnInit {
  /** All non-sold voitures (available tab) */
  voitures: any[] = [];
  /** All vente records from API (sold tab) */
  ventes: any[] = [];

  loading = true;
  error = '';
  dir = 'ltr';
  search = '';
  activeTab: 'available' | 'sold' = 'available';
  page = 1;
  limit = 20;
  totalVoitures = 0;
  totalVentes = 0;

  modalMode: 'sell' | 'editSale' | null = null;
  selectedCar: any = null;
  selectedVente: any = null;
  isSubmitting = false;

  drawerOpen = false;
  drawerItem: any = null;
  readonly objectEntries = Object.entries;

  form: FormGroup;

  constructor(
    private crud: CrudService,
    private ts: TranslationService,
    private fb: FormBuilder
  ) {
    this.form = this.fb.group({
      dateVente:  [new Date().toISOString().split('T')[0], Validators.required],
      prixVente:  ['', [Validators.required, Validators.min(0)]],
      acheteur:   [''],
      notesVente: ['']
    });
  }

  ngOnInit() {
    this.ts.direction$.subscribe(d => this.dir = d);
    this.load();
  }

  load() {
    this.loading = true;
    this.error   = '';
    forkJoin({
      voitures: this.crud.getPage('voiture', { page: this.page, limit: this.limit, search: this.search }),
      ventes:   this.crud.getPage('vente',   { page: this.page, limit: this.limit, search: this.search })
    }).subscribe({
      next: ({ voitures, ventes }) => {
        this.voitures = (voitures.data ?? []).filter(v => (v.voitureStatus || '').toLowerCase() !== 'vendu');
        this.totalVoitures = voitures.meta?.total ?? 0;
        this.ventes = ventes.data ?? [];
        this.totalVentes = ventes.meta?.total ?? 0;
        this.loading  = false;
      },
      error: () => {
        this.error   = this.ts.translate('loadError');
        this.loading = false;
      }
    });
  }

  get total(): number { return this.activeTab === 'available' ? this.totalVoitures : this.totalVentes; }

  // ── Available tab ────────────────────────────────────────────────────────────

  get availableVoitures(): any[] {
    let list = this.voitures;
    if (this.search.trim()) {
      const q = this.search.toLowerCase();
      list = list.filter(v =>
        (v.marque || '').toLowerCase().includes(q) ||
        (v.modele || '').toLowerCase().includes(q) ||
        (v.immatriculation || '').toLowerCase().includes(q)
      );
    }
    return list;
  }

  get pagedAvailable(): any[] { return this.availableVoitures; }

  // ── Sold tab ─────────────────────────────────────────────────────────────────

  get soldVoitures(): any[] {
    let list = this.ventes;
    if (this.search.trim()) {
      const q = this.search.toLowerCase();
      list = list.filter(v =>
        (v.marque || '').toLowerCase().includes(q) ||
        (v.modele || '').toLowerCase().includes(q) ||
        (v.immatriculation || '').toLowerCase().includes(q) ||
        (v.acheteur || '').toLowerCase().includes(q)
      );
    }
    return list;
  }

  get pagedSold(): any[] { return this.soldVoitures; }

  // ── Pagination & search ───────────────────────────────────────────────────────

  onSearch(): void { this.page = 1; this.load(); }
  onPageChange(p: number): void { this.page = p; this.load(); }

  // ── Modals ────────────────────────────────────────────────────────────────────

  openSell(car: any) {
    this.selectedCar = car;
    this.form.reset({
      dateVente:  new Date().toISOString().split('T')[0],
      prixVente:  '',
      acheteur:   '',
      notesVente: ''
    });
    this.modalMode = 'sell';
  }

  openView(vente: any) {
    this.drawerItem = vente;
    this.drawerOpen = true;
  }

  openEditSale(vente: any) {
    this.selectedVente = vente;
    this.form.reset({
      dateVente:  vente.dateVente  || new Date().toISOString().split('T')[0],
      prixVente:  vente.prixVente  || '',
      acheteur:   vente.acheteur   || '',
      notesVente: vente.notes      || ''
    });
    this.modalMode = 'editSale';
  }

  confirmSell() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.isSubmitting = true;
    const v = this.form.value;
    this.crud.create('vente', {
      voitureId: this.selectedCar.id,
      dateVente: v.dateVente,
      prixVente: parseFloat(v.prixVente),
      acheteur:  v.acheteur   || null,
      notes:     v.notesVente || null
    }).subscribe({
      next: () => {
        this.closeModal();
        this.load();
        this.activeTab = 'sold';
      },
      error: () => { this.isSubmitting = false; }
    });
  }

  confirmEditSale() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const v = this.form.value;
    this.crud.update('vente', this.selectedVente.id, {
      dateVente: v.dateVente,
      prixVente: parseFloat(v.prixVente),
      acheteur:  v.acheteur   || null,
      notes:     v.notesVente || null
    }).subscribe({
      next: () => {
        this.closeModal();
        this.load();
      },
      error: () => {}
    });
  }

  closeModal() {
    this.modalMode     = null;
    this.selectedCar   = null;
    this.selectedVente = null;
    this.isSubmitting  = false;
  }

  closeDrawer() { this.drawerOpen = false; this.drawerItem = null; }

  @HostListener('document:keydown.escape')
  onEscape() { this.closeModal(); this.closeDrawer(); }

  // ── Helpers ───────────────────────────────────────────────────────────────────

  saleProfit(v: any): number | null {
    if (v?.benefice != null) return parseFloat(v.benefice);
    if (v?.prixVente != null && v?.prixAchat != null) {
      return parseFloat(v.prixVente) - parseFloat(v.prixAchat);
    }
    return null;
  }

  carLabel(v: any): string {
    return [v?.marque, v?.modele, v?.annee].filter(Boolean).join(' ');
  }

  displayValue(val: any): string {
    if (val === null || val === undefined) return '—';
    if (typeof val === 'object') return val.nom || val.name || val.libelle || val.marque || val.titre || JSON.stringify(val);
    return String(val);
  }

  t(key: string): string { return this.ts.translate(key); }
}
