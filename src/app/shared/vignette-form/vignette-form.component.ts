import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroupDirective, ControlContainer, FormGroup } from '@angular/forms';
import { Subscription } from 'rxjs';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { environment } from '../../../environments/environment';
import { UploadBtnComponent } from '../btn/upload-btn.component';

@Component({
  selector: 'app-vignette-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslatePipe, UploadBtnComponent],
  viewProviders: [{ provide: ControlContainer, useExisting: FormGroupDirective }],
  templateUrl: './vignette-form.component.html',
  styleUrls: ['./vignette-form.component.css'],
})
export class VignetteFormComponent implements OnInit, OnDestroy {
  @Input() isEditing = false;
  @Input() paiementCount = 0;
  @Input() showMontant = true;
  @Input() showMontantPaye = true;
  @Input() showFileUpload = true;
  @Input() errorMessage: string | null = null;
  @Input() existingFilePath: string | null = null;

  @Output() fileChanged = new EventEmitter<File | null>();

  selectedFile: File | null = null;
  filePreview: string | null = null;

  private readonly cc = inject(ControlContainer);
  private anneeSub?: Subscription;
  get form(): FormGroup { return this.cc.control as FormGroup; }

  get reste(): number {
    const m = +(this.form?.get('montant')?.value     ?? 0);
    const p = +(this.form?.get('montantPaye')?.value ?? 0);
    return Math.max(0, m - p);
  }

  get montantPayeReadonly(): boolean { return this.isEditing && this.paiementCount > 0; }

  get hasExceedsTotalError(): boolean {
    return !!(this.form?.hasError('exceedsTotal') && this.form?.get('montantPaye')?.dirty);
  }

  ngOnInit(): void {
    this.anneeSub = this.form?.get('annee')?.valueChanges.subscribe(y => {
      if (y) this.form.get('dateLimite')?.setValue(`${+y + 1}-01-31`, { emitEvent: false });
    });
  }

  ngOnDestroy(): void {
    this.anneeSub?.unsubscribe();
  }

  onFileChange(file: File): void {
    this.selectedFile = file;
    this.filePreview  = null;
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = e => { this.filePreview = e.target?.result as string; };
      reader.readAsDataURL(file);
    }
    this.fileChanged.emit(file);
  }

  clearFile(): void {
    this.selectedFile = null;
    this.filePreview  = null;
    this.fileChanged.emit(null);
  }

  getFileUrl(path: string): string {
    return environment.serverUrl + path;
  }

  isPdf(path: string): boolean {
    return (path || '').toLowerCase().endsWith('.pdf');
  }
}
