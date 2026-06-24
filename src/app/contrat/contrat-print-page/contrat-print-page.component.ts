import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { CrudService } from '../../services/crud.service';
import { PrintContratComponent } from '../print-contrat/print-contrat.component';

@Component({
  selector: 'app-contrat-print-page',
  standalone: true,
  imports: [CommonModule, PrintContratComponent],
  template: `
    <div *ngIf="loading" style="display:flex;align-items:center;justify-content:center;height:100vh;font-size:1rem;color:#6b7280;">
      Chargement…
    </div>
    <div *ngIf="error && !loading" style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;gap:12px;">
      <p style="color:#dc2626;">{{ error }}</p>
      <button (click)="load()" style="padding:8px 16px;border-radius:6px;border:1px solid #d1d5db;cursor:pointer;">Réessayer</button>
    </div>
    <app-print-contrat
      *ngIf="!loading && !error && adapted"
      [contractData]="adapted"
      (closed)="back()">
    </app-print-contrat>
  `,
})
export class ContratPrintPageComponent implements OnInit {
  contratId!: number;
  loading = true;
  error   = '';
  adapted: any = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private crud: CrudService,
  ) {}

  ngOnInit() {
    this.contratId = +this.route.snapshot.paramMap.get('id')!;
    this.load();
  }

  load() {
    this.loading = true; this.error = '';
    this.crud.getById('contrat', `${this.contratId}/full`).subscribe({
      next:  (data: any) => { this.adapted = this.adapt(data); this.loading = false; },
      error: ()          => { this.error = 'Erreur de chargement.'; this.loading = false; },
    });
  }

  back() {
    this.router.navigate(['/contrat', this.contratId]);
  }

  private adapt(data: any): any {
    const c   = data.contrat;
    const res = c?.reservation;
    const cli = res?.client;
    const voit = res?.voiture;
    const d2   = c?.deuxiemeChauffeur;
    const del  = data.vehicleDelivery;
    const ret  = data.vehicleReturnInspection;

    return {
      /* ── identifiers ── */
      numeroContrat: c?.numero,
      id:            c?.id,

      /* ── dates ── */
      dateDebut:  res?.dateDebut,
      dateFin:    res?.dateFin,
      faitA:      c?.faitA,
      signedAt:   c?.signedAt,

      /* ── financial ── */
      montantTotal:      res?.total,
      montantPaye:       res?.montantPaye,
      prixParJour:       res?.prixParJour ?? c?.prixParJourSnapshot,
      nbJoursFactures:   c?.nbJoursFactures,
      remise:            c?.remise,
      franchise:         c?.franchise,
      hasCaution:        c?.hasCaution,
      cautionMontant:    c?.cautionMontant,

      /* ── locations ── */
      lieuLivraison: res?.lieuLivraison,
      lieuRetour:    res?.lieuRetour,

      /* ── client (mapped to field names PrintContratComponent uses) ── */
      client: cli ? {
        nom:               cli.nom,
        prenom:            '',
        dateNaissance:     cli.dateNaissance,
        lieuNaissance:     cli.lieuNaissance,
        nationalite:       cli.nationalite,
        adresse:           cli.adresseMaroc,
        adresseEtranger:   cli.adresseEtranger,
        telephone:         cli.telephone,
        telephoneEtranger: cli.telephoneEtranger,
        cin:               cli.cin,
        permisConduire:    cli.permisConduite,
        permisDelivreLe:   cli.permisDelivreLe,
        permisDelivreA:    cli.permisDelivreA,
        passeport:         cli.passeport,
        passeportDelivreLe: cli.passeportDelivreLe,
        passeportDelivreA:  cli.passeportDelivreA,
      } : {},

      /* ── 2nd driver ── */
      deuxiemeChauffeur: d2 ? {
        nom:            d2.nom,
        dateNaissance:  d2.dateNaissance,
        nationalite:    d2.nationalite,
        adresse:        d2.adresseMaroc,
        telephone:      d2.telephone,
        cin:            d2.cin,
        permisConduire: d2.permisConduite,
        permisDelivreLe: d2.permisDelivreLe,
        permisDelivreA:  d2.permisDelivreA,
        passeport:       d2.passeport,
        passeportDelivreLe: d2.passeportDelivreLe,
        passeportDelivreA:  d2.passeportDelivreA,
      } : null,

      /* ── voiture ── */
      voiture: voit ? {
        marque:            voit.marque,
        modele:            voit.modele,
        immatriculation:   voit.immatriculation,
        kilometrageActuel: del?.mileageOut ?? voit.kilometrageActuel,
        prixJour:          res?.prixParJour ?? c?.prixParJourSnapshot ?? voit.prixJour,
      } : {},

      /* ── delivery & return (for accessories + km + signatures) ── */
      vehicleDelivery:         del ?? null,
      vehicleReturnInspection: ret ?? null,
    };
  }
}
