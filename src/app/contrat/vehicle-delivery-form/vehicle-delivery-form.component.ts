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
  selector: 'app-vehicle-delivery-form',
  standalone: true,
  imports: [CommonModule, FormsModule, FuelGaugeComponent, SignaturePadComponent, BtnComponent],
  templateUrl: './vehicle-delivery-form.component.html',
  styleUrls: ['./vehicle-delivery-form.component.css'],
})
export class VehicleDeliveryFormComponent implements OnInit {
  @Input() reservation!: any;
  @Output() saved  = new EventEmitter<void>();
  @Output() closed = new EventEmitter<void>();

  mileageOut  = '';
  fuelLevel   = 'vide';
  hasExtincteur      = false;
  hasLavage          = false;
  hasPlaqueDepannage = false;
  hasCric            = false;
  hasGilet           = false;
  hasRoueSecours     = false;
  hasSiegeBebe       = false;
  equipementNotes    = '';
  deliveryNotes      = '';

  signatureClient: string | null = null;
  signatureAgent:  string | null = null;

  isSubmitting = false;

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
  }

  get isValid(): boolean {
    return !!this.mileageOut && +this.mileageOut > 0;
  }

  onFuelChange(v: string) { this.fuelLevel = v; }
  onSignatureClient(sig: string | null) { this.signatureClient = sig; }
  onSignatureAgent(sig: string | null)  { this.signatureAgent  = sig; }

  submit() {
    if (!this.isValid || this.isSubmitting) return;
    this.isSubmitting = true;

    const payload = {
      reservationId:       this.reservation.id,
      mileageOut:          +this.mileageOut,
      fuelLevelOut:        this.fuelLevel,
      hasExtincteur:       this.hasExtincteur,
      hasLavage:           this.hasLavage,
      hasPlaqueDepannage:  this.hasPlaqueDepannage,
      hasCric:             this.hasCric,
      hasGilet:            this.hasGilet,
      hasRoueSecours:      this.hasRoueSecours,
      hasSiegeBebe:        this.hasSiegeBebe,
      equipementNotes:     this.equipementNotes || null,
      deliveryNotes:       this.deliveryNotes   || null,
      signatureClientDepart:  this.signatureClient,
      signatureSocieteDepart: this.signatureAgent,
    };

    this.crud.create('vehicle-delivery', payload).subscribe({
      next: () => {
        this.toast.show('Livraison confirmée. Contrat actif.', 'success');
        this.saved.emit();
      },
      error: (err) => {
        this.toast.show(err?.error?.error || 'Erreur lors de la livraison.', 'error');
        this.isSubmitting = false;
      },
    });
  }
}
