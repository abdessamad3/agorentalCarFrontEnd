import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { CrudService } from '../../services/crud.service';
import { ContratService } from '../../services/contrat.service';
import { ToastService } from '../../services/toast.service';
import { FuelGaugeComponent } from '../../shared/fuel-gauge/fuel-gauge.component';
import { ContratTimelineComponent } from '../contrat-timeline/contrat-timeline.component';
import { VehicleDeliveryFormComponent } from '../vehicle-delivery-form/vehicle-delivery-form.component';
import { VehicleReturnFormComponent } from '../vehicle-return-form/vehicle-return-form.component';

@Component({
  selector: 'app-contrat-detail',
  standalone: true,
  imports: [
    CommonModule, RouterModule,
    FuelGaugeComponent,
    ContratTimelineComponent, VehicleDeliveryFormComponent, VehicleReturnFormComponent,
  ],
  templateUrl: './contrat-detail.component.html',
  styleUrls: ['./contrat-detail.component.css'],
})
export class ContratDetailComponent implements OnInit {
  contratId!: number;
  pageData: any = null;
  loading = true;
  error   = '';

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
  ) {}

  ngOnInit() {
    this.contratId = +this.route.snapshot.paramMap.get('id')!;
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

  get statusLabel(): string {
    const map: Record<string, string> = {
      confirmed: 'Confirmé', en_cours: 'En cours', terminee: 'Clôturé', annulee: 'Annulé',
    };
    return map[this.status] ?? this.status;
  }

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
    this.contratSvc.downloadPdf(this.contratId).subscribe({
      next: (blob: Blob) => {
        const url  = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href  = url;
        link.download = `contrat-${this.contrat?.numero || this.contratId}.pdf`;
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 5_000);
      },
      error: () => this.toast.show('Erreur de génération PDF', 'error'),
    });
  }

  back() { this.router.navigate(['/contrat']); }

  isSignatureUrl(val: string | null): boolean {
    return !!val && (val.startsWith('data:image') || val.startsWith('http'));
  }
}
