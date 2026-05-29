import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { CrudService } from '../services/crud.service';
import { TranslationService } from '../services/translation.service';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

interface MonthBar { label: string; revenue: number; expenses: number; revenueH: number; expensesH: number; }

interface DocAlert {
  carId: number;
  carLabel: string;
  immatriculation: string;
  docType: 'assurance' | 'vignette' | 'visite';
  date: Date;
  daysOverOrLeft: number;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
  loading = true;

  // KPI
  totalExpenses = 0;
  totalRevenue = 0;
  occupancyRate = 0;
  activeBookings = 0;
  totalCars = 0;
  totalClients = 0;

  // Fleet
  availableCars = 0;
  bookedCars = 0;
  maintenanceCars = 0;

  // Payment distribution
  paidCount = 0;
  unpaidCount = 0;
  partialCount = 0;

  // Charts
  monthBars: MonthBar[] = [];
  bookingMonthBars: { label: string; count: number; h: number }[] = [];

  // Recent bookings
  recentContracts: any[] = [];
  recentReservations: any[] = [];

  expiredAlerts: DocAlert[] = [];
  dueThisMonthAlerts: DocAlert[] = [];

  carsInRepair: { car: any; repair: any }[] = [];

  private allClients: any[] = [];
  private allVoitures: any[] = [];

  private cachedPayments: any[] = [];
  private cachedExpenses: any[] = [];
  private cachedReservations: any[] = [];

  dir = 'ltr';

  private monthNames: Record<string, string[]> = {
    en: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],
    fr: ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'],
    ar: ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'],
  };

  constructor(
    private crud: CrudService,
    private ts: TranslationService
  ) {}

  ngOnInit() {
    this.ts.direction$.subscribe(d => this.dir = d);
    this.ts.currentLang$.subscribe(() => {
      if (this.cachedPayments.length || this.cachedExpenses.length || this.cachedReservations.length) {
        this.monthBars = this.buildMonthBars(this.cachedReservations, this.cachedExpenses);
        this.bookingMonthBars = this.buildBookingBars(this.cachedReservations);
      }
    });
    this.loadAll();
  }

  loadAll() {
    this.loading = true;
    const safe = (obs: any) => obs.pipe(catchError(() => of([])));

    forkJoin({
      voitures:     safe(this.crud.getAll('voiture', { limit: 1000 })),
      clients:      safe(this.crud.getAll('client')),
      reservations: safe(this.crud.getAll('reservation')),
      paiements:    safe(this.crud.getAll('paiement')),
      depenses:     safe(this.crud.getAll('depense')),
      contrats:     safe(this.crud.getAll('contrat')),
      reparations:  safe(this.crud.getAll('reparation')),
    }).subscribe({
      next: ({ voitures, clients, reservations, paiements, depenses, contrats, reparations }) => {
        const cars = this.toArray(voitures);
        const clientList = this.toArray(clients);
        const resList = this.toArray(reservations);
        const payments = this.toArray(paiements);
        const expenses = this.toArray(depenses);
        const contracts = this.toArray(contrats);

        // KPI
        this.totalCars = cars.length;
        this.totalClients = clientList.length;
        this.availableCars = cars.filter((c: any) => c.voitureStatus === 'available' || c.voitureStatus === 'disponible').length;
        this.bookedCars = cars.filter((c: any) => c.voitureStatus === 'rented' || c.voitureStatus === 'louee').length;
        this.maintenanceCars = cars.filter((c: any) => c.voitureStatus === 'maintenance').length;
        this.occupancyRate = this.totalCars > 0 ? Math.round((this.bookedCars / this.totalCars) * 100) : 0;
        this.buildDocAlerts(cars);
        this.buildCarsInRepair(cars, this.toArray(reparations));

        const today = new Date();
        this.activeBookings = resList.filter((r: any) => {
          const start = new Date(r.dateDebut);
          const end = new Date(r.dateFin);
          return start <= today && end >= today;
        }).length;

        const revenueStatuses = ['confirmed', 'confirmee', 'active', 'en_cours', 'encours', 'completed', 'terminee', 'done', 'termine'];
        this.totalRevenue = resList
          .filter((r: any) => revenueStatuses.includes((r.reservationStatus || r.statut || '').toLowerCase()))
          .reduce((s: number, r: any) => s + (parseFloat(r.total || r.montant || 0)), 0);

        this.totalExpenses = expenses
          .reduce((s: number, d: any) => s + (parseFloat(d.montant) || 0), 0);

        // Payment distribution
        this.paidCount    = payments.filter((p: any) => p.statut === 'paye').length;
        this.unpaidCount  = payments.filter((p: any) => p.statut === 'non_paye' || p.statut === 'impaye').length;
        this.partialCount = payments.filter((p: any) => p.statut === 'partiel').length;

        // Cache for language-change rebuilds
        this.cachedPayments = payments;
        this.cachedExpenses = expenses;
        this.cachedReservations = resList;

        // 6-month bars
        this.monthBars = this.buildMonthBars(resList, expenses);
        this.bookingMonthBars = this.buildBookingBars(resList);

        // Lookup maps for reservations table
        this.allClients = clientList;
        this.allVoitures = cars;

        // Recent contracts (last 5)
        this.recentContracts = contracts
          .sort((a: any, b: any) => new Date(b.dateDebut || b.createdAt || 0).getTime() - new Date(a.dateDebut || a.createdAt || 0).getTime())
          .slice(0, 5);

        // Last 10 reservations
        this.recentReservations = [...resList]
          .sort((a: any, b: any) => new Date(b.dateDebut || b.createdAt || 0).getTime() - new Date(a.dateDebut || a.createdAt || 0).getTime())
          .slice(0, 10);

        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  private toArray(r: any): any[] {
    return Array.isArray(r) ? r : (r?.data ?? r?.['hydra:member'] ?? []);
  }

  private buildMonthBars(reservations: any[], expenses: any[]): MonthBar[] {
    const lang = this.ts.getCurrentLanguage();
    const labels = this.monthNames[lang] || this.monthNames['en'];
    const today = new Date();
    const bars: MonthBar[] = [];
    const revenueStatuses = ['confirmed', 'confirmee', 'active', 'en_cours', 'encours', 'completed', 'terminee', 'done', 'termine'];

    for (let i = 11; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const y = d.getFullYear();
      const m = d.getMonth();

      const rev = reservations
        .filter((r: any) => {
          const rd = new Date(r.dateDebut || r.createdAt || 0);
          return rd.getFullYear() === y && rd.getMonth() === m
            && revenueStatuses.includes((r.reservationStatus || r.statut || '').toLowerCase());
        })
        .reduce((s: number, r: any) => s + (parseFloat(r.total || r.montant || 0)), 0);

      const exp = expenses
        .filter((e: any) => {
          const ed = new Date(e.dateDepense || e.date || e.createdAt || 0);
          return ed.getFullYear() === y && ed.getMonth() === m;
        })
        .reduce((s: number, e: any) => s + (parseFloat(e.montant) || 0), 0);

      bars.push({ label: labels[m], revenue: rev, expenses: exp, revenueH: 0, expensesH: 0 });
    }

    const maxVal = Math.max(...bars.map(b => Math.max(b.revenue, b.expenses)), 1);
    bars.forEach(b => {
      b.revenueH  = Math.round((b.revenue  / maxVal) * 100);
      b.expensesH = Math.round((b.expenses / maxVal) * 100);
    });

    return bars;
  }

  private buildBookingBars(reservations: any[]) {
    const lang = this.ts.getCurrentLanguage();
    const labels = this.monthNames[lang] || this.monthNames['en'];
    const today = new Date();
    const bars: { label: string; count: number; h: number }[] = [];

    for (let i = 11; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const y = d.getFullYear();
      const m = d.getMonth();

      const count = reservations.filter((r: any) => {
        const rd = new Date(r.dateDebut || r.createdAt || 0);
        return rd.getFullYear() === y && rd.getMonth() === m;
      }).length;

      bars.push({ label: labels[m], count, h: 0 });
    }

    const maxCount = Math.max(...bars.map(b => b.count), 1);
    bars.forEach(b => b.h = Math.round((b.count / maxCount) * 100));

    return bars;
  }

  get paymentTotal() { return Math.max(this.paidCount + this.unpaidCount + this.partialCount, 1); }
  get paidPct()    { return Math.round((this.paidCount    / this.paymentTotal) * 100); }
  get unpaidPct()  { return Math.round((this.unpaidCount  / this.paymentTotal) * 100); }
  get partialPct() { return Math.round((this.partialCount / this.paymentTotal) * 100); }

  clientName(r: any): string {
    const id = r.clientId || r.client?.id;
    const c = this.allClients.find((x: any) => x.id === id);
    return c ? `${c.nom} ${c.prenom || ''}`.trim() : (r.client?.nom || `#${id || '?'}`);
  }

  voitureLabel(r: any): string {
    const id = r.voitureId || r.voiture?.id;
    const v = this.allVoitures.find((x: any) => x.id === id);
    return v ? `${v.marque} ${v.modele}` : (r.voiture?.marque || `#${id || '?'}`);
  }

  reservationStatus(r: any): string {
    const today = new Date();
    const start = new Date(r.dateDebut);
    const end = new Date(r.dateFin);
    if (end < today) return 'done';
    if (start <= today && end >= today) return 'active';
    return 'upcoming';
  }

  private buildDocAlerts(cars: any[]): void {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const thisYear = today.getFullYear();
    const thisMonth = today.getMonth();

    const docFields: { field: string; type: DocAlert['docType'] }[] = [
      { field: 'dateExpirationAssurance', type: 'assurance' },
      { field: 'dateExpirationVignette',  type: 'vignette' },
      { field: 'dateExpirationVisite',    type: 'visite' },
    ];

    const expired: DocAlert[] = [];
    const dueThisMonth: DocAlert[] = [];

    for (const car of cars) {
      const label = `${car.marque || ''} ${car.modele || ''}`.trim();
      for (const { field, type } of docFields) {
        if (!car[field]) continue;
        const d = new Date(car[field]);
        if (isNaN(d.getTime())) continue;
        d.setHours(0, 0, 0, 0);
        const days = Math.round((d.getTime() - today.getTime()) / 86400000);
        const alert: DocAlert = { carId: car.id, carLabel: label, immatriculation: car.immatriculation || '', docType: type, date: d, daysOverOrLeft: days };
        if (days < 0) {
          expired.push(alert);
        } else if (d.getFullYear() === thisYear && d.getMonth() === thisMonth) {
          dueThisMonth.push(alert);
        }
      }
    }

    this.expiredAlerts = expired.sort((a, b) => a.daysOverOrLeft - b.daysOverOrLeft);
    this.dueThisMonthAlerts = dueThisMonth.sort((a, b) => a.daysOverOrLeft - b.daysOverOrLeft);
  }

  private buildCarsInRepair(cars: any[], reparations: any[]): void {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const active = reparations.filter(r => {
      if (!r.dateFin) return true;
      const fin = new Date(r.dateFin);
      fin.setHours(23, 59, 59, 999);
      return fin >= today;
    });
    this.carsInRepair = active.map(r => {
      const carId = r.voitureId ?? r.voiture?.id;
      const car = cars.find(c => c.id === carId) ?? r.voiture ?? null;
      return { car, repair: r };
    }).filter(x => x.car);
  }

  docTypeLabel(type: string): string {
    const map: Record<string, string> = { assurance: 'insuranceDoc', vignette: 'vignetteDoc', visite: 'technicalDoc' };
    return this.t(map[type] || type);
  }

  t(key: string) { return this.ts.translate(key); }
}
