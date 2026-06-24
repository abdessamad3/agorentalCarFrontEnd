import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { CrudService } from '../../services/crud.service';
import { TranslationService } from '../../services/translation.service';

export interface VehicleCredit {
  id: number;
  voitureId: number;
  voiture: string;
  immatriculation?: string;
  financialInstitution?: string;
  institutionType?: string;
  contractNumber?: string;
  vehiclePrice: number;
  downPayment: number;
  financedAmount: number;
  interestRate: number;
  durationMonths: number;
  monthlyInstallment: number;
  totalCost: number;
  remainingBalance: number;
  totalPaid: number;
  progressPct: number;
  startDate: string;
  endDate: string;
  dueDay?: number;
  status: string;
  installmentCount?: number;
  paidInstallments?: number;
  overdueInstallments?: number;
  createdAt?: string;
}

@Component({
  selector: 'app-credit-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './credit-list.component.html',
  styleUrls: ['../../shared/styles/reports.css'],
})
export class CreditListComponent implements OnInit {
  loading = false;
  dir = 'ltr';

  items: VehicleCredit[] = [];
  search = '';
  filterStatus = '';

  readonly statuses = [
    { value: '', label: 'All Statuses' },
    { value: 'draft',            label: 'Draft' },
    { value: 'pending_approval', label: 'Pending Approval' },
    { value: 'active',           label: 'Active' },
    { value: 'completed',        label: 'Completed' },
    { value: 'defaulted',        label: 'Defaulted' },
    { value: 'cancelled',        label: 'Cancelled' },
  ];

  constructor(
    private crud: CrudService,
    private ts: TranslationService,
    private router: Router,
  ) {}

  ngOnInit() {
    this.ts.direction$.subscribe(d => this.dir = d);
    this.load();
  }

  load() {
    this.loading = true;
    const params = this.filterStatus ? { status: this.filterStatus } : {};
    this.crud.getAll('vehicle-credit', params).subscribe({
      next: (res: any) => {
        this.items   = Array.isArray(res) ? res : (res?.data ?? []);
        this.loading = false;
      },
      error: () => { this.loading = false; },
    });
  }

  get filtered(): VehicleCredit[] {
    const q = this.search.toLowerCase();
    return q
      ? this.items.filter(i =>
          (i.voiture ?? '').toLowerCase().includes(q) ||
          (i.immatriculation ?? '').toLowerCase().includes(q) ||
          (i.contractNumber ?? '').toLowerCase().includes(q) ||
          (i.financialInstitution ?? '').toLowerCase().includes(q)
        )
      : this.items;
  }

  goDetail(id: number) {
    this.router.navigate(['/vehicle-financing/detail', id]);
  }

  statusLabel(s: string): string {
    return this.statuses.find(x => x.value === s)?.label ?? s;
  }

  statusClass(s: string): string {
    const map: Record<string, string> = {
      draft: 'sp-other', pending_approval: 'sp-maintenance',
      active: 'sp-available', completed: 'sp-rented',
      defaulted: 'sp-other', cancelled: 'sp-other',
    };
    return map[s] ?? 'sp-other';
  }

  fmt(n: number): string {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M MAD';
    if (n >= 1_000)     return (n / 1_000).toFixed(0) + 'K MAD';
    return (n ?? 0).toLocaleString('fr-MA', { maximumFractionDigits: 0 }) + ' MAD';
  }

  progressColor(pct: number): string {
    if (pct >= 80) return '#276749';
    if (pct >= 50) return '#2b6cb0';
    if (pct >= 25) return '#d69e2e';
    return '#c53030';
  }
}
