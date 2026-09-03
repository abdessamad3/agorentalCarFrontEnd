import { Component, Input, OnInit } from '@angular/core';
import { CommonModule, TitleCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { TranslationService } from '../../../../services/translation.service';
import { environment } from '../../../../../environments/environment';
import { VehicleMapComponent, VEHICLE_ZONES } from '../../../../shared/vehicle-map/vehicle-map.component';
import { ModalComponent } from '../../../../shared/modal/modal.component';
import { PayDepPanelComponent } from '../../../../shared/pay-dep-panel/pay-dep-panel.component';

export interface DamageRecord {
  id: number;
  zone: string;
  severity: string;
  status: 'open' | 'repaired';
  description: string | null;
  estimatedCost: string | null;
  reparationId: number | null;
  depenseId: number | null;
  repairMontant: number | null;
  repairMontantPaye: number | null;
  creeAu: string;
  repairedAt: string | null;
  reservationId: number | null;
}


@Component({
  selector: 'app-damage-tab',
  standalone: true,
  imports: [CommonModule, FormsModule, TitleCasePipe, VehicleMapComponent, ModalComponent, PayDepPanelComponent],
  templateUrl: './damage-tab.component.html',
  styleUrls: ['../../voiture-detail.component.css'],
})
export class DamageTabComponent implements OnInit {
  @Input() carId!: number;
  @Input() car!: any;
  @Input() dir = 'ltr';

  damages: DamageRecord[] = [];
  loading = true;
  error = '';
  repairError = '';

  // ── Add form ────────────────────────────────────────────────────────────────
  showAddForm = false;
  addZone = '';
  addSeverity = 'scratch';
  addDescription = '';
  addEstimatedCost = '';
  adding = false;
  addError = '';

  // ── Payment panel ────────────────────────────────────────────────────────────
  payPanelDamage: DamageRecord | null = null;
  payPanelOpen = false;

  openPayPanel(damage: DamageRecord): void {
    this.payPanelDamage = damage;
    this.payPanelOpen = true;
  }

  closePayPanel(): void {
    this.payPanelOpen = false;
    this.payPanelDamage = null;
  }

  onRepairPaymentChanged(): void {
    this.load();
  }

  // ── Repair modal ─────────────────────────────────────────────────────────────
  repairFormId: number | null = null;
  repairDamage: DamageRecord | null = null;
  repairAmountPaid = '';
  repairFile: File | null = null;
  submittingRepair = false;
  repairFormError = '';

  readonly ZONES = VEHICLE_ZONES;

  readonly SEVERITIES = [
    { value: 'scratch', key: 'sevScratch' },
    { value: 'dent',    key: 'sevDent' },
    { value: 'crack',   key: 'sevCrack' },
    { value: 'broken',  key: 'sevBroken' },
  ];

  constructor(private http: HttpClient, private ts: TranslationService) {}

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading = true;
    this.error = '';
    this.http.get<DamageRecord[]>(`${environment.apiUrl}/voiture/${this.carId}/damages`).subscribe({
      next: (data) => { this.damages = data; this.loading = false; },
      error: () => { this.error = 'Failed to load damage records.'; this.loading = false; },
    });
  }

  get openDamages(): DamageRecord[] { return this.damages.filter(d => d.status === 'open'); }
  get repairedDamages(): DamageRecord[] { return this.damages.filter(d => d.status === 'repaired'); }
  get damagedZonesList(): string[] { return this.openDamages.map(d => d.zone); }

  damagedZones(): Set<string> { return new Set(this.openDamages.map(d => d.zone)); }
  isOpen(zone: string): boolean { return this.damagedZones().has(zone); }

  partLabel(zone: string): string {
    const z = this.ZONES.find(z => z.value === zone);
    return z ? this.t(z.key) : zone;
  }

  // ── Add form ────────────────────────────────────────────────────────────────

  openAddForm(): void {
    this.showAddForm = true;
    this.addZone = '';
    this.addSeverity = 'scratch';
    this.addDescription = '';
    this.addEstimatedCost = '';
    this.addError = '';
  }

  closeAddForm(): void { this.showAddForm = false; }

  submitDamage(): void {
    if (!this.addZone) { this.addError = this.t('selectZonePlease'); return; }
    this.adding = true;
    this.addError = '';
    this.http.post(
      `${environment.apiUrl}/voiture/${this.carId}/damage`,
      {
        zone: this.addZone,
        severity: this.addSeverity,
        description: this.addDescription || null,
        estimatedCost: this.addEstimatedCost ? Number(this.addEstimatedCost) : null,
      }
    ).subscribe({
      next: () => { this.adding = false; this.showAddForm = false; this.load(); },
      error: (err) => { this.adding = false; this.addError = err?.error?.error || 'Failed to add damage.'; },
    });
  }

  // ── Repair form ─────────────────────────────────────────────────────────────

  openRepairForm(damage: DamageRecord): void {
    this.repairFormId = damage.id;
    this.repairDamage = damage;
    this.repairAmountPaid = '';
    this.repairFile = null;
    this.repairFormError = '';
  }

  cancelRepairForm(): void {
    this.repairFormId = null;
    this.repairDamage = null;
    this.repairFile = null;
    this.repairFormError = '';
  }

  onRepairFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.repairFile = input.files?.[0] ?? null;
  }

  submitRepair(): void {
    if (this.submittingRepair || !this.repairDamage) return;
    this.submittingRepair = true;
    this.repairFormError = '';

    const fd = new FormData();
    if (this.repairAmountPaid && Number(this.repairAmountPaid) > 0) {
      fd.append('amountPaid', this.repairAmountPaid);
    }
    if (this.repairFile) {
      fd.append('receipt', this.repairFile);
    }

    this.http.post<{ damage: DamageRecord; allRepaired: boolean }>(
      `${environment.apiUrl}/damage/${this.repairDamage.id}/repair`, fd
    ).subscribe({
      next: () => {
        this.submittingRepair = false;
        this.repairFormId = null;
        this.repairDamage = null;
        this.repairFile = null;
        this.load();
      },
      error: (err) => {
        this.submittingRepair = false;
        this.repairFormError = err?.error?.error || 'Failed to mark as repaired.';
      },
    });
  }

  t(key: string): string { return this.ts.translate(key); }
}
