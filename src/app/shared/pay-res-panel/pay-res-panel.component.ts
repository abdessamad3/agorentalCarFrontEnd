import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CrudService } from '../../services/crud.service';
import { TranslationService } from '../../services/translation.service';

@Component({
  selector: 'app-pay-res-panel',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './pay-res-panel.component.html',
  styleUrls: ['./pay-res-panel.component.css'],
})
export class PayResPanelComponent implements OnChanges {
  @Input() open          = false;
  @Input() reservationId: number | null = null;
  @Input() montantTotal  = 0;
  @Input() montantPaye   = 0;
  @Input() title         = '';
  @Input() dir           = 'ltr';

  @Output() closed         = new EventEmitter<void>();
  @Output() paymentChanged = new EventEmitter<void>();

  paiements: any[] = [];
  loading    = false;
  submitting = false;
  deleteId: number | null = null;
  form!: FormGroup;

  readonly PAY_MODES = [
    { value: 'especes',  label: 'Espèces' },
    { value: 'virement', label: 'Virement' },
    { value: 'cheque',   label: 'Chèque' },
    { value: 'carte',    label: 'Carte' },
  ];

  constructor(
    private crud: CrudService,
    private ts: TranslationService,
    private fb: FormBuilder,
  ) {
    this.form = this.fb.group({
      montant:      [null, [Validators.required, Validators.min(0.01)]],
      datePaiement: ['', Validators.required],
      modePaiement: ['especes'],
      note:         [''],
    });
  }

  ngOnChanges(c: SimpleChanges): void {
    const openedNow = c['open']?.currentValue === true && c['open']?.previousValue !== true;
    if (openedNow && this.reservationId) {
      this.resetForm();
      this.paiements = [];
      this.deleteId  = null;
      this.loadPaiements();
    }
    if (c['reservationId'] && this.open && this.reservationId) {
      this.loadPaiements();
    }
  }

  private resetForm(): void {
    this.form.reset({ datePaiement: new Date().toISOString().split('T')[0], modePaiement: 'especes' });
    this.form.get('montant')!.setValidators([Validators.required, Validators.min(0.01), Validators.max(this.reste || 0.01)]);
    this.form.get('montant')!.updateValueAndValidity();
  }

  loadPaiements(): void {
    if (!this.reservationId) return;
    this.loading = true;
    this.crud.getAll('paiement', { reservationId: this.reservationId }).subscribe({
      next: (data: any) => {
        this.paiements = Array.isArray(data) ? data : (data?.data ?? []);
        this.loading = false;
      },
      error: () => { this.loading = false; },
    });
  }

  submit(): void {
    if (this.form.invalid || !this.reservationId) return;
    this.submitting = true;
    const v = this.form.value;
    this.crud.create('paiement', {
      reservationId: this.reservationId,
      montant:       parseFloat(v.montant),
      datePaiement:  v.datePaiement,
      modePaiement:  v.modePaiement,
      note:          v.note || undefined,
    }).subscribe({
      next: () => {
        this.submitting = false;
        this.resetForm();
        this.loadPaiements();
        this.paymentChanged.emit();
      },
      error: () => { this.submitting = false; },
    });
  }

  deletePay(id: number): void {
    this.deleteId = id;
    this.crud.remove('paiement', id).subscribe({
      next:  () => { this.deleteId = null; this.loadPaiements(); this.paymentChanged.emit(); },
      error: () => { this.deleteId = null; },
    });
  }

  get reste(): number { return Math.max(0, +this.montantTotal - +this.montantPaye); }

  get progressPct(): number {
    if (!+this.montantTotal) return 0;
    return Math.min(100, Math.round((+this.montantPaye / +this.montantTotal) * 100));
  }

  paymentModeLabel(m: string | null): string {
    const found = this.PAY_MODES.find(p => p.value === (m || '').toLowerCase());
    return found ? found.label : (m || '—');
  }

  close(): void { this.closed.emit(); }
  t(k: string): string { return this.ts.translate(k); }
}
