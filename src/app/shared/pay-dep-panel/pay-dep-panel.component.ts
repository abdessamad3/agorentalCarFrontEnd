import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { PaiementDepenseService } from '../../services/paiement-depense.service';
import { TranslationService } from '../../services/translation.service';

@Component({
  selector: 'app-pay-dep-panel',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './pay-dep-panel.component.html',
  styleUrls: ['./pay-dep-panel.component.css'],
})
export class PayDepPanelComponent implements OnChanges {
  @Input() open          = false;
  @Input() depenseId: number | null = null;
  @Input() montantTotal  = 0;
  @Input() montantPaye   = 0;
  @Input() title         = '';
  @Input() dir           = 'ltr';
  @Input() dateFacture: string | null = null;

  @Output() closed         = new EventEmitter<void>();
  @Output() paymentChanged = new EventEmitter<void>();

  paiements:   any[] = [];
  loading    = false;
  submitting = false;
  deleteId: number | null = null;
  form!: FormGroup;

  constructor(
    private payDepSvc: PaiementDepenseService,
    private ts: TranslationService,
    private fb: FormBuilder,
  ) {
    this.form = this.fb.group({
      montant:      [null, [Validators.required, Validators.min(0.01)]],
      datePaiement: ['', Validators.required],
      note:         [''],
    });
  }

  ngOnChanges(c: SimpleChanges): void {
    const openedNow = c['open']?.currentValue === true && c['open']?.previousValue !== true;
    if (openedNow && this.depenseId) {
      this.form.reset({ datePaiement: new Date().toISOString().split('T')[0] });
      this.paiements = [];
      this.deleteId  = null;
      this.loadPaiements();
    }
    if (c['depenseId'] && this.open && this.depenseId) {
      this.loadPaiements();
    }
  }

  loadPaiements(): void {
    if (!this.depenseId) return;
    this.loading = true;
    this.payDepSvc.getByDepense(this.depenseId).subscribe({
      next: (items) => { this.paiements = items; this.loading = false; },
      error: () => { this.loading = false; },
    });
  }

  submit(): void {
    if (this.form.invalid || !this.depenseId) return;
    if (+this.form.value.montant > this.reste) return;
    if (this.dateFacture && this.form.value.datePaiement < this.dateFacture) return;
    this.submitting = true;
    const v = this.form.value;
    this.payDepSvc.create({
      depenseId:    this.depenseId,
      montant:      parseFloat(v.montant),
      datePaiement: v.datePaiement,
      note:         v.note || undefined,
    }).subscribe({
      next: () => {
        this.submitting = false;
        this.form.reset({ datePaiement: new Date().toISOString().split('T')[0] });
        this.loadPaiements();
        this.paymentChanged.emit();
      },
      error: () => { this.submitting = false; },
    });
  }

  deletePay(id: number): void {
    this.deleteId = id;
    this.payDepSvc.delete(id).subscribe({
      next:  () => { this.deleteId = null; this.loadPaiements(); this.paymentChanged.emit(); },
      error: () => { this.deleteId = null; },
    });
  }

  get reste(): number { return Math.max(0, +this.montantTotal - +this.montantPaye); }

  get progressPct(): number {
    if (!+this.montantTotal) return 0;
    return Math.min(100, Math.round((+this.montantPaye / +this.montantTotal) * 100));
  }

  close(): void { this.closed.emit(); }
  t(k: string): string { return this.ts.translate(k); }
}
