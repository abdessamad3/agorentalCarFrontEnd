import { Component, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, NavigationEnd, RouterModule } from '@angular/router';
import { TranslationService } from '../../services/translation.service';
import { CrudService } from '../../services/crud.service';
import { EventBusService } from '../../services/event-bus.service';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-top-header',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './top-header.component.html',
  styleUrls: ['./top-header.component.css']
})
export class TopHeaderComponent implements OnInit {
  @Output() menuToggle = new EventEmitter<void>();

  dir = 'ltr';
  currentLang = 'en';
  pageTitle = 'dashboard';
  netProfit = 0;
  pendingAmount = 0;

  private routeMap: Record<string, string> = {
    '/dashboard': 'dashboard',
    '/calendar': 'calendar',
    '/reservation/create': 'createBooking',
    '/reservation': 'reservations',
    '/client': 'clients',
    '/voiture': 'myCars',
    '/bureau': 'bureaus',
    '/paiement': 'paiements',
    '/paiement-client': 'clientPayments',
    '/contrat': 'contrats',
    '/reparation': 'reparations',
    '/vidange': 'vidanges',
    '/adblue': 'adblue',
    '/assurance': 'assurances',
    '/suivi-technique': 'suiviTechnique',
    '/vignette': 'vignettes',
    '/depense': 'depenses',
    '/credit': 'credits',
    '/infraction': 'infractions',
    '/accessoire': 'accessoires',
    '/utilisateur': 'utilisateurs',
  };

  constructor(
    private ts: TranslationService,
    public router: Router,
    private crud: CrudService,
    private bus: EventBusService
  ) {}

  ngOnInit() {
    this.ts.direction$.subscribe(d => this.dir = d);
    this.ts.currentLang$.subscribe(l => this.currentLang = l);

    this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe((e: any) => {
        const url = e.urlAfterRedirects;
        const key = Object.keys(this.routeMap).find(k => url === k || url.startsWith(k + '/'));
        this.pageTitle = key ? this.routeMap[key] : 'dashboard';
      });

    this.loadNetProfit();
    this.bus.paymentsChanged$.subscribe(() => this.loadNetProfit());
  }

  loadNetProfit() {
    const toArr = (r: any) => Array.isArray(r) ? r : (r?.data ?? []);

    this.crud.getAll('reservation').subscribe({
      next: (r: any) => {
        const revenueStatuses = ['confirmed', 'confirmee', 'active', 'en_cours', 'encours', 'completed', 'terminee', 'done', 'termine'];
        const reservations = toArr(r);
        const revenue = reservations
          .filter((res: any) => revenueStatuses.includes((res.reservationStatus || res.statut || '').toLowerCase()))
          .reduce((s: number, res: any) => s + (parseFloat(res.total || res.montant || 0)), 0);

        const cancelledStatuses = ['cancelled', 'annulee', 'annule'];
        this.pendingAmount = reservations
          .filter((res: any) => !cancelledStatuses.includes((res.reservationStatus || res.statut || '').toLowerCase()))
          .reduce((s: number, res: any) => {
            const total = parseFloat(res.total || res.montant || 0);
            const paid  = parseFloat(res.montantPaye || 0);
            return s + Math.max(0, total - paid);
          }, 0);

        this.crud.getAll('depense').subscribe({
          next: (d: any) => {
            const expenses = toArr(d)
              .reduce((s: number, dep: any) => s + (parseFloat(dep.montant) || 0), 0);
            this.netProfit = revenue - expenses;
          },
          error: () => { this.netProfit = revenue; }
        });
      },
      error: () => {}
    });
  }

  t(key: string) { return this.ts.translate(key); }
  changeLang(lang: string) { this.ts.setLanguage(lang); }
}
