import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CrudService } from '../../services/crud.service';
import { ToastService } from '../../services/toast.service';
import { AuthService } from '../../services/auth.service';
import { FuelGaugeComponent } from '../../shared/fuel-gauge/fuel-gauge.component';
import { SignaturePadComponent } from '../../shared/signature-pad/signature-pad.component';
import { BtnComponent } from '../../shared/btn/btn.component';

@Component({
  selector: 'app-vehicle-return-form',
  standalone: true,
  imports: [CommonModule, FormsModule, FuelGaugeComponent, SignaturePadComponent, BtnComponent],
  templateUrl: './vehicle-return-form.component.html',
  styleUrls: ['./vehicle-return-form.component.css'],
})
export class VehicleReturnFormComponent implements OnInit {
  @Input() reservation!: any;
  @Input() delivery: any = null;
  @Output() saved  = new EventEmitter<void>();
  @Output() closed = new EventEmitter<void>();

  kilometrage   = '';
  fuelLevelIn   = 'vide';
  condition     = 'clean';
  hasExtincteur      = false;
  hasLavage          = false;
  hasPlaqueDepannage = false;
  hasCric            = false;
  hasGilet           = false;
  hasRoueSecours     = false;
  hasSiegeBebe       = false;
  notes         = '';
  fuelCharge    = '';
  lateCharge    = '';
  damageCharge  = '';

  signatureClient: string | null = null;
  signatureAgent:  string | null = null;

  isSubmitting = false;
  inspectionId: number | null = null;

  readonly conditionOptions = [
    { value: 'clean',        label: 'Propre / Sans dommage' },
    { value: 'minor_damage', label: 'Dommages mineurs' },
    { value: 'major_damage', label: 'Dommages importants' },
  ];

  constructor(
    private crud: CrudService,
    private toast: ToastService,
    private auth: AuthService,
  ) {}

  ngOnInit() {
    this.auth.getMySignature().subscribe({
      next: sig => { if (sig) this.signatureAgent = sig; },
      error: () => {},
    });
    if (this.delivery) {
      this.hasExtincteur      = this.delivery.hasExtincteur      ?? false;
      this.hasLavage          = this.delivery.hasLavage          ?? false;
      this.hasPlaqueDepannage = this.delivery.hasPlaqueDepannage ?? false;
      this.hasCric            = this.delivery.hasCric            ?? false;
      this.hasGilet           = this.delivery.hasGilet           ?? false;
      this.hasRoueSecours     = this.delivery.hasRoueSecours     ?? false;
      this.hasSiegeBebe       = this.delivery.hasSiegeBebe       ?? false;
    }
  }

  get isValid(): boolean {
    return !!this.kilometrage && +this.kilometrage > 0;
  }

  get totalCharges(): number {
    return (parseFloat(this.fuelCharge)   || 0)
         + (parseFloat(this.lateCharge)   || 0)
         + (parseFloat(this.damageCharge) || 0);
  }

  accessoryChanged(field: string, deliveryValue: boolean, returnValue: boolean): boolean {
    return deliveryValue !== returnValue;
  }

  onFuelChange(v: string)  { this.fuelLevelIn = v; }
  onSignatureClient(sig: string | null) { this.signatureClient = sig; }
  onSignatureAgent(sig: string | null)  { this.signatureAgent  = sig; }

  private buildPayload() {
    return {
      reservationId:         this.reservation.id,
      kilometrage:           +this.kilometrage,
      fuelLevelIn:           this.fuelLevelIn,
      condition:             this.condition,
      hasExtincteur:         this.hasExtincteur,
      hasLavage:             this.hasLavage,
      hasPlaqueDepannage:    this.hasPlaqueDepannage,
      hasCric:               this.hasCric,
      hasGilet:              this.hasGilet,
      hasRoueSecours:        this.hasRoueSecours,
      hasSiegeBebe:          this.hasSiegeBebe,
      notes:                 this.notes || null,
      fuelCharge:            this.fuelCharge   ? +this.fuelCharge   : null,
      lateCharge:            this.lateCharge   ? +this.lateCharge   : null,
      damageCharge:          this.damageCharge ? +this.damageCharge : null,
      signatureClientRetour: this.signatureClient,
      signatureSocieteRetour:this.signatureAgent,
    };
  }

  save() {
    if (!this.isValid || this.isSubmitting) return;
    this.isSubmitting = true;

    const req = this.inspectionId
      ? this.crud.update('vehicle-return-inspection', this.inspectionId, this.buildPayload())
      : this.crud.create('vehicle-return-inspection', this.buildPayload());

    req.subscribe({
      next: (result: any) => {
        this.inspectionId = result?.id ?? this.inspectionId;
        this.toast.show('Inspection enregistrée.', 'success');
        this.isSubmitting = false;
      },
      error: (err) => {
        this.toast.show(err?.error?.error || 'Erreur lors de l\'enregistrement.', 'error');
        this.isSubmitting = false;
      },
    });
  }

  validateReturn() {
    if (!this.isValid || this.isSubmitting) return;

    const doValidate = (id: number) => {
      this.isSubmitting = true;
      this.crud.customAction(`vehicle-return-inspection/${id}/validate`, {}, 'Retour validé').subscribe({
        next: () => {
          this.toast.show('Retour validé. Contrat clôturé.', 'success');
          this.saved.emit();
        },
        error: (err) => {
          this.toast.show(err?.error?.error || 'Erreur lors de la validation.', 'error');
          this.isSubmitting = false;
        },
      });
    };

    if (this.inspectionId) {
      const updateReq = this.crud.update('vehicle-return-inspection', this.inspectionId, this.buildPayload());
      updateReq.subscribe({
        next: () => doValidate(this.inspectionId!),
        error: () => { this.isSubmitting = false; },
      });
      return;
    }

    this.isSubmitting = true;
    this.crud.create('vehicle-return-inspection', this.buildPayload()).subscribe({
      next: (result: any) => {
        this.inspectionId = result?.id;
        doValidate(result.id);
      },
      error: (err) => {
        this.toast.show(err?.error?.error || 'Erreur lors de l\'enregistrement.', 'error');
        this.isSubmitting = false;
      },
    });
  }
}
