import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CrudService } from '../../services/crud.service';
import { reservationStatusClass } from '../../shared/utils/status.utils';
import { StatusPipe } from '../../shared/pipes/status.pipe';
import { ToastService } from '../../services/toast.service';
import { TranslationService } from '../../services/translation.service';
import { ContratService } from '../../services/contrat.service';
import { EventBusService } from '../../services/event-bus.service';
import { complianceSeverity } from '../../shared/utils/compliance.utils';
import { PrintContratComponent } from '../../contrat/print-contrat/print-contrat.component';
import { ClientDocumentsComponent } from '../../client/client-documents/client-documents.component';
import { VehicleMapComponent, VEHICLE_ZONES } from '../../shared/vehicle-map/vehicle-map.component';

@Component({
  selector: 'app-location-dossier',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, PrintContratComponent, ClientDocumentsComponent, VehicleMapComponent, StatusPipe],
  templateUrl: './location-dossier.component.html',
  styleUrls: ['./location-dossier.component.css']
})
export class LocationDossierComponent implements OnInit {
  reservationId!: number;
  dossier: any = null;
  loading = true;
  error = '';
  activeTab: 'reservation' | 'depart' | 'paiements' | 'retour' | 'documents' | 'validation' = 'reservation';
  printContractData: any = null;
  autoDownloadPdf = false;

  // ── Paiement form ────────────────────────────────────────────────────────
  newPaiement = { montant: 0, datePaiement: '', modePaiement: 'especes', note: '' };
  savingPaiement = false;

  // ── Départ form ──────────────────────────────────────────────────────────
  departForm: any = {};
  savingDepart = false;

  // ── Retour form ──────────────────────────────────────────────────────────
  retourForm: any = {};
  savingRetour = false;
  retourConfirmed = false;
  undoingCloture = false;

  // ── Final settlement — optional payment collected at the moment of return ──
  closingPaymentAmount: number | null = null;
  closingPaymentMode = 'especes';

  // collapsible sections in Tab 4
  showFrais        = false;
  showRemise       = false;
  showDommages     = false;
  showRetourNotes  = false;

  readonly CAR_ZONES = VEHICLE_ZONES;

  // ── Vehicle damage (departure read-only display) ─────────────────────────
  departureDamages: any[] = [];
  loadingDamages = false;

  get departureOpenDamages(): any[] {
    return this.departureDamages.filter(d => d.status === 'open');
  }

  get departureDamagedZones(): string[] {
    return this.departureOpenDamages.map(d => d.zone);
  }

  isDepartureDamaged(partId: string): boolean {
    return this.departureOpenDamages.some(d => d.zone === partId);
  }

  private loadCarDamages(): void {
    const carId = this.dossier?.reservation?.voiture?.id;
    if (!carId) return;
    this.loadingDamages = true;
    this.crud.getById('voiture', `${carId}/damages`).subscribe({
      next: (data: any) => {
        this.departureDamages = Array.isArray(data) ? data : (data?.damages ?? []);
        this.loadingDamages = false;
      },
      error: () => { this.departureDamages = []; this.loadingDamages = false; }
    });
  }

  // ── Confirm reservation ──────────────────────────────────────────────────
  confirming = false;

  get canConfirm(): boolean {
    return this.status === 'pending';
  }

  confirmReservation(): void {
    if (this.confirming) return;
    this.confirming = true;
    this.crud.update('reservation', this.reservationId, { reservationStatus: 'confirmee' }).subscribe({
      next: () => {
        this.toast.show(this.t('reservationConfirmed') || 'Réservation confirmée', 'success');
        this.confirming = false;
        this.load();
      },
      error: (err: any) => {
        this.toast.show(err?.error?.error ?? err?.error?.message ?? this.t('error'), 'error');
        this.confirming = false;
      }
    });
  }

  // ── Cancel reservation ───────────────────────────────────────────────────
  cancelling = false;
  showCancelModal = false;

  get canCancel(): boolean {
    return this.status === 'pending' || this.status === 'confirmed' || this.status === 'confirmee';
  }

  openCancelModal(): void  { this.showCancelModal = true; }
  closeCancelModal(): void { this.showCancelModal = false; }

  confirmCancelReservation(): void {
    this.showCancelModal = false;
    this.cancelling = true;
    this.crud.update('reservation', this.reservationId, { reservationStatus: 'annulee' }).subscribe({
      next: () => {
        this.toast.show(this.t('reservationCancelled'), 'info');
        this.cancelling = false;
        this.router.navigate(['/reservation']);
      },
      error: (err: any) => {
        this.toast.show(err?.error?.error ?? this.t('error'), 'error');
        this.cancelling = false;
      }
    });
  }

  // ── Driver edit ──────────────────────────────────────────────────────────
  editingDriver: 'first' | 'second' | null = null;
  driverForm: any = {};
  savingDriver = false;

  // ── Constants ────────────────────────────────────────────────────────────
  readonly FUEL_LEVELS = ['vide', 'quart', 'moitie', 'trois_quarts', 'plein'];
  get FUEL_LABELS(): Record<string, string> {
    return {
      vide: this.t('fuelEmpty'), quart: this.t('fuelQuarter'), moitie: this.t('fuelHalf'),
      trois_quarts: this.t('fuelThreeQuarters'), plein: this.t('fuelFull'),
    };
  }
  readonly FUEL_CHARGE_TABLE: Record<string, number> = {
    'vide_to_quart': 150,   'vide_to_moitie': 250,  'vide_to_trois_quarts': 350, 'vide_to_plein': 450,
    'quart_to_moitie': 100, 'quart_to_trois_quarts': 200, 'quart_to_plein': 300,
    'moitie_to_trois_quarts': 100, 'moitie_to_plein': 200,
    'trois_quarts_to_plein': 100,
  };

  constructor(
    private route: ActivatedRoute,
    public  router: Router,
    private crud: CrudService,
    private toast: ToastService,
    private ts: TranslationService,
    private contratSvc: ContratService,
    private bus: EventBusService,
  ) {}

  t(key: string) { return this.ts.translate(key); }

  private readonly VALID_TABS: ReadonlyArray<typeof this.activeTab> =
    ['reservation','depart','paiements','retour','documents','validation'];

  ngOnInit() {
    this.reservationId = Number(this.route.snapshot.paramMap.get('id'));
    const frag = this.route.snapshot.fragment as typeof this.activeTab | null;
    if (frag && this.VALID_TABS.includes(frag)) this.activeTab = frag;
    this.load();
  }

  load() {
    this.loading = true;
    this.error = '';
    this.crud.getById('location', `${this.reservationId}/full`).subscribe({
      next: (d: any) => {
        const status = (
          d?.reservation?.reservationStatus ||
          d?.reservation?.statut ||
          d?.reservationStatus ||
          d?.statut || ''
        ).toLowerCase();
        if (['annulee', 'cancelled', 'annule'].includes(status)) {
          this.router.navigate(['/reservation']);
          return;
        }
        this.dossier = d;
        this.syncForms();
        this.loading = false;
      },
      error: () => {
        this.error = this.t('cannotLoadDossier');
        this.loading = false;
      }
    });
  }

  private syncForms() {
    const today = new Date().toISOString().split('T')[0];
    const now   = new Date().toISOString().slice(0, 16);

    // ── Départ form ─────────────────────────────────────────────────────────
    const vd = this.dossier?.vehicleDelivery;
    const contrat = this.dossier?.contrat;
    const res = this.dossier?.reservation;
    if (vd) {
      this.departForm = {
        fuelLevelOut:       vd.fuelLevelOut ?? 'vide',
        mileageOut:         vd.mileageOut ?? res?.voiture?.kilometrageActuel ?? null,
        hasExtincteur:      vd.hasExtincteur ?? false,
        hasLavage:          vd.hasLavage ?? false,
        hasPlaqueDepannage: vd.hasPlaqueDepannage ?? false,
        hasCric:            vd.hasCric ?? false,
        hasGilet:           vd.hasGilet ?? false,
        hasRoueSecours:     vd.hasRoueSecours ?? false,
        hasSiegeBebe:       vd.hasSiegeBebe ?? false,
        hasTriangle:        vd.hasTriangle ?? false,
        equipementNotes:    vd.equipementNotes ?? '',
        deliveryNotes:      vd.deliveryNotes ?? '',
        hasCaution:         contrat?.hasCaution ?? false,
        cautionMontant:     contrat?.cautionMontant ?? 0,
        franchise:          contrat?.franchise ?? 0,
        nbJoursFactures:    contrat?.nbJoursFactures ?? null,
        lieuLivraison:      res?.lieuLivraison ?? '',
        lieuRetour:         res?.lieuRetour ?? '',
      };
    } else {
      this.departForm = {
        fuelLevelOut: 'vide',
        mileageOut:   res?.voiture?.kilometrageActuel ?? null,
        hasExtincteur: false, hasLavage: false, hasPlaqueDepannage: false,
        hasCric: false, hasGilet: false, hasRoueSecours: false,
        hasSiegeBebe: false, hasTriangle: false,
        equipementNotes: '', deliveryNotes: '',
        hasCaution: false, cautionMontant: 0, franchise: 0,
        nbJoursFactures: null,
        lieuLivraison: res?.lieuLivraison ?? '',
        lieuRetour:    res?.lieuRetour ?? '',
      };
    }

    // ── Retour form ─────────────────────────────────────────────────────────
    const vri = this.dossier?.vehicleReturnInspection;
    if (vri) {
      this.retourForm = {
        fuelLevelIn:     vri.fuelLevelIn ?? 'vide',
        kilometrage:     vri.kilometrage ?? null,
        inspectedAt:     vri.inspectedAt ? vri.inspectedAt.slice(0, 16) : now,
        condition:       vri.condition ?? 'clean',
        damagedParts:    vri.damagedParts ?? [],
        fuelCharge:      vri.fuelCharge ?? 0,
        lateCharge:      vri.lateCharge ?? 0,
        damageCharge:    vri.damageCharge ?? 0,
        equipmentCharge: vri.equipmentCharge ?? 0,
        remiseMontant:   vri.remiseMontant ?? 0,
        remiseMotif:     vri.remiseMotif ?? '',
        notes:           vri.notes ?? '',
      };
      this.retourConfirmed = true;
    } else {
      const sugFuel = this.computeSuggestedFuelCharge(
        vd?.fuelLevelOut ?? 'vide', 'vide'
      );
      this.retourForm = {
        fuelLevelIn:  vd?.fuelLevelOut ?? 'vide',
        kilometrage:  null,
        inspectedAt:  now,
        condition:    'clean',
        damagedParts: [],
        fuelCharge:      0,
        lateCharge:      0,
        damageCharge:    0,
        equipmentCharge: 0,
        remiseMontant:   0,
        remiseMotif:     '',
        notes:           '',
      };
      this.retourConfirmed = false;
    }

    this.newPaiement = { montant: 0, datePaiement: today, modePaiement: 'especes', note: '' };
    this.loadCarDamages();
  }

  // ── Live computations ────────────────────────────────────────────────────

  private computeSuggestedFuelCharge(departure: string, returnLevel: string): number {
    const levels = this.FUEL_LEVELS;
    const depIdx = levels.indexOf(departure);
    const retIdx = levels.indexOf(returnLevel);
    if (retIdx >= depIdx) return 0;
    return this.FUEL_CHARGE_TABLE[`${returnLevel}_to_${departure}`] ?? 0;
  }

  onFuelLevelInChange() {
    const dep = this.dossier?.vehicleDelivery?.fuelLevelOut ?? 'vide';
    const ret = this.retourForm.fuelLevelIn;
    this.retourForm.fuelCharge = this.computeSuggestedFuelCharge(dep, ret);
  }

  onKmRetourChange() {
    const fin = this.dossier?.reservation?.dateFin;
    const retourDate = this.retourForm.inspectedAt;
    if (!fin || !retourDate) { this.retourForm.lateCharge = 0; return; }
    const finTs    = new Date(fin).getTime();
    const retourTs = new Date(retourDate).getTime();
    if (retourTs <= finTs) { this.retourForm.lateCharge = 0; return; }
    const daysLate = Math.ceil((retourTs - finTs) / (1000 * 60 * 60 * 24));
    const prix = parseFloat(
      this.dossier?.contrat?.prixParJourSnapshot ??
      this.dossier?.reservation?.prixParJour ?? '0'
    );
    this.retourForm.lateCharge = daysLate * prix;
  }

  // ── Car damage diagram ───────────────────────────────────────────────────

  get hasDamage(): boolean { return this.retourForm.condition !== 'clean'; }

  setNoDamage(): void {
    if (this.isRetourDone) return;
    this.retourForm.condition    = 'clean';
    this.retourForm.damagedParts = [];
  }

  setHasDamage(): void {
    if (this.isRetourDone) return;
    if (this.retourForm.condition === 'clean') this.retourForm.condition = 'minor_damage';
  }

  togglePart(partId: string): void {
    if (this.isRetourDone) return;
    const parts: string[] = this.retourForm.damagedParts ?? [];
    const idx = parts.indexOf(partId);
    if (idx === -1) parts.push(partId); else parts.splice(idx, 1);
  }

  isPartDamaged(partId: string): boolean {
    return (this.retourForm.damagedParts ?? []).includes(partId);
  }

  carPartLabel(partId: string): string {
    const zone = VEHICLE_ZONES.find(z => z.value === partId);
    return zone ? this.t(zone.key) : partId;
  }

  get totalChargesBeforeRemise(): number {
    return (+(this.retourForm.fuelCharge ?? 0))
         + (+(this.retourForm.lateCharge ?? 0))
         + (+(this.retourForm.damageCharge ?? 0))
         + (+(this.retourForm.equipmentCharge ?? 0));
  }

  get retourCautionRemboursee(): number {
    const caution = +(this.dossier?.contrat?.cautionMontant ?? 0);
    const remise  = +(this.retourForm.remiseMontant ?? 0);
    return Math.max(0, caution - this.totalChargesBeforeRemise + remise);
  }

  get retourMontantFinalDu(): number {
    const total  = +(this.dossier?.montantTotal ?? 0);
    const paid   = +(this.dossier?.montantPaye ?? 0);
    const remise = +(this.retourForm.remiseMontant ?? 0);
    return Math.max(0, total + this.totalChargesBeforeRemise - remise - paid);
  }

  /** One-click fill — not a live binding, so editing fees/remise after clicking this doesn't
   *  silently change the amount the staff already agreed to collect from the client. */
  useFullClosingAmount(): void {
    this.closingPaymentAmount = this.retourMontantFinalDu;
  }

  get departNbJours(): number {
    const debut = this.dossier?.reservation?.dateDebut;
    const fin   = this.dossier?.reservation?.dateFin;
    if (!debut || !fin) return 0;
    return Math.max(1, Math.ceil(
      (new Date(fin).getTime() - new Date(debut).getTime()) / 86400000
    ));
  }

  /** Falls back through contract snapshot -> reservation -> vehicle's own rate, so older
   *  reservations created without a stored prixParJour don't render "null MAD". */
  get effectiveDailyRate(): number {
    return +(this.dossier?.contrat?.prixParJourSnapshot ??
             this.dossier?.reservation?.prixParJour ??
             this.dossier?.reservation?.voiture?.prixJour ?? 0);
  }

  get departTotalNet(): number {
    const jours = +(this.departForm.nbJoursFactures ?? this.departNbJours);
    return jours * this.effectiveDailyRate;
  }

  get departReste(): number {
    return Math.max(0, this.departTotalNet - +(this.dossier?.montantPaye ?? 0));
  }

  // ── Status helpers ───────────────────────────────────────────────────────

  get status(): string { return this.dossier?.status ?? ''; }
  get isDeliveryDone(): boolean { return !!this.dossier?.vehicleDelivery; }
  get isRetourDone(): boolean { return this.status === 'terminee' || this.status === 'termine_avant_terme'; }

  /** "Undo Closure" is only available within 1h of the closure itself (vehicleReturnInspection's
   *  server-set editAu) — re-evaluated on every change-detection pass since it's a plain boolean
   *  comparison, so the button correctly disappears once the window passes without needing a
   *  timer. Only applies to a normal closure (terminee) — termine_avant_terme has no inspection
   *  to undo. */
  get canUndoClosure(): boolean {
    if (this.status !== 'terminee') return false;
    const closedAt = this.dossier?.vehicleReturnInspection?.editAu;
    if (!closedAt) return false;
    return Date.now() - new Date(closedAt).getTime() <= 60 * 60 * 1000;
  }
  get contractNumber(): string { return this.dossier?.contrat?.numero ?? '—'; }

  get vehicleLabel(): string {
    const v = this.dossier?.reservation?.voiture;
    return v ? `${v.marque} ${v.modele} · ${v.immatriculation}` : '—';
  }
  get clientLabel(): string { return this.dossier?.reservation?.client?.nom ?? '—'; }
  get complianceOverall(): string { return this.dossier?.reservation?.voiture?.compliance?.overall ?? 'UNKNOWN'; }
  get isComplianceBlocked(): boolean { return ['EXPIRED', 'UNKNOWN'].includes(this.complianceOverall); }

  setTab(tab: typeof this.activeTab) {
    this.activeTab = tab;
    this.router.navigate([], { relativeTo: this.route, fragment: tab, replaceUrl: true });
  }

  readonly statusClass = reservationStatusClass;

  complianceClass(s: string): string {
    const sev = complianceSeverity(s);
    if (sev === 'ok')      return 'compliance-valid';
    if (sev === 'warning') return 'compliance-warning';
    if (sev === 'danger')  return s === 'EXPIRED' ? 'compliance-expired' : 'compliance-critical';
    return 'compliance-unknown';
  }

  tabComplete(tab: string): boolean {
    if (tab === 'depart')     return this.isDeliveryDone;
    if (tab === 'paiements')  return (this.dossier?.paiements?.length ?? 0) > 0;
    if (tab === 'retour')     return this.isRetourDone;
    if (tab === 'validation') return this.isRetourDone && this.dossier?.paymentStatus === 'paid';
    return false;
  }

  get validationChecks(): { label: string; done: boolean }[] {
    return [
      { label: this.t('vehicleHandedToClient'),  done: this.isDeliveryDone },
      { label: this.t('paymentsCompleted'),      done: this.dossier?.paymentStatus === 'paid' },
      { label: this.t('vehicleReturnRecorded'),  done: this.isRetourDone },
      { label: this.t('contractClosed'),         done: ['terminee', 'termine_avant_terme'].includes(this.status) },
    ];
  }

  get validationAllDone(): boolean {
    return this.validationChecks.every(c => c.done);
  }

  paymentStatusClass(): string {
    const ps = this.dossier?.paymentStatus;
    if (ps === 'paid')    return 'chip-pay-paid';
    if (ps === 'partial') return 'chip-pay-partial';
    return 'chip-pay-unpaid';
  }

  // ── Départ (Remettre les clés) ───────────────────────────────────────────

  remettreLesCles() {
    if (this.isComplianceBlocked) {
      this.toast.show(this.t('deliveryBlockedComplianceExpired'), 'error');
      return;
    }
    this.savingDepart = true;
    const payload = { ...this.departForm };
    this.crud.rawPost(`location/${this.reservationId}/remettre-les-cles`, payload).subscribe({
      next: () => {
        this.toast.show(this.t('vehicleHandedOverContractActive'), 'success');
        this.savingDepart = false;
        this.load();
      },
      error: (err: any) => {
        const msg = err?.error?.message ?? err?.error?.error ?? this.t('errorHandingOverKeys');
        this.toast.show(msg, 'error');
        this.savingDepart = false;
      }
    });
  }

  // ── Paiements ────────────────────────────────────────────────────────────

  addPaiement() {
    if (!this.newPaiement.montant || this.newPaiement.montant <= 0) {
      this.toast.show(this.t('amountMustBeGreaterThanZero'), 'error');
      return;
    }
    this.savingPaiement = true;
    this.crud.rawPost('paiement', {
      ...this.newPaiement,
      reservationId: this.reservationId
    }).subscribe({
      next: () => {
        this.toast.show(this.t('paymentAdded'), 'success');
        this.savingPaiement = false;
        this.bus.paymentsChanged$.next();
        this.load();
      },
      error: (err: any) => {
        this.toast.show(err?.error?.error ?? this.t('error'), 'error');
        this.savingPaiement = false;
      }
    });
  }

  deletePaiement(id: number) {
    this.crud.remove('paiement', id).subscribe({
      next: () => { this.toast.show(this.t('paymentDeleted'), 'info'); this.bus.paymentsChanged$.next(); this.load(); },
      error: (err: any) => this.toast.show(err?.error?.message ?? this.t('error'), 'error')
    });
  }

  // ── Clôture ──────────────────────────────────────────────────────────────

  cloturerContrat() {
    if (!this.retourConfirmed) {
      this.toast.show(this.t('pleaseCheckConfirmationBeforeClosing'), 'error');
      return;
    }
    if (!this.retourForm.kilometrage) {
      this.toast.show(this.t('returnMileageRequired'), 'error');
      return;
    }
    this.savingRetour = true;
    const payload = {
      ...this.retourForm,
      closingPaymentAmount: this.closingPaymentAmount || 0,
      closingPaymentMode: this.closingPaymentMode,
    };
    this.crud.rawPost(`location/${this.reservationId}/cloture`, payload).subscribe({
      next: () => {
        this.toast.show(this.t('contractClosed'), 'success');
        this.savingRetour = false;
        this.bus.paymentsChanged$.next();
        this.load();
      },
      error: (err: any) => {
        this.toast.show(err?.error?.message ?? this.t('errorClosingContract'), 'error');
        this.savingRetour = false;
      }
    });
  }

  /** Reopens a contract closed within the last hour. Does NOT touch any payment collected at
   *  closing — money already received isn't silently un-recorded; staff remove it explicitly
   *  via the Paiements tab if it was genuinely a mistake. */
  undoCloture() {
    if (!confirm(this.t('undoClosureConfirm'))) return;
    this.undoingCloture = true;
    this.crud.rawPost(`location/${this.reservationId}/annuler-cloture`, {}).subscribe({
      next: () => {
        this.toast.show(this.t('undoClosureSuccess'), 'success');
        this.undoingCloture = false;
        this.load();
      },
      error: (err: any) => {
        this.toast.show(err?.error?.message ?? this.t('undoClosureError'), 'error');
        this.undoingCloture = false;
      }
    });
  }

  // ── Driver edit ──────────────────────────────────────────────────────────

  openDriverEdit(which: 'first' | 'second') {
    this.editingDriver = which;
    if (which === 'first') {
      const c = this.dossier?.reservation?.client ?? {};
      this.driverForm = {
        nom:                c.nom ?? '',
        prenom:             c.prenom ?? '',
        telephone:          c.telephone ?? '',
        nationalite:        c.nationalite ?? '',
        cin:                c.cin ?? '',
        cinDelivreLe:       c.cinDelivreLe   ? c.cinDelivreLe.slice(0, 10)   : '',
        cinDelivreA:        c.cinDelivreA    ?? '',
        passeport:          c.passeport      ?? '',
        passeportDelivreLe: c.passeportDelivreLe ? c.passeportDelivreLe.slice(0, 10) : '',
        passeportDelivreA:  c.passeportDelivreA  ?? '',
        dateNaissance:      c.dateNaissance  ? c.dateNaissance.slice(0, 10)  : '',
        lieuNaissance:      c.lieuNaissance  ?? '',
        adresseMaroc:       c.adresseMaroc   ?? c.adresse ?? '',
        permisConduite:     c.permisConduite ?? '',
        permisDelivreLe:    c.permisDelivreLe ? c.permisDelivreLe.slice(0, 10) : '',
        permisDelivreA:     c.permisDelivreA  ?? '',
      };
    } else {
      const d = this.dossier?.reservation?.deuxiemeChauffeur ?? {};
      this.driverForm = {
        nom:                d.nom            ?? '',
        cin:                d.cin            ?? '',
        passeport:          d.passeport      ?? '',
        passeportDelivreLe: d.passeportDelivreLe ? d.passeportDelivreLe.slice(0, 10) : '',
        passeportDelivreA:  d.passeportDelivreA  ?? '',
        dateNaissance:      d.dateNaissance  ? d.dateNaissance.slice(0, 10)  : '',
        permisConduite:     d.permisConduite ?? '',
        permisDelivreLe:    d.permisDelivreLe ? d.permisDelivreLe.slice(0, 10) : '',
        permisDelivreA:     d.permisDelivreA  ?? '',
      };
    }
  }

  cancelDriverEdit() {
    this.editingDriver = null;
    this.driverForm = {};
  }

  saveDriver() {
    this.savingDriver = true;
    if (this.editingDriver === 'first') {
      const clientId = this.dossier?.reservation?.client?.id;
      this.crud.update('client', clientId, this.driverForm).subscribe({
        next: () => { this.savingDriver = false; this.editingDriver = null; this.load(); },
        error: () => { this.savingDriver = false; },
      });
    } else {
      const d2Id = this.dossier?.reservation?.deuxiemeChauffeur?.id;
      this.crud.update('deuxieme-chauffeur', d2Id, this.driverForm).subscribe({
        next: () => { this.savingDriver = false; this.editingDriver = null; this.load(); },
        error: () => { this.savingDriver = false; },
      });
    }
  }

  // ── PDF ──────────────────────────────────────────────────────────────────

  downloadContratPdf() {
    if (!this.dossier?.contrat) { this.toast.show(this.t('noSignedContract'), 'error'); return; }
    this.openPrintContrat();
    this.autoDownloadPdf = true;
  }

  onPrintClosed() { this.printContractData = null; this.autoDownloadPdf = false; }

  // ── Print (branded template — same one used in contrat-list) ───────────────

  /** Maps the already-loaded dossier into the shape PrintContratComponent expects — the same
   *  mapping ContratPrintPageComponent.adapt() does for the standalone /contrat/:id/print route,
   *  just sourced from `dossier` (already in memory here) instead of a fresh `contrat/:id/full`
   *  fetch. */
  openPrintContrat(): void {
    this.autoDownloadPdf = false;
    const c    = this.dossier?.contrat;
    if (!c) { this.toast.show(this.t('noSignedContract'), 'error'); return; }

    const res  = this.dossier?.reservation;
    const cli  = res?.client;
    const voit = res?.voiture;
    const d2   = res?.deuxiemeChauffeur;
    const del  = this.dossier?.vehicleDelivery;
    const ret  = this.dossier?.vehicleReturnInspection;

    this.printContractData = {
      numeroContrat: c?.numero,
      id: c?.id,

      dateDebut: res?.dateDebut,
      dateFin: res?.dateFin,
      faitA: c?.faitA,
      signedAt: c?.signedAt,

      montantTotal: res?.total,
      montantPaye: res?.montantPaye,
      prixParJour: res?.prixParJour ?? c?.prixParJourSnapshot,
      nbJoursFactures: c?.nbJoursFactures,
      remise: c?.remise,
      franchise: c?.franchise,
      hasCaution: c?.hasCaution,
      cautionMontant: c?.cautionMontant,

      lieuLivraison: res?.lieuLivraison,
      lieuRetour: res?.lieuRetour,

      client: cli ? {
        nom: cli.nom,
        prenom: cli.prenom,
        dateNaissance: cli.dateNaissance,
        lieuNaissance: cli.lieuNaissance,
        nationalite: cli.nationalite,
        adresseMaroc: cli.adresseMaroc,
        adresseEtranger: cli.adresseEtranger,
        telephone: cli.telephone,
        telephoneEtranger: cli.telephoneEtranger,
        cin: cli.cin,
        permisConduite: cli.permisConduite,
        permisDelivreLe: cli.permisDelivreLe,
        permisDelivreA: cli.permisDelivreA,
        passeport: cli.passeport,
        passeportDelivreLe: cli.passeportDelivreLe,
        passeportDelivreA: cli.passeportDelivreA,
      } : {},

      deuxiemeChauffeur: d2 ? {
        nom: d2.nom,
        dateNaissance: d2.dateNaissance,
        nationalite: d2.nationalite,
        adresseMaroc: d2.adresseMaroc,
        telephone: d2.telephone,
        cin: d2.cin,
        permisConduite: d2.permisConduite,
        permisDelivreLe: d2.permisDelivreLe,
        permisDelivreA: d2.permisDelivreA,
        passeport: d2.passeport,
        passeportDelivreLe: d2.passeportDelivreLe,
        passeportDelivreA: d2.passeportDelivreA,
      } : null,

      voiture: voit ? {
        marque: voit.marque,
        modele: voit.modele,
        immatriculation: voit.immatriculation,
        kilometrageActuel: del?.mileageOut ?? voit.kilometrageActuel,
        prixJour: res?.prixParJour ?? c?.prixParJourSnapshot ?? voit.prixJour,
      } : {},

      vehicleDelivery: del ?? null,
      vehicleReturnInspection: ret ?? null,
    };
  }
}
