import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { CrudService } from '../../services/crud.service';
import { ContratService } from '../../services/contrat.service';
import { ToastService } from '../../services/toast.service';
import { ActivityLogService } from '../../services/activity-log.service';
import { FuelGaugeComponent } from '../../shared/fuel-gauge/fuel-gauge.component';
import { ContratTimelineComponent } from '../contrat-timeline/contrat-timeline.component';
import { VehicleDeliveryFormComponent } from '../vehicle-delivery-form/vehicle-delivery-form.component';
import { VehicleReturnFormComponent } from '../vehicle-return-form/vehicle-return-form.component';
import { PrintContratComponent } from '../print-contrat/print-contrat.component';
import { StatusPipe } from '../../shared/pipes/status.pipe';

@Component({
  selector: 'app-contrat-detail',
  standalone: true,
  imports: [
    CommonModule, RouterModule,
    FuelGaugeComponent,
    ContratTimelineComponent, VehicleDeliveryFormComponent, VehicleReturnFormComponent,
    PrintContratComponent, StatusPipe,
  ],
  templateUrl: './contrat-detail.component.html',
  styleUrls: ['./contrat-detail.component.css'],
})
export class ContratDetailComponent implements OnInit {
  contratId!: number;
  pageData: any = null;
  loading = true;
  error   = '';
  printContractData: any = null;
  autoDownloadPdf = false;

  activeTab: 'contrat' | 'delivery' | 'return' | 'finance' | 'documents' = 'contrat';

  showDeliveryModal = false;
  showReturnModal   = false;

  readonly tabs = [
    { key: 'contrat',   label: 'Contrat' },
    { key: 'delivery',  label: 'Livraison' },
    { key: 'return',    label: 'Retour' },
    { key: 'finance',   label: 'Finance' },
    { key: 'documents', label: 'Documents' },
  ] as const;

  readonly accessoryLabels: { key: string; label: string }[] = [
    { key: 'hasExtincteur',      label: 'Extincteur' },
    { key: 'hasLavage',          label: 'Lavage' },
    { key: 'hasPlaqueDepannage', label: 'Plaque dépannage' },
    { key: 'hasCric',            label: 'Cric' },
    { key: 'hasGilet',           label: 'Gilet' },
    { key: 'hasRoueSecours',     label: 'Roue de secours' },
    { key: 'hasSiegeBebe',       label: 'Siège bébé' },
  ];

  readonly conditionLabels: Record<string, string> = {
    clean:        'Propre / Sans dommage',
    minor_damage: 'Dommages mineurs',
    major_damage: 'Dommages importants',
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private crud: CrudService,
    private contratSvc: ContratService,
    private toast: ToastService,
    private activityLog: ActivityLogService,
  ) {}

  ngOnInit() {
    this.contratId = +this.route.snapshot.paramMap.get('id')!;
    this.activityLog.logView('Contrat', this.contratId);
    this.load();
  }

  load() {
    this.loading = true; this.error = '';
    this.crud.getById('contrat', `${this.contratId}/full`).subscribe({
      next:  (d: any) => { this.pageData = d; this.loading = false; },
      error: ()       => { this.error = 'Erreur de chargement du contrat.'; this.loading = false; },
    });
  }

  get contrat()          { return this.pageData?.contrat; }
  get reservation()      { return this.pageData?.contrat?.reservation; }
  get delivery()         { return this.pageData?.vehicleDelivery; }
  get returnInspection() { return this.pageData?.vehicleReturnInspection; }
  get timeline()         { return this.pageData?.timeline ?? []; }
  get paiements()        { return this.pageData?.paiements ?? []; }
  get status(): string   { return this.reservation?.reservationStatus ?? ''; }

  get totalPaid(): number {
    return this.paiements.reduce((s: number, p: any) => s + (+p.montant), 0);
  }

  get totalCharges(): number {
    return (+(this.returnInspection?.fuelCharge   ?? 0))
         + (+(this.returnInspection?.lateCharge   ?? 0))
         + (+(this.returnInspection?.damageCharge ?? 0));
  }

  get remaining(): number {
    return (+(this.reservation?.total ?? 0)) + this.totalCharges - this.totalPaid;
  }

  get pricePerDay(): number { return +(this.reservation?.prixParJour ?? this.contrat?.prixParJourSnapshot ?? 0); }

  get plannedDays(): number {
    if (!this.reservation?.dateDebut || !this.reservation?.dateFin) return 0;
    const ms = new Date(this.reservation.dateFin).getTime() - new Date(this.reservation.dateDebut).getTime();
    return Math.ceil(ms / 86_400_000);
  }

  openDeliveryModal() { this.showDeliveryModal = true; }
  openReturnModal()   { this.showReturnModal   = true; }

  onDeliverySaved()  { this.showDeliveryModal = false; this.load(); }
  onDeliveryClosed() { this.showDeliveryModal = false; }
  onReturnSaved()    { this.showReturnModal   = false; this.load(); }
  onReturnClosed()   { this.showReturnModal   = false; }

  onTimelineDeliveryClick() {
    this.activeTab = 'delivery';
  }

  onTimelineReturnClick() {
    this.activeTab = 'return';
  }

  downloadPdf() {
    this.autoDownloadPdf = true;
    this.printContractData = this.adaptFull(this.pageData);
  }

  onPrintClosed() { this.printContractData = null; this.autoDownloadPdf = false; }

  private adaptFull(data: any): any {
    const c    = data.contrat;
    const res  = c?.reservation;
    const cli  = res?.client;
    const voit = res?.voiture;
    const d2   = c?.deuxiemeChauffeur;
    const del  = data.vehicleDelivery;
    const ret  = data.vehicleReturnInspection;
    return {
      numeroContrat: c?.numero, id: c?.id,
      dateDebut: res?.dateDebut, dateFin: res?.dateFin,
      faitA: c?.faitA, signedAt: c?.signedAt,
      montantTotal: res?.total, montantPaye: res?.montantPaye,
      prixParJour: res?.prixParJour ?? c?.prixParJourSnapshot,
      nbJoursFactures: c?.nbJoursFactures, remise: c?.remise,
      franchise: c?.franchise, hasCaution: c?.hasCaution, cautionMontant: c?.cautionMontant,
      lieuLivraison: res?.lieuLivraison, lieuRetour: res?.lieuRetour,
      client: cli ? {
        nom: cli.nom, prenom: '',
        dateNaissance: cli.dateNaissance, lieuNaissance: cli.lieuNaissance,
        nationalite: cli.nationalite,
        adresseMaroc: cli.adresseMaroc, adresseEtranger: cli.adresseEtranger,
        telephone: cli.telephone, telephoneEtranger: cli.telephoneEtranger,
        cin: cli.cin,
        permisConduite: cli.permisConduite, permisDelivreLe: cli.permisDelivreLe, permisDelivreA: cli.permisDelivreA,
        passeport: cli.passeport, passeportDelivreLe: cli.passeportDelivreLe, passeportDelivreA: cli.passeportDelivreA,
      } : {},
      deuxiemeChauffeur: d2 ? {
        nom: d2.nom, dateNaissance: d2.dateNaissance, nationalite: d2.nationalite,
        adresseMaroc: d2.adresseMaroc, telephone: d2.telephone, cin: d2.cin,
        permisConduite: d2.permisConduite, permisDelivreLe: d2.permisDelivreLe, permisDelivreA: d2.permisDelivreA,
        passeport: d2.passeport, passeportDelivreLe: d2.passeportDelivreLe, passeportDelivreA: d2.passeportDelivreA,
      } : null,
      voiture: voit ? {
        marque: voit.marque, modele: voit.modele, immatriculation: voit.immatriculation,
        kilometrageActuel: del?.mileageOut ?? voit.kilometrageActuel,
        prixJour: res?.prixParJour ?? c?.prixParJourSnapshot ?? voit.prixJour,
      } : {},
      vehicleDelivery: del ?? null,
      vehicleReturnInspection: ret ?? null,
    };
  }

  back() { this.router.navigate(['/contrat']); }

  isSignatureUrl(val: string | null): boolean {
    return !!val && (val.startsWith('data:image') || val.startsWith('http'));
  }
}
