import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { CrudService } from '../../services/crud.service';
import { TranslationService } from '../../services/translation.service';

interface DashStats {
  totalFinancedVehicles: number;
  totalFinancedAmount:   number;
  totalRemainingDebt:    number;
  totalAmountPaid:       number;
  activeContracts:       number;
  completedContracts:    number;
  overdueContracts:      number;
  dueSoonInstallments:   number;
  dueTodayInstallments:  number;
  amountDueThisMonth:    number;
  overdueAmount:         number;
}

@Component({
  selector: 'app-credit-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './credit-dashboard.component.html',
  styleUrls: ['../../shared/styles/reports.css'],
})
export class CreditDashboardComponent implements OnInit {
  loading = true;
  dir = 'ltr';

  stats: DashStats = {
    totalFinancedVehicles: 0,
    totalFinancedAmount:   0,
    totalRemainingDebt:    0,
    totalAmountPaid:       0,
    activeContracts:       0,
    completedContracts:    0,
    overdueContracts:      0,
    dueSoonInstallments:   0,
    dueTodayInstallments:  0,
    amountDueThisMonth:    0,
    overdueAmount:         0,
  };

  recentContracts: any[] = [];
  upcomingInstallments: any[] = [];
  overdueInstallments:  any[] = [];
  institutions: any[] = [];

  // Chart: per-institution bar data
  institutionBars: { name: string; count: number; amount: number; pct: number }[] = [];

  constructor(private crud: CrudService, private ts: TranslationService) {}

  ngOnInit() {
    this.ts.direction$.subscribe(d => this.dir = d);
    this.load();
  }

  load() {
    this.loading = true;
    forkJoin({
      stats:    this.crud.getAll('vehicle-credit/stats/dashboard').pipe(catchError(() => of({}))),
      contracts: this.crud.getAll('vehicle-credit').pipe(catchError(() => of([]))),
      institutions: this.crud.getAll('financial-institution').pipe(catchError(() => of([]))),
    }).subscribe({
      next: ({ stats, contracts, institutions }: any) => {
        this.stats        = stats as DashStats;
        this.institutions = Array.isArray(institutions) ? institutions : [];

        const all: any[] = Array.isArray(contracts) ? contracts : (contracts?.data ?? []);

        // Recent 5 active/pending contracts
        this.recentContracts = all
          .filter(c => ['active', 'pending_approval', 'defaulted'].includes(c.status))
          .slice(0, 5);

        // Build institution breakdown
        const instMap = new Map<string, { count: number; amount: number }>();
        for (const c of all) {
          const name = c.financialInstitution ?? 'Unknown';
          const cur  = instMap.get(name) ?? { count: 0, amount: 0 };
          instMap.set(name, { count: cur.count + 1, amount: cur.amount + +(c.remainingBalance ?? 0) });
        }
        const maxAmt = Math.max(...Array.from(instMap.values()).map(v => v.amount), 1);
        this.institutionBars = Array.from(instMap.entries())
          .sort((a, b) => b[1].amount - a[1].amount)
          .slice(0, 6)
          .map(([name, v]) => ({
            name,
            count:  v.count,
            amount: v.amount,
            pct:    Math.round((v.amount / maxAmt) * 100),
          }));

        this.loading = false;
      },
      error: () => { this.loading = false; },
    });
  }

  fmt(n: number): string {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M MAD';
    if (n >= 1_000)     return (n / 1_000).toFixed(0) + 'K MAD';
    return (n ?? 0).toLocaleString('fr-MA', { maximumFractionDigits: 0 }) + ' MAD';
  }

  fmtFull(n: number): string {
    return (n ?? 0).toLocaleString('fr-MA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' MAD';
  }

  statusClass(s: string): string {
    const map: Record<string, string> = {
      draft: 'sp-other', pending_approval: 'sp-maintenance',
      active: 'sp-available', completed: 'sp-rented',
      defaulted: 'sp-other', cancelled: 'sp-other',
    };
    return map[s] ?? 'sp-other';
  }

  progressColor(pct: number): string {
    if (pct >= 80) return '#276749';
    if (pct >= 50) return '#2b6cb0';
    if (pct >= 25) return '#d69e2e';
    return '#c53030';
  }

  get repaymentPct(): number {
    const total = this.stats.totalFinancedAmount;
    return total > 0 ? Math.round((this.stats.totalAmountPaid / total) * 100) : 0;
  }
}
