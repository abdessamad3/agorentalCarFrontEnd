import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CrudService } from '../../../../services/crud.service';
import { TranslationService } from '../../../../services/translation.service';
import { InsuranceModalComponent, InsuranceSavePayload } from '../../../../shared/insurance-modal/insurance-modal.component';
import { PayDepPanelComponent } from '../../../../shared/pay-dep-panel/pay-dep-panel.component';
import { environment } from '../../../../../environments/environment';
import { daysUntil as daysUntilUtil } from '../../../../shared/utils/date.utils';
import { Assurance } from '../../../../models/compliance.model';

@Component({
  selector: 'app-insurance-tab',
  standalone: true,
  imports: [CommonModule, InsuranceModalComponent, PayDepPanelComponent],
  templateUrl: './insurance-tab.component.html',
  styleUrls: ['../../voiture-detail.component.css'],
})
export class InsuranceTabComponent implements OnChanges {
  @Input() carId!: number;
  @Input() car!: any;
  @Input() dir = 'ltr';
  @Output() carRefresh = new EventEmitter<void>();

  /** At most one current (non-archived, non-cancelled) policy per car. */
  current: Assurance | null = null;
  loading = false;

  historyItems: Assurance[] = [];
  historyExpanded = false;
  historyLoading = false;
  historyLoaded = false;

  modalMode: 'add' | 'edit' | 'delete' | 'renew' | 'cancel' | null = null;
  selectedItem: any = null;
  deleteId: number | null = null;
  isSubmitting = false;
  errorMessage: string | null = null;

  // ── Payment panel ────────────────────────────────────────────────────────
  payPanelOpen = false;
  payRecord: any = null;

  constructor(
    private crud: CrudService,
    private ts: TranslationService,
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if ((changes['carId'] || changes['car']) && this.carId) {
      this.historyLoaded = false;
      this.historyExpanded = false;
      this.load();
    }
  }

  load(): void {
    this.loading = true;
    this.crud.getAll('assurance', { voitureId: this.carId, limit: 5 }).subscribe({
      next: (r: any) => {
        const all: any[] = Array.isArray(r) ? r : (r?.data ?? []);
        const mine = all.filter((i: any) => (i.voitureId ?? i.voiture?.id) === this.carId);
        this.current = mine[0] ?? null;
        if (this.payPanelOpen && this.payRecord && this.current?.id === this.payRecord.id) {
          this.payRecord = this.current;
        }
        this.loading = false;
      },
      error: () => { this.loading = false; },
    });
    if (this.historyExpanded) this.loadHistory();
  }

  toggleHistory(): void {
    this.historyExpanded = !this.historyExpanded;
    if (this.historyExpanded && !this.historyLoaded) this.loadHistory();
  }

  loadHistory(): void {
    this.historyLoading = true;
    this.crud.getAll('assurance', { voitureId: this.carId, historyOnly: 1, limit: 200 }).subscribe({
      next: (r: any) => {
        const all: any[] = Array.isArray(r) ? r : (r?.data ?? []);
        this.historyItems = all.filter((i: any) => (i.voitureId ?? i.voiture?.id) === this.carId);
        this.historyLoaded = true;
        this.historyLoading = false;
      },
      error: () => { this.historyLoading = false; },
    });
  }

  openAdd():          void { this.selectedItem = null; this.deleteId = null; this.isSubmitting = false; this.errorMessage = null; this.modalMode = 'add'; }
  openEdit(i: any):   void { this.selectedItem = i;    this.deleteId = null; this.isSubmitting = false; this.errorMessage = null; this.modalMode = 'edit'; }
  openDelete(i: any): void { this.selectedItem = i;    this.deleteId = i.id; this.isSubmitting = false; this.errorMessage = null; this.modalMode = 'delete'; }
  openRenew(i: any):  void { this.selectedItem = i;    this.deleteId = null; this.isSubmitting = false; this.errorMessage = null; this.modalMode = 'renew'; }
  openCancel(i: any): void { this.selectedItem = i;    this.deleteId = null; this.isSubmitting = false; this.errorMessage = null; this.modalMode = 'cancel'; }
  closeModal():       void { this.modalMode = null; this.selectedItem = null; this.deleteId = null; this.isSubmitting = false; this.errorMessage = null; }

  private refreshAfterChange(): void {
    this.historyLoaded = false;
    this.load();
    this.carRefresh.emit();
  }

  onSaved(payload: InsuranceSavePayload): void {
    if (!this.car) return;
    this.isSubmitting = true;
    this.errorMessage = null;
    const isEdit = this.modalMode === 'edit' && !!this.selectedItem?.id;
    const raw  = { ...payload.value, voitureId: this.car.id };
    const body = Object.fromEntries(Object.entries(raw).filter(([, v]) => v !== null && v !== ''));
    const req  = isEdit
      ? this.crud.update('assurance', this.selectedItem.id, body)
      : this.crud.create('assurance', body);
    req.subscribe({
      next: (saved: any) => {
        const recordId = saved?.id ?? this.selectedItem?.id;
        this.closeModal();
        const finish = () => { this.refreshAfterChange(); };
        if (payload.file && recordId) {
          this.crud.uploadDocumentFile('insurance', recordId, payload.file).subscribe({
            next: (res: any) => {
              if (res?.path) this.crud.update('assurance', recordId, { filePath: res.path }).subscribe({ next: finish, error: finish });
              else finish();
            },
            error: finish,
          });
        } else { finish(); }
      },
      error: (err: any) => { this.isSubmitting = false; this.errorMessage = err?.error?.message || err?.error?.error || null; },
    });
  }

  onDeleteConfirmed(): void {
    if (!this.deleteId) return;
    this.isSubmitting = true;
    this.crud.remove('assurance', this.deleteId).subscribe({
      next: () => { this.closeModal(); this.refreshAfterChange(); },
      error: (err: any) => {
        this.isSubmitting = false;
        this.errorMessage = err?.error?.message || err?.error?.error || null;
      },
    });
  }

  onCancelConfirmed(): void {
    if (!this.selectedItem?.id) return;
    this.isSubmitting = true;
    this.crud.customAction(`assurance/${this.selectedItem.id}/cancel`, {}).subscribe({
      next: () => { this.closeModal(); this.refreshAfterChange(); },
      error: (err: any) => {
        this.isSubmitting = false;
        this.errorMessage = err?.error?.message || err?.error?.error || null;
      },
    });
  }

  onRenewConfirmed(data: { dateDebut: string; dateFin: string; montant: number | null }): void {
    if (!this.selectedItem?.id) return;
    this.isSubmitting = true;
    const body: Record<string, any> = { dateDebut: data.dateDebut, dateFin: data.dateFin };
    if (data.montant != null) body['montant'] = data.montant;
    this.crud.customAction(`assurance/${this.selectedItem.id}/renew`, body).subscribe({
      next: () => { this.closeModal(); this.refreshAfterChange(); },
      error: (err: any) => {
        this.isSubmitting = false;
        this.errorMessage = err?.error?.message || err?.error?.error || null;
      },
    });
  }

  // ── Payment panel ─────────────────────────────────────────────────────────

  openPayPanel(item: any): void {
    this.payRecord   = item;
    this.payPanelOpen = true;
  }

  closePayPanel(): void {
    this.payPanelOpen = false;
    this.payRecord    = null;
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  daysUntil(d?: string | null): number | null { return daysUntilUtil(d); }

  statusClass(item: any): string {
    const s = (item?.status || '').toLowerCase();
    if (s === 'active' || s === 'valid') return 'ins-active';
    if (s === 'upcoming')                 return 'ins-upcoming';
    if (s === 'expired')                  return 'ins-expired';
    if (s === 'cancelled')                return 'ins-cancelled';
    return 'ins-archived';
  }

  statusLabel(item: any): string {
    const s = (item?.status || '').toLowerCase();
    if (s === 'upcoming')  return this.t('upcoming');
    if (s === 'expired')   return this.t('expired');
    if (s === 'cancelled') return this.t('cancelled');
    if (s === 'archived')  return this.t('superseded');
    return this.t('active');
  }

  fileUrl(path: string): string { return environment.serverUrl + path; }

  get carTitle(): string { return this.car ? `${this.car.marque} ${this.car.modele}` : ''; }
  t(key: string): string { return this.ts.translate(key); }
}
