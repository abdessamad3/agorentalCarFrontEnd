import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { CrudService } from '../../services/crud.service';
import { TranslationService } from '../../services/translation.service';
import { BtnComponent } from '../../shared/btn/btn.component';

@Component({
  selector: 'app-vente-list',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule, BtnComponent],
  templateUrl: './vente-list.component.html',
  styleUrls: ['../../shared/styles/crud-list.css', './vente-list.component.css']
})
export class VenteListComponent implements OnInit {
  voitures: any[] = [];
  loading = true;
  error = '';
  dir = 'ltr';
  search = '';
  activeTab: 'available' | 'sold' = 'available';

  modalMode: 'sell' | 'view' | 'editSale' | null = null;
  selectedCar: any = null;
  isSubmitting = false;

  form: FormGroup;

  constructor(
    private crud: CrudService,
    private ts: TranslationService,
    private fb: FormBuilder
  ) {
    this.form = this.fb.group({
      dateVente: [new Date().toISOString().split('T')[0], Validators.required],
      prixVente: ['', [Validators.required, Validators.min(0)]],
      acheteur:  [''],
      notesVente: ['']
    });
  }

  private readonly SALES_KEY = 'agocar_ventes';

  ngOnInit() {
    this.ts.direction$.subscribe(d => this.dir = d);
    this.load();
  }

  private storedSales(): Record<string, any> {
    try { return JSON.parse(localStorage.getItem(this.SALES_KEY) || '{}'); }
    catch { return {}; }
  }

  private storeSale(carId: number, data: { dateVente: string; prixVente: number; acheteur: string; notesVente: string }): void {
    try {
      const all = this.storedSales();
      all[String(carId)] = data;
      localStorage.setItem(this.SALES_KEY, JSON.stringify(all));
    } catch {}
  }

  load() {
    this.loading = true;
    this.error = '';
    this.crud.getAll('voiture', { limit: 1000 }).subscribe({
      next: r => {
        const list: any[] = Array.isArray(r) ? r : (r?.data ?? r?.['hydra:member'] ?? []);
        const sales = this.storedSales();
        this.voitures = list.map(v =>
          (v.voitureStatus || '').toLowerCase() === 'vendu'
            ? { ...v, ...(sales[String(v.id)] || {}) }
            : v
        );
        this.loading = false;
      },
      error: () => {
        this.error = this.ts.translate('loadError');
        this.loading = false;
      }
    });
  }

  get availableVoitures(): any[] {
    let list = this.voitures.filter(v => (v.voitureStatus || '').toLowerCase() === 'disponible');
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

  get soldVoitures(): any[] {
    let list = this.voitures.filter(v => (v.voitureStatus || '').toLowerCase() === 'vendu');
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

  openSell(car: any) {
    this.selectedCar = car;
    this.form.reset({
      dateVente: new Date().toISOString().split('T')[0],
      prixVente: '',
      acheteur: '',
      notesVente: ''
    });
    this.modalMode = 'sell';
  }

  openView(car: any) {
    this.selectedCar = car;
    this.modalMode = 'view';
  }

  openEditSale(car: any) {
    this.selectedCar = car;
    this.form.reset({
      dateVente:  car.dateVente  || new Date().toISOString().split('T')[0],
      prixVente:  car.prixVente  || '',
      acheteur:   car.acheteur   || '',
      notesVente: car.notesVente || ''
    });
    this.modalMode = 'editSale';
  }

  confirmEditSale() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const v = this.form.value;
    this.storeSale(this.selectedCar.id, {
      dateVente:  v.dateVente,
      prixVente:  parseFloat(v.prixVente),
      acheteur:   v.acheteur   || '',
      notesVente: v.notesVente || ''
    });
    this.closeModal();
    this.load();
  }

  closeModal() {
    this.modalMode = null;
    this.selectedCar = null;
    this.isSubmitting = false;
  }

  @HostListener('document:keydown.escape')
  onEscape() { this.closeModal(); }

  confirmSell() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.isSubmitting = true;
    const v = this.form.value;
    const saleData = {
      dateVente:  v.dateVente,
      prixVente:  parseFloat(v.prixVente),
      acheteur:   v.acheteur   || '',
      notesVente: v.notesVente || ''
    };
    this.crud.update('voiture', this.selectedCar.id, { voitureStatus: 'vendu' }).subscribe({
      next: () => {
        this.storeSale(this.selectedCar.id, saleData);
        this.closeModal();
        this.load();
        this.activeTab = 'sold';
      },
      error: () => { this.isSubmitting = false; }
    });
  }

  saleProfit(car: any): number | null {
    if (car?.prixVente != null && car?.prixAchat != null) {
      return parseFloat(car.prixVente) - parseFloat(car.prixAchat);
    }
    return null;
  }

  carLabel(v: any): string {
    return [v?.marque, v?.modele, v?.annee].filter(Boolean).join(' ');
  }

  t(key: string): string { return this.ts.translate(key); }
}
