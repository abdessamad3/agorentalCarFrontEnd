import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { CrudService } from '../../../../services/crud.service';
import { TranslationService } from '../../../../services/translation.service';
import { environment } from '../../../../../environments/environment';
import { daysUntil as daysUntilUtil } from '../../../../shared/utils/date.utils';
import { SuiviTechnique } from '../../../../models/compliance.model';
import { UploadBtnComponent } from '../../../../shared/btn/upload-btn.component';

@Component({
  selector: 'app-suivi-tab',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, UploadBtnComponent],
  templateUrl: './suivi-tab.component.html',
  styleUrls: ['../../voiture-detail.component.css'],
})
export class SuiviTabComponent implements OnChanges {
  @Input() carId!: number;
  @Input() car!: any;
  @Input() dir = 'ltr';
  @Output() carRefresh = new EventEmitter<void>();

  items: SuiviTechnique[] = [];
  loading = false;
  modalMode: 'form' | 'delete' | null = null;
  selectedItem: any = null;
  deleteId: number | null = null;
  isEditing = false;
  isSubmitting = false;
  form!: FormGroup;
  selectedFile: File | null = null;

  readonly RESULTATS = [
    { value: 'favorable',              label: 'Favorable' },
    { value: 'favorable_avec_reserve', label: 'Favorable avec réserve' },
    { value: 'defavorable',            label: 'Défavorable' },
  ];

  constructor(private crud: CrudService, private ts: TranslationService, private fb: FormBuilder) {
    this.form = this.fb.group({
      dateFin:       ['', Validators.required],
      dateReglages:  [null],
      montant:       [null],
      resultat:      [null],
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if ((changes['carId'] || changes['car']) && this.carId) this.load();
  }

  load(): void {
    this.loading = true;
    this.crud.getAll('suivi-technique').pipe(catchError(() => of([]))).subscribe((data: any) => {
      const all: any[] = Array.isArray(data) ? data : (data?.data ?? []);
      this.items = all
        .filter((r: any) => (r.voitureId ?? r.voiture?.id) === this.carId)
        .sort((a: any, b: any) => (b.dateFin || '').localeCompare(a.dateFin || ''));
      this.loading = false;
    });
  }

  openAdd(): void {
    this.selectedItem = null; this.isEditing = false; this.isSubmitting = false; this.deleteId = null;
    this.selectedFile = null;
    this.form.reset(); this.modalMode = 'form';
  }

  openEdit(item: any): void {
    this.selectedItem = item; this.isEditing = true; this.isSubmitting = false; this.deleteId = null;
    this.selectedFile = null;
    this.form.patchValue({
      dateFin:      (item.dateFin      || '').split('T')[0],
      dateReglages: (item.dateReglages || '').split('T')[0] || null,
      montant:      item.montantTotal ?? null,
      resultat:     item.resultat ?? null,
    });
    this.modalMode = 'form';
  }

  openDelete(item: any): void {
    this.selectedItem = item; this.deleteId = item.id; this.isSubmitting = false; this.modalMode = 'delete';
  }

  closeModal(): void {
    this.modalMode = null; this.selectedItem = null; this.deleteId = null;
    this.isEditing = false; this.isSubmitting = false; this.selectedFile = null;
  }

  @HostListener('document:keydown.escape') onEsc(): void { if (this.modalMode) this.closeModal(); }

  onFileSelect(file: File): void {
    this.selectedFile = file;
  }

  clearFile(): void { this.selectedFile = null; }

  save(): void {
    if (this.form.invalid || !this.car) return;
    this.isSubmitting = true;
    const v = this.form.value;
    const payload: any = { voitureId: this.car.id, dateFin: v.dateFin };
    if (v.dateReglages) payload.dateReglages = v.dateReglages;
    if (v.montant != null) payload.montantTotal = parseFloat(v.montant);
    payload.resultat = v.resultat || null;
    const req = this.isEditing
      ? this.crud.update('suivi-technique', this.selectedItem.id, payload)
      : this.crud.create('suivi-technique', payload);
    req.subscribe({
      next: (saved: any) => {
        const recordId = saved?.id ?? this.selectedItem?.id;
        const finish = () => { this.closeModal(); this.load(); this.carRefresh.emit(); };
        if (this.selectedFile && recordId) {
          this.crud.uploadDocumentFile('technical-inspection', recordId, this.selectedFile).subscribe({
            next: (res: any) => {
              if (res?.path) this.crud.update('suivi-technique', recordId, { filePath: res.path }).subscribe({ next: finish, error: finish });
              else finish();
            },
            error: finish,
          });
        } else { finish(); }
      },
      error: () => { this.isSubmitting = false; },
    });
  }

  confirmDelete(): void {
    if (!this.deleteId) return;
    this.crud.remove('suivi-technique', this.deleteId).subscribe({
      next: () => { this.closeModal(); this.load(); this.carRefresh.emit(); },
      error: () => { this.closeModal(); },
    });
  }

  daysUntil(dateStr: string | null | undefined): number | null { return daysUntilUtil(dateStr); }

  fileUrl(path: string): string { return environment.serverUrl + path; }

  resultatLabel(value: string | null | undefined): string {
    return this.RESULTATS.find(r => r.value === value)?.label ?? '—';
  }

  resultatClass(value: string | null | undefined): string {
    if (value === 'favorable') return 'res-favorable';
    if (value === 'favorable_avec_reserve') return 'res-reserve';
    if (value === 'defavorable') return 'res-defavorable';
    return 'res-pending';
  }

  t(key: string): string { return this.ts.translate(key); }
}
