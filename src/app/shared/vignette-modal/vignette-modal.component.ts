import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { BtnComponent } from '../btn/btn.component';
import { VignetteFormComponent } from '../vignette-form/vignette-form.component';
import { payNotExceedTotal } from '../validators/pay-not-exceed-total.validator';

@Component({
  selector: 'app-vignette-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslatePipe, BtnComponent, VignetteFormComponent],
  templateUrl: './vignette-modal.component.html',
  styleUrls: ['../styles/crud-list.css'],
})
export class VignetteModalComponent implements OnChanges {
  @Input() modalMode: 'form' | 'delete' | 'renew' | null = null;
  @Input() isEditing = false;
  @Input() isSubmitting = false;
  @Input() editItem: any = null;
  @Input() errorMessage: string | null = null;
  @Input() showMontantPaye = false;
  @Input() showFileUpload  = false;
  @Input() existingFilePath: string | null = null;
  @Input() paiementCount = 0;

  @Output() saved            = new EventEmitter<{ value: any; file: File | null }>();
  @Output() cancelled        = new EventEmitter<void>();
  @Output() deleteConfirmed  = new EventEmitter<void>();
  @Output() renewConfirmed   = new EventEmitter<{ annee: number; dateLimite: string; montant: number | null; montantPaye: number | null }>();

  form: FormGroup;
  renewForm: FormGroup;
  selectedFile: File | null = null;

  constructor(private fb: FormBuilder) {
    this.form = this.fb.group({
      annee:        [new Date().getFullYear(), [Validators.required, Validators.min(2000)]],
      dateLimite:   [this.defaultDateLimite(), Validators.required],
      dateFacture:  [null],
      montant:      [null],
      montantPaye:  [null],
    }, { validators: payNotExceedTotal() });
    this.renewForm = this.fb.group({
      annee:       [new Date().getFullYear() + 1, [Validators.required, Validators.min(2000)]],
      dateLimite:  [this.defaultDateLimite(), Validators.required],
      montant:     [null],
      montantPaye: [null],
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['modalMode']) {
      if (this.modalMode === 'form') {
        if (this.isEditing && this.editItem) {
          this.form.patchValue(this.editItem);
        } else {
          this.form.reset({
            annee:        new Date().getFullYear(),
            dateLimite:   this.defaultDateLimite(),
            dateFacture:  null,
            montant:      null,
            montantPaye:  null,
          });
        }
      }
      if (this.modalMode === 'renew' && this.editItem) {
        const nextYear = (this.editItem.annee ?? new Date().getFullYear()) + 1;
        this.renewForm.reset({
          annee:       nextYear,
          dateLimite:  `${nextYear}-01-31`,
          montant:     this.editItem.montant ?? null,
          montantPaye: null,
        });
      }
      if (!this.modalMode) {
        this.selectedFile = null;
      }
    }
  }

  private defaultDateLimite(): string {
    return `${new Date().getFullYear() + 1}-01-31`;
  }

  onSave(): void {
    if (this.form.invalid) return;
    this.saved.emit({ value: this.form.value, file: this.selectedFile });
  }

  onRenew(): void {
    if (this.renewForm.invalid) { this.renewForm.markAllAsTouched(); return; }
    const v = this.renewForm.value;
    this.renewConfirmed.emit({
      annee:       v.annee,
      dateLimite:  v.dateLimite,
      montant:     v.montant,
      montantPaye: v.montantPaye,
    });
  }
}
