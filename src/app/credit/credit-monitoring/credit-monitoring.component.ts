import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { CrudService } from '../../services/crud.service';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

interface ForecastMonth {
  label: string;
  total: number;
  barH: number;
  count: number;
}

interface CreditAlert {
  credit: any;
  daysUntilPayment: number;
  paymentDay: number;
}

interface CreditRow {
  raw: any;
  voitureLabel: string;
  remaining: number;
}

interface SupplierDebt {
  supplierId: number | null;
  supplierName: string;
  creditRows: CreditRow[];
  totalDebt: number;
  remaining: number;
  paid: number;
  paidPct: number;
}

@Component({
  selector: 'app-credit-monitoring',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './credit-monitoring.component.html',
  styleUrls: ['./credit-monitoring.component.css']
})
export class CreditMonitoringComponent implements OnInit {
  loading = true;

  forecast: ForecastMonth[] = [];
  alerts: CreditAlert[] = [];
  supplierDebts: SupplierDebt[] = [];

  activeCount    = 0;
  overdueCount   = 0;
  totalRemaining = 0;
  dueThisMonth   = 0;

  private readonly monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  constructor(private crud: CrudService) {}

  ngOnInit() {
    const safe = (obs: any) => obs.pipe(catchError(() => of([])));

    forkJoin({
      credits:      safe(this.crud.getAll('credit')),
      achats:       safe(this.crud.getAll('achat-voiture')),
      fournisseurs: safe(this.crud.getAll('fournisseur')),
    }).subscribe({
      next: (data: any) => {
        const credits      = this.toArr(data.credits);
        const achats       = this.toArr(data.achats);
        const fournisseurs = this.toArr(data.fournisseurs);

        this.buildKPIs(credits);
        this.buildForecast(credits);
        this.buildAlerts(credits);
        this.buildSupplierReport(credits, achats, fournisseurs);

        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  private toArr(r: any): any[] {
    return Array.isArray(r) ? r : (r?.data ?? r?.['hydra:member'] ?? []);
  }

  computeRemaining(credit: any): number {
    const total      = +(credit.montantTotal ?? 0);
    const apport     = +(credit.apport ?? 0);
    const mensualite = +(credit.mensualite ?? 0);
    const dureeMois  = +(credit.dureeMois ?? 0);
    const totalDue   = Math.max(0, total - apport);

    if (!credit.dateDebut || !mensualite) return totalDue;

    const today  = new Date();
    const start  = new Date(credit.dateDebut);
    const passed = (today.getFullYear() - start.getFullYear()) * 12 + (today.getMonth() - start.getMonth());
    const paid   = Math.min(Math.max(0, passed), dureeMois) * mensualite;

    return Math.max(0, totalDue - paid);
  }

  private buildKPIs(credits: any[]) {
    const active = credits.filter(c => c.statut === 'en_cours');
    this.activeCount    = active.length;
    this.overdueCount   = credits.filter(c => c.statut === 'en_retard').length;
    this.totalRemaining = active.reduce((s, c) => s + this.computeRemaining(c), 0);
    this.dueThisMonth   = active.reduce((s, c) => s + +(c.mensualite ?? 0), 0);
  }

  private buildForecast(credits: any[]) {
    const today  = new Date();
    const months: ForecastMonth[] = [];

    for (let i = 0; i < 12; i++) {
      const d = new Date(today.getFullYear(), today.getMonth() + i, 1);
      const y = d.getFullYear();
      const m = d.getMonth();
      let total = 0;
      let count = 0;

      for (const credit of credits) {
        if (credit.statut === 'termine') continue;
        if (!credit.dateDebut)           continue;

        const start      = new Date(credit.dateDebut);
        const monthStart = new Date(y, m, 1);
        if (start > monthStart) continue;

        const dateFin = credit.dateFin ? new Date(credit.dateFin) : null;
        if (dateFin && dateFin < monthStart) continue;

        if (credit.dureeMois) {
          const endByDuration = new Date(start.getFullYear(), start.getMonth() + +credit.dureeMois, start.getDate());
          if (endByDuration < monthStart) continue;
        }

        total += +(credit.mensualite ?? 0);
        count++;
      }

      const suffix = y !== today.getFullYear() ? ` ${y}` : '';
      months.push({ label: this.monthNames[m] + suffix, total, barH: 0, count });
    }

    const maxTotal = Math.max(...months.map(m => m.total), 1);
    months.forEach(m => m.barH = Math.round((m.total / maxTotal) * 100));
    this.forecast = months;
  }

  private buildAlerts(credits: any[]) {
    const today  = new Date();
    const alerts: CreditAlert[] = [];

    for (const credit of credits) {
      if (credit.statut !== 'en_cours' && credit.statut !== 'en_retard') continue;
      if (!credit.dateDebut) continue;

      const start      = new Date(credit.dateDebut);
      const paymentDay = start.getDate();

      let nextPayment = new Date(today.getFullYear(), today.getMonth(), paymentDay);
      if (nextPayment < today) {
        nextPayment = new Date(today.getFullYear(), today.getMonth() + 1, paymentDay);
      }

      const daysUntil = Math.round((nextPayment.getTime() - today.getTime()) / 86_400_000);

      if (daysUntil <= 7) {
        alerts.push({ credit, daysUntilPayment: daysUntil, paymentDay });
      }
    }

    this.alerts = alerts.sort((a, b) => a.daysUntilPayment - b.daysUntilPayment);
  }

  private buildSupplierReport(credits: any[], achats: any[], fournisseurs: any[]) {
    // Build voitureId → fournisseurId map from purchases
    const voitureFournisseurMap: Record<number, number> = {};
    for (const achat of achats) {
      const vid = achat.voitureId ?? achat.voiture?.id;
      const fid = achat.fournisseurId ?? achat.fournisseur?.id;
      if (vid && fid) voitureFournisseurMap[+vid] = +fid;
    }

    const fournisseurMap: Record<number, string> = {};
    for (const f of fournisseurs) {
      fournisseurMap[f.id] = f.raisonSociale || f.nom || `#${f.id}`;
    }

    const groups: Record<string, { supplierId: number | null; supplierName: string; creditRows: CreditRow[] }> = {};

    for (const credit of credits) {
      if (credit.statut === 'termine') continue;

      const vid  = credit.voitureId;
      const fid  = vid ? (voitureFournisseurMap[+vid] ?? null) : null;
      const key  = fid !== null ? String(fid) : 'unknown';
      const name = fid !== null ? (fournisseurMap[fid] ?? `Supplier #${fid}`) : 'No Supplier Linked';

      if (!groups[key]) groups[key] = { supplierId: fid, supplierName: name, creditRows: [] };

      groups[key].creditRows.push({
        raw:           credit,
        voitureLabel:  credit.voiture || `Car #${vid}`,
        remaining:     this.computeRemaining(credit),
      });
    }

    this.supplierDebts = Object.values(groups).map(g => {
      const totalDebt = g.creditRows.reduce((s, r) => s + Math.max(0, +(r.raw.montantTotal ?? 0) - +(r.raw.apport ?? 0)), 0);
      const remaining = g.creditRows.reduce((s, r) => s + r.remaining, 0);
      const paid      = totalDebt - remaining;
      const paidPct   = totalDebt > 0 ? Math.round((paid / totalDebt) * 100) : 0;
      return { ...g, totalDebt, remaining, paid, paidPct };
    }).sort((a, b) => b.remaining - a.remaining);
  }

  get forecastTotal(): number {
    return this.forecast.reduce((s, m) => s + m.total, 0);
  }

  fmt(n: number): string {
    if (Math.abs(n) >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
    if (Math.abs(n) >= 1_000)     return (n / 1_000).toFixed(0) + 'k';
    return n.toFixed(0);
  }

  daysLabel(d: number): string {
    if (d === 0) return 'Today';
    if (d === 1) return 'Tomorrow';
    return `In ${d} days`;
  }
}
