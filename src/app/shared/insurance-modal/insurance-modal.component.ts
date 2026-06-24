import {
  Component, Input, Output, EventEmitter,
  OnChanges, SimpleChanges, HostListener
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule, FormsModule,
  FormBuilder, FormGroup, Validators
} from '@angular/forms';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { payNotExceedTotal } from '../validators/pay-not-exceed-total.validator';
import { UploadBtnComponent } from '../btn/upload-btn.component';

export interface InsuranceSavePayload {
  value: {
    voitureId?: number | null;
    compagnie: string;
    typeAssurance: string;
    numeroContrat: string;
    dateDebut: string;
    dateFin: string;
    dateFacture: string | null;
    montant: number | null;
    montantPaye: number | null;
    notes: string | null;
  };
  file: File | null;
}

@Component({
  selector: 'app-insurance-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, TranslatePipe, UploadBtnComponent],
  templateUrl: './insurance-modal.component.html',
  styleUrls: ['./insurance-modal.component.css'],
})
export class InsuranceModalComponent implements OnChanges {
  @Input() modalMode: 'add' | 'edit' | 'delete' | 'renew' | 'cancel' | null = null;
  @Input() carName = '';
  @Input() isSubmitting = false;
  @Input() editItem: any = null;
  @Input() errorMessage: string | null = null;
  /** Pass the fleet list to show a vehicle picker inside the form */
  @Input() voitures: any[] = [];

  @Output() saved           = new EventEmitter<InsuranceSavePayload>();
  @Output() cancelled       = new EventEmitter<void>();
  @Output() deleteConfirmed = new EventEmitter<void>();
  @Output() cancelConfirmed = new EventEmitter<void>();
  @Output() renewConfirmed  = new EventEmitter<{
    dateDebut: string; dateFin: string; montant: number | null;
    compagnie: string | null; typeAssurance: string | null;
    numeroContrat: string | null; montantPaye: number | null;
  }>();

  form: FormGroup;
  renewForm: FormGroup;
  selectedFile: File | null = null;
  filePreview: string | null = null;
  compagnieIsOther = false;
  compagnieSelectValue = '';

  readonly COVERAGE_TYPES = ['RC', 'Tous Risques', 'Tiers Étendu', 'Tiers Simple'];
  readonly MOROCCAN_INSURERS = [
    'Wafa Assurance', 'AXA Assurance Maroc', 'Allianz Maroc',
    'Atlanta Assurance', 'Saham Assurance', 'RMA Assurance',
    'MCMA', 'MAMDA', 'Zurich Assurance Maroc', 'Sanlam Maroc',
    'CNIA Assurance', 'Essaada Assurance',
    'Maroc Assistance Internationale', 'Euler Hermes Acmar',
  ];

  constructor(private fb: FormBuilder) {
    this.form = this.fb.group({
      voitureId:     [null],
      compagnie:     [''],
      typeAssurance: [''],
      numeroContrat: [''],
      dateDebut:     [''],
      dateFin:       ['', Validators.required],
      dateFacture:   [null],
      montant:       [null],
      montantPaye:   [null],
      notes:         [''],
    }, { validators: payNotExceedTotal() });
    this.renewForm = this.fb.group({
      dateDebut:     ['', Validators.required],
      dateFin:       ['', Validators.required],
      montant:       [null],
      compagnie:     [null],
      typeAssurance: [null],
      numeroContrat: [null],
      montantPaye:   [null],
    }, { validators: payNotExceedTotal() });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['modalMode']) {
      if (this.modalMode === 'add') {
        this.form.reset({ voitureId: null });
        this.compagnieIsOther = false;
        this.compagnieSelectValue = '';
        this.selectedFile = null;
        this.filePreview = null;
      }
      if (this.modalMode === 'edit' && this.editItem) {
        const comp = this.editItem.compagnie || '';
        const isKnown = this.MOROCCAN_INSURERS.includes(comp);
        this.compagnieIsOther = !!comp && !isKnown;
        this.compagnieSelectValue = this.compagnieIsOther ? '__other__' : comp;
        this.form.patchValue({
          voitureId:     this.editItem.voitureId ?? this.editItem.voiture?.id ?? null,
          compagnie:     comp,
          typeAssurance: this.editItem.typeAssurance || '',
          numeroContrat: this.editItem.numeroContrat || '',
          dateDebut:     this.editItem.dateDebut    ? this.editItem.dateDebut.split('T')[0]    : '',
          dateFin:       this.editItem.dateFin      ? this.editItem.dateFin.split('T')[0]      : '',
          dateFacture:   this.editItem.dateFacture  ? this.editItem.dateFacture.split('T')[0]  : null,
          montant:       this.editItem.montant ?? null,
          notes:         this.editItem.notes ?? '',
        });
        this.selectedFile = null;
        this.filePreview = null;
      }
      if (this.modalMode === 'renew' && this.editItem) {
        const oldEnd = this.editItem.dateFin ? new Date(this.editItem.dateFin) : new Date();
        const ns = new Date(oldEnd); ns.setDate(ns.getDate() + 1);
        const ne = new Date(ns);    ne.setFullYear(ne.getFullYear() + 1);
        this.renewForm.reset({
          dateDebut:     ns.toISOString().split('T')[0],
          dateFin:       ne.toISOString().split('T')[0],
          montant:       this.editItem.montant ?? null,
          compagnie:     this.editItem.compagnie ?? null,
          typeAssurance: this.editItem.typeAssurance ?? null,
          numeroContrat: null,
          montantPaye:   null,
        });
      }
      if (!this.modalMode) {
        this.selectedFile = null;
        this.filePreview = null;
      }
    }
  }

  @HostListener('document:keydown.escape') onEscape() {
    if (this.modalMode) this.cancelled.emit();
  }

  onCompagnieChange(value: string): void {
    this.compagnieIsOther = value === '__other__';
    if (!this.compagnieIsOther) this.form.get('compagnie')!.setValue(value);
    else this.form.get('compagnie')!.setValue('');
  }

  onFileSelect(file: File): void {
    this.selectedFile = file;
    this.filePreview = null;
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = e => { this.filePreview = e.target?.result as string; };
      reader.readAsDataURL(file);
    }
  }

  clearFile(): void {
    this.selectedFile = null;
    this.filePreview = null;
  }

  onSave(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saved.emit({ value: this.form.value, file: this.selectedFile });
  }

  onRenew(): void {
    if (this.renewForm.invalid) { this.renewForm.markAllAsTouched(); return; }
    const v = this.renewForm.value;
    this.renewConfirmed.emit({
      dateDebut:     v.dateDebut,
      dateFin:       v.dateFin,
      montant:       v.montant,
      compagnie:     v.compagnie || null,
      typeAssurance: v.typeAssurance || null,
      numeroContrat: v.numeroContrat || null,
      montantPaye:   v.montantPaye || null,
    });
  }

  get isEditing(): boolean { return this.modalMode === 'edit'; }
  get isFormMode(): boolean { return this.modalMode === 'add' || this.modalMode === 'edit'; }
}
