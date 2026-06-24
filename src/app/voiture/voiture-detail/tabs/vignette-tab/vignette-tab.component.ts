import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { CrudService } from '../../../../services/crud.service';
import { TranslationService } from '../../../../services/translation.service';
import { VignetteModalComponent } from '../../../../shared/vignette-modal/vignette-modal.component';
import { PayDepPanelComponent } from '../../../../shared/pay-dep-panel/pay-dep-panel.component';
import { environment } from '../../../../../environments/environment';
import { daysUntil as daysUntilUtil } from '../../../../shared/utils/date.utils';
import { Vignette } from '../../../../models/compliance.model';

@Component({
  selector: 'app-vignette-tab',
  standalone: true,
  imports: [CommonModule, VignetteModalComponent, PayDepPanelComponent],
  templateUrl: './vignette-tab.component.html',
  styleUrls: ['../../voiture-detail.component.css'],
})
export class VignetteTabComponent implements OnChanges {
  @Input() carId!: number;
  @Input() car!: any;
  @Input() dir = 'ltr';
  @Output() carRefresh = new EventEmitter<void>();

  items: Vignette[] = [];
  loading = false;
  modalMode: 'form' | 'delete' | 'renew' | null = null;
  selectedItem: any = null;
  deleteId: number | null = null;
  isEditing = false;
  isSubmitting = false;
  errorMessage: string | null = null;

  // ── Payment panel ────────────────────────────────────────────────────────
  payPanelOpen = false;
  payRecord: any = null;

  constructor(private crud: CrudService, private ts: TranslationService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if ((changes['carId'] || changes['car']) && this.carId) this.load();
  }

  load(): void {
    this.loading = true;
    this.crud.getAll('vignette').pipe(catchError(() => of([]))).subscribe((data: any) => {
      const all: any[] = Array.isArray(data) ? data : (data?.data ?? []);
      this.items = all
        .filter((r: any) => (r.voitureId ?? r.voiture?.id) === this.carId)
        .sort((a: any, b: any) => (b.annee || 0) - (a.annee || 0));
      if (this.payPanelOpen && this.payRecord) {
        const fresh = this.items.find(i => i.id === this.payRecord.id);
        if (fresh) this.payRecord = fresh;
      }
      this.loading = false;
    });
  }

  // ── Payment panel ────────────────────────────────────────────────────────

  openPayPanel(item: any): void {
    this.payRecord    = item;
    this.payPanelOpen = true;
  }

  closePayPanel(): void {
    this.payPanelOpen = false;
    this.payRecord    = null;
  }

  openAdd(): void {
    this.selectedItem = null; this.isEditing = false; this.isSubmitting = false;
    this.errorMessage = null; this.deleteId = null; this.modalMode = 'form';
  }

  openEdit(item: any): void {
    this.selectedItem = item; this.isEditing = true; this.isSubmitting = false;
    this.errorMessage = null; this.deleteId = null; this.modalMode = 'form';
  }

  openDelete(item: any): void {
    this.selectedItem = item; this.deleteId = item.id;
    this.isSubmitting = false; this.modalMode = 'delete';
  }

  openRenew(item: any): void {
    this.selectedItem = item; this.deleteId = null;
    this.isSubmitting = false; this.modalMode = 'renew';
  }

  closeModal(): void {
    this.modalMode = null; this.selectedItem = null; this.deleteId = null;
    this.isEditing = false; this.isSubmitting = false; this.errorMessage = null;
  }

  onSaved(payload: { value: any; file: File | null }): void {
    if (!this.car) return;
    this.isSubmitting = true;
    this.errorMessage = null;
    const body: any = { voitureId: this.car.id };
    Object.entries(payload.value).forEach(([k, v]) => { if (v !== null && v !== '') body[k] = v; });
    const req = this.isEditing
      ? this.crud.update('vignette', this.selectedItem.id, body)
      : this.crud.create('vignette', body);
    req.subscribe({
      next: (created: any) => {
        const recordId = created?.id ?? (this.isEditing ? this.selectedItem?.id : null);
        this.closeModal();
        if (payload.file && recordId) {
          this.crud.uploadDocumentFile('vignette', recordId, payload.file).subscribe({
            next: (res: any) => { if (res?.path) this.crud.update('vignette', recordId, { filePath: res.path }).subscribe(); }
          });
        }
        this.load(); this.carRefresh.emit();
      },
      error: (err: any) => {
        this.isSubmitting = false;
        this.errorMessage = err?.error?.error === 'DUPLICATE_VIGNETTE' ? err.error.message : null;
      },
    });
  }

  onDeleteConfirmed(): void {
    if (!this.deleteId) return;
    this.isSubmitting = true;
    this.crud.remove('vignette', this.deleteId).subscribe({
      next: () => { this.closeModal(); this.load(); this.carRefresh.emit(); },
      error: () => { this.isSubmitting = false; this.closeModal(); },
    });
  }

  onRenewConfirmed(data: { annee: number; dateLimite: string; montant: number | null; montantPaye: number | null }): void {
    if (!this.selectedItem?.id) return;
    this.isSubmitting = true;
    const body: Record<string, any> = { annee: data.annee, dateLimite: data.dateLimite };
    if (data.montant != null) body['montant'] = data.montant;
    if (data.montantPaye != null) body['montantPaye'] = data.montantPaye;
    this.crud.customAction(`vignette/${this.selectedItem.id}/renew`, body).subscribe({
      next: () => { this.closeModal(); this.load(); this.carRefresh.emit(); },
      error: () => { this.isSubmitting = false; },
    });
  }

  daysUntil(d?: string | null): number | null { return daysUntilUtil(d); }

  fileUrl(path: string): string { return environment.serverUrl + path; }

  t(key: string): string { return this.ts.translate(key); }
}
