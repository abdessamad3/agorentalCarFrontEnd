import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { ContratService } from '../../services/contrat.service';
import { CrudService } from '../../services/crud.service';
import { ToastService } from '../../services/toast.service';
import { TranslationService } from '../../services/translation.service';
import { AuthService } from '../../services/auth.service';
import { SignaturePadComponent } from '../../shared/signature-pad/signature-pad.component';
import { FuelGaugeComponent } from '../../shared/fuel-gauge/fuel-gauge.component';
import { DamageDiagramComponent, Damage } from '../../shared/damage-diagram/damage-diagram.component';

@Component({
  selector: 'app-contrat-form',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterModule,
    SignaturePadComponent, FuelGaugeComponent, DamageDiagramComponent
  ],
  templateUrl: './contrat-form.component.html',
  styleUrls: ['./contrat-form.component.css']
})
export class ContratFormComponent implements OnInit {
  dir = 'ltr';
  loading = true;
  saving = false;
  error = '';
  isEditing = false;
  contratId: number | null = null;
  reservationId: number | null = null;
  deliveryId: number | null = null;

  // Contract fields
  numero = '';
  lieuLivraison = '';
  lieuRetour = '';

  // Vehicle (readonly from reservation)
  vehiculeLabel = '';
  reservationData: any = null;

  // Mileage & fuel
  kilometrageDepart: number | null = null;
  kilometrageRetour: number | null = null;
  niveauCarburantDepart = 'vide';
  niveauCarburantRetour = 'vide';

  // Client (pre-filled, editable)
  clientNom = '';
  clientDateNaissance = '';
  clientNationalite = '';
  clientAdresseMaroc = '';
  clientAdresseEtranger = '';
  clientTelephone = '';
  clientCin = '';
  clientPasseport = '';
  clientPermis = '';

  // Second driver
  hasSecondDriver = false;
  secondNom = '';
  secondCin = '';
  secondPermis = '';
  secondDateNaissance = '';

  // Financial
  reservationTotal = 0;
  reservationMontantPaye = 0;
  cautionMontant: number | null = null;
  franchise: number | null = null;

  // Equipment
  equipements: string[] = [];
  readonly equipementItems = [
    { key: 'extincteur',     label: 'Extincteur' },
    { key: 'roue_secours',   label: 'Roue de secours' },
    { key: 'cric',           label: 'Cric' },
    { key: 'gilet_securite', label: 'Gilet de sécurité' },
    { key: 'triangle',       label: 'Triangle de signalisation' },
    { key: 'siege_enfant',   label: 'Siège enfant' },
    { key: 'kit_nettoyage',  label: 'Kit de nettoyage' },
  ];

  // Damages
  dommages: Damage[] = [];

  // Signatures
  signatureClient: string | null = null;
  signatureDeuxiemeChauffeur: string | null = null;
  signatureSociete: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private contratService: ContratService,
    private crud: CrudService,
    private toast: ToastService,
    private ts: TranslationService,
    private auth: AuthService,
  ) {}

  ngOnInit() {
    this.ts.direction$.subscribe(d => this.dir = d);

    const idParam = this.route.snapshot.paramMap.get('id');
    const resParam = this.route.snapshot.queryParamMap.get('reservationId');

    if (idParam) {
      this.isEditing = true;
      this.contratId = +idParam;
      this.loadContrat(this.contratId);
    } else if (resParam) {
      this.reservationId = +resParam;
      this.loadReservation(this.reservationId);
      this.auth.getMySignature().subscribe({
        next: sig => { if (sig && !this.signatureSociete) this.signatureSociete = sig; },
        error: () => {},
      });
    } else {
      this.loading = false;
      this.auth.getMySignature().subscribe({
        next: sig => { if (sig && !this.signatureSociete) this.signatureSociete = sig; },
        error: () => {},
      });
    }
  }

  private loadContrat(id: number) {
    this.loading = true;
    this.contratService.getContrat(id).subscribe({
      next: (c: any) => {
        this.numero               = c.numero ?? '';
        this.lieuLivraison        = c.reservation?.lieuLivraison ?? '';
        this.lieuRetour           = c.reservation?.lieuRetour ?? '';
        this.cautionMontant       = c.cautionMontant ?? null;
        this.franchise            = c.franchise ?? null;

        const res = c.reservation;
        if (res) {
          this.reservationId          = res.id;
          this.reservationTotal       = parseFloat(res.total ?? 0);
          this.reservationMontantPaye = parseFloat(res.montantPaye ?? 0);
          this.fillVehicle(res.voiture);
          this.fillClient(res.client);
        }

        if (c.deuxiemeChauffeur) {
          this.hasSecondDriver     = true;
          this.secondNom           = c.deuxiemeChauffeur.nom ?? '';
          this.secondCin           = c.deuxiemeChauffeur.cin ?? '';
          this.secondPermis        = c.deuxiemeChauffeur.permisConduite ?? '';
          this.secondDateNaissance = c.deuxiemeChauffeur.dateNaissance
            ? c.deuxiemeChauffeur.dateNaissance.substring(0, 10)
            : '';
        }

        // Load existing VehicleDelivery so the form pre-fills delivery fields
        this.crud.getById('vehicle-delivery/contrat', id).subscribe({
          next: (d: any) => {
            if (!d) { this.loading = false; return; }
            this.deliveryId              = d.id;
            this.kilometrageDepart       = d.mileageOut ?? null;
            this.niveauCarburantDepart   = d.fuelLevelOut ?? 'vide';
            this.signatureClient         = d.signatureClientDepart ?? null;
            this.signatureDeuxiemeChauffeur = d.signatureDeuxiemeChauffeur ?? null;
            this.signatureSociete        = d.signatureSocieteDepart ?? null;
            this.dommages                = (d.damages ?? []) as Damage[];
            const equip: string[] = [];
            if (d.hasExtincteur)  equip.push('extincteur');
            if (d.hasRoueSecours) equip.push('roue_secours');
            if (d.hasCric)        equip.push('cric');
            if (d.hasGilet)       equip.push('gilet_securite');
            if (d.hasSiegeBebe)   equip.push('siege_enfant');
            if (d.hasLavage)      equip.push('kit_nettoyage');
            this.equipements = equip;
            this.loading = false;
          },
          error: () => { this.loading = false; },
        });
      },
      error: () => { this.error = 'Erreur de chargement'; this.loading = false; }
    });
  }

  private loadReservation(id: number) {
    this.loading = true;
    this.crud.getById('reservation', id).subscribe({
      next: (r: any) => {
        this.reservationData       = r;
        this.reservationId         = r.id;
        this.reservationTotal      = parseFloat(r.total ?? 0);
        this.reservationMontantPaye = parseFloat(r.montantPaye ?? 0);
        this.fillVehicle(r.voiture);
        this.fillClient(r.client);
        this.loading = false;
      },
      error: () => { this.error = 'Réservation introuvable'; this.loading = false; }
    });
  }

  private fillVehicle(v: any) {
    if (!v) return;
    const marque = v.marque ?? '';
    const modele = v.modele ?? '';
    const immat  = v.immatriculation ? ` (${v.immatriculation})` : '';
    this.vehiculeLabel = `${marque} ${modele}${immat}`.trim();
  }

  private fillClient(c: any) {
    if (!c) return;
    this.clientNom            = c.nom ?? '';
    this.clientNationalite    = c.nationalite ?? '';
    this.clientAdresseMaroc   = c.adresseMaroc ?? '';
    this.clientAdresseEtranger = c.adresseEtranger ?? '';
    this.clientTelephone      = c.telephone ? String(c.telephone) : '';
    this.clientCin            = c.cin ?? '';
    this.clientPasseport      = c.passeport ?? '';
    this.clientPermis         = c.permisConduite ?? '';
    this.clientDateNaissance  = c.dateNaissance
      ? c.dateNaissance.substring(0, 10)
      : '';
  }

  toggleEquipement(key: string) {
    const idx = this.equipements.indexOf(key);
    if (idx >= 0) {
      this.equipements = this.equipements.filter(k => k !== key);
    } else {
      this.equipements = [...this.equipements, key];
    }
  }

  get montantRestant(): number {
    return Math.max(0, this.reservationTotal - this.reservationMontantPaye);
  }

  save() {
    if (!this.reservationId) {
      this.toast.show('Réservation manquante', 'error');
      return;
    }
    this.saving = true;

    const contratPayload: any = {
      reservationId:  this.reservationId,
      cautionMontant: this.cautionMontant,
      franchise:      this.franchise,
      deuxiemeChauffeur: this.hasSecondDriver && this.secondNom.trim()
        ? {
            nom:           this.secondNom,
            cin:           this.secondCin || null,
            permisConduite: this.secondPermis || null,
            dateNaissance: this.secondDateNaissance || null,
          }
        : null,
    };

    const contratReq = this.isEditing && this.contratId
      ? this.contratService.updateContrat(this.contratId, contratPayload)
      : this.contratService.createContrat(contratPayload);

    contratReq.subscribe({
      next: (res: any) => {
        const savedId = this.contratId ?? res?.id ?? null;
        this.saveDelivery(() => {
          this.toast.show(this.isEditing ? 'Contrat mis à jour' : 'Contrat créé', 'success');
          this.saving = false;
          if (!this.isEditing && savedId) {
            this.router.navigate(['/contrat', savedId, 'edit']);
          } else {
            this.router.navigate(['/contrat']);
          }
        });
      },
      error: (err: any) => {
        this.toast.show(err?.error?.message || 'Erreur lors de l\'enregistrement', 'error');
        this.saving = false;
      }
    });
  }

  private saveDelivery(callback: () => void): void {
    const deliveryPayload = {
      reservationId:              this.reservationId,
      mileageOut:                 this.kilometrageDepart,
      fuelLevelOut:               this.niveauCarburantDepart,
      hasExtincteur:              this.equipements.includes('extincteur'),
      hasLavage:                  this.equipements.includes('kit_nettoyage'),
      hasPlaqueDepannage:         false,
      hasCric:                    this.equipements.includes('cric'),
      hasGilet:                   this.equipements.includes('gilet_securite'),
      hasRoueSecours:             this.equipements.includes('roue_secours'),
      hasSiegeBebe:               this.equipements.includes('siege_enfant'),
      damages:                    this.dommages,
      signatureClientDepart:      this.signatureClient,
      signatureDeuxiemeChauffeur: this.signatureDeuxiemeChauffeur,
      signatureSocieteDepart:     this.signatureSociete,
    };

    const req = this.deliveryId
      ? this.crud.rawPatch('vehicle-delivery', this.deliveryId, deliveryPayload)
      : this.crud.rawPost('vehicle-delivery', deliveryPayload);

    req.subscribe({
      next: (d: any) => {
        if (!this.deliveryId && d?.id) this.deliveryId = d.id;
        callback();
      },
      error: () => callback(), // Don't block navigation if delivery save fails
    });
  }

  downloadPdf() {
    if (!this.contratId) return;
    this.contratService.downloadPdf(this.contratId).subscribe({
      next: (blob: Blob) => {
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
        setTimeout(() => URL.revokeObjectURL(url), 10000);
      },
      error: () => this.toast.show('Erreur de génération PDF', 'error')
    });
  }
}
