import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { CrudService } from '../../services/crud.service';
import { TranslationService } from '../../services/translation.service';

@Component({
  selector: 'app-credit-create',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './credit-create.component.html',
  styleUrls: ['../../shared/styles/reports.css'],
})
export class CreditCreateComponent implements OnInit {
  loading = false;
  saving  = false;
  dir = 'ltr';

  voitures: any[]   = [];
  suppliers: any[]  = [];
  institutions: any[] = [];

  form = {
    voitureId:               null as number | null,
    supplierId:              null as number | null,
    financialInstitutionId:  null as number | null,
    contractNumber:          '',
    vehiclePrice:            0,
    downPayment:             0,
    interestRate:            0,
    durationMonths:          48,
    startDate:               new Date().toISOString().substring(0, 10),
    dueDay:                  5,
    firstPaymentDate:        '',
    purchaseDate:            '',
    purchaseInvoiceNumber:   '',
    status:                  'draft',
    notes:                   '',
  };

  // Computed
  financedAmount      = 0;
  monthlyInstallment  = 0;
  totalCost           = 0;
  endDate             = '';

  errorMsg = '';

  readonly durationOptions = [12, 24, 36, 48, 60, 72, 84];
  readonly statusOptions = [
    { value: 'draft',            label: 'Draft' },
    { value: 'pending_approval', label: 'Pending Approval' },
    { value: 'active',           label: 'Active (generates installments)' },
  ];

  constructor(
    private crud: CrudService,
    private ts: TranslationService,
    private router: Router,
  ) {}

  ngOnInit() {
    this.ts.direction$.subscribe(d => this.dir = d);
    this.loadDropdowns();
    this.recalculate();
  }

  loadDropdowns() {
    this.loading = true;
    forkJoin({
      voitures:     this.crud.getAll('voiture', { limit: 500 }).pipe(catchError(() => of([]))),
      suppliers:    this.crud.getAll('fournisseur').pipe(catchError(() => of([]))),
      institutions: this.crud.getAll('financial-institution', { status: 'active' }).pipe(catchError(() => of([]))),
    }).subscribe({
      next: ({ voitures, suppliers, institutions }: any) => {
        this.voitures     = Array.isArray(voitures)     ? voitures     : (voitures?.data     ?? []);
        this.suppliers    = Array.isArray(suppliers)    ? suppliers    : (suppliers?.data    ?? []);
        this.institutions = Array.isArray(institutions) ? institutions : (institutions?.data ?? []);
        this.loading = false;
      },
      error: () => { this.loading = false; },
    });
  }

  recalculate() {
    const price     = +this.form.vehiclePrice || 0;
    const down      = +this.form.downPayment  || 0;
    this.financedAmount = Math.max(0, price - down);

    const months = +this.form.durationMonths || 1;
    const rate   = +this.form.interestRate   || 0;

    if (rate <= 0) {
      this.monthlyInstallment = this.financedAmount > 0 ? this.financedAmount / months : 0;
    } else {
      const r = (rate / 100) / 12;
      this.monthlyInstallment = this.financedAmount * (r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1);
    }
    this.monthlyInstallment = Math.round(this.monthlyInstallment * 100) / 100;
    this.totalCost = Math.round(this.monthlyInstallment * months * 100) / 100;

    // end date
    if (this.form.startDate) {
      const d = new Date(this.form.startDate);
      d.setMonth(d.getMonth() + months);
      this.endDate = d.toISOString().substring(0, 10);
    }
  }

  submit() {
    if (!this.form.voitureId || !this.form.vehiclePrice || !this.form.durationMonths) {
      this.errorMsg = 'Vehicle, price and duration are required.';
      return;
    }
    this.errorMsg = '';
    this.saving = true;

    const payload = {
      ...this.form,
      financedAmount:     this.financedAmount,
      monthlyInstallment: this.monthlyInstallment,
      totalCost:          this.totalCost,
    };

    this.crud.create('vehicle-credit', payload).subscribe({
      next: (res: any) => {
        this.saving = false;
        const id = res?.id;
        this.router.navigate(id ? ['/vehicle-financing/detail', id] : ['/vehicle-financing']);
      },
      error: (err: any) => {
        this.saving = false;
        this.errorMsg = err?.error?.error ?? 'Error creating contract';
      },
    });
  }

  fmt(n: number): string {
    return n.toLocaleString('fr-MA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' MAD';
  }

  voitureLabel(v: any): string {
    return `${v.marque ?? ''} ${v.modele ?? ''} ${v.immatriculation ? '— ' + v.immatriculation : ''}`.trim();
  }
}
