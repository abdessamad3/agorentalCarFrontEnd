import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { TranslationService } from '../../services/translation.service';
import { CrudService } from '../../services/crud.service';
import { ExportService } from '../../services/export.service';
import { InvoiceService } from '../../services/invoice.service';
import { PaginatorComponent } from '../../shared/paginator/paginator.component';
import { BtnComponent } from '../../shared/btn/btn.component';
import { Router } from '@angular/router';
import { Subject, forkJoin, of } from 'rxjs';
import { debounceTime, switchMap, takeUntil, catchError } from 'rxjs/operators';
import { PAGE_SIZE } from '../../shared/constants/pagination';
import { StatusPipe } from '../../shared/pipes/status.pipe';

@Component({
  selector: 'app-reservation-list',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule, TranslatePipe, PaginatorComponent, BtnComponent, StatusPipe],
  templateUrl: './reservation-list.component.html',
  styleUrls: ['./reservation-list.component.css']
})
export class ReservationListComponent implements OnInit, OnDestroy {
  items: any[] = [];
  clients: any[] = [];
  voitures: any[] = [];
  accessoires: any[] = [];
  loading = true;
  error = '';
  dir = 'ltr';
  search = '';
  page = 1; limit = PAGE_SIZE; total = 0;

  modalMode: 'view' | 'form' | 'delete' | null = null;
  selected: any = null;
  form: FormGroup;
  isSubmitting = false;
  deleteId: number | null = null;
  isEditing = false;
  readonly objectEntries = Object.entries;
  readonly endpoint = 'reservation';

  filterStatus = '';

  private searchSubject = new Subject<void>();
  private destroy$ = new Subject<void>();

  constructor(
    private crud: CrudService,
    private ts: TranslationService,
    private fb: FormBuilder,
    private exportSvc: ExportService,
    private invoiceSvc: InvoiceService,
    private router: Router,
  ) {
    this.form = this.fb.group({
      clientId:          ['', Validators.required],
      voitureId:         ['', Validators.required],
      dateDebut:         [''],
      dateFin:           [''],
      reservationStatus: ['confirmee'],
      modePaiement:      ['especes'],
      total:             [0],
      montantPaye:       [0, [Validators.min(0)]],
    });
  }

  ngOnInit() {
    this.ts.direction$.subscribe(d => this.dir = d);
    this.loadRefData();
    this.searchSubject.pipe(
      debounceTime(300),
      switchMap(() => {
        this.loading = true; this.error = '';
        const params: Record<string, any> = { page: this.page, limit: this.limit, search: this.search };
        if (this.filterStatus) params['status'] = this.filterStatus;
        return this.crud.getPage(this.endpoint, params).pipe(
          catchError(() => { this.error = this.ts.translate('loadError'); return of(null); })
        );
      }),
      takeUntil(this.destroy$)
    ).subscribe(r => { if (r) { this.items = r.data ?? []; this.total = r.meta?.total ?? this.items.length; } this.loading = false; });
    this.load();
  }

  ngOnDestroy() { this.destroy$.next(); this.destroy$.complete(); }

  loadRefData() {
    forkJoin({
      clients:     this.crud.getPage('client').pipe(catchError(() => of({ data: [] } as any))),
      voitures:    this.crud.getAll('voiture').pipe(catchError(() => of([]))),
      accessoires: this.crud.getAll('accessoire').pipe(catchError(() => of([]))),
    }).subscribe(({ clients, voitures, accessoires }) => {
      this.clients     = (clients as any)?.data ?? [];
      this.voitures    = Array.isArray(voitures)    ? voitures    : (voitures    as any)?.data ?? [];
      this.accessoires = Array.isArray(accessoires) ? accessoires : (accessoires as any)?.data ?? [];
    });
  }

  load() {
    this.loading = true;
    this.error = '';
    const params: Record<string, any> = { page: this.page, limit: this.limit, search: this.search };
    if (this.filterStatus) params['status'] = this.filterStatus;
    this.crud.getPage(this.endpoint, params).subscribe({
      next: r => {
        this.items = r.data ?? [];
        this.total = r.meta?.total ?? this.items.length;
        this.loading = false;
        this.autoCleanExpiredPending();
      },
      error: () => { this.error = this.ts.translate('loadError'); this.loading = false; }
    });
  }

  private autoCleanExpiredPending(): void {
    const now = new Date();
    const expired = this.items.filter(r => {
      const s = (r.reservationStatus || r.statut || '').toLowerCase();
      return (s === 'pending' || s === 'en_attente') && new Date(r.dateDebut) < now;
    });
    if (!expired.length) return;
    forkJoin(expired.map(r => this.crud.update(this.endpoint, r.id, { reservationStatus: 'annulee' })
      .pipe(catchError(() => of(null)))
    )).subscribe(() => this.load());
  }

  isUrgentPending(r: any): boolean {
    const s = (r.reservationStatus || r.statut || '').toLowerCase();
    if (s !== 'pending' && s !== 'en_attente') return false;
    const hoursUntil = (new Date(r.dateDebut).getTime() - Date.now()) / (1000 * 60 * 60);
    return hoursUntil >= 0 && hoursUntil <= 24;
  }

  onSearch(): void { this.page = 1; this.searchSubject.next(); }
  onFilterChange(): void { this.page = 1; this.load(); }
  onPageChange(p: number): void { this.page = p; this.load(); }

  get filteredItems(): any[] { return this.items; }

  getStatus(r: any): string {
    return (r.reservationStatus || r.statut || '').toLowerCase();
  }

  get activeContracts(): any[] {
    const today = new Date();
    return this.filteredItems.filter(r => {
      const start = new Date(r.dateDebut);
      const end   = new Date(r.dateFin);
      const s     = this.getStatus(r);
      return start <= today && end >= today && s !== 'annulee' && s !== 'cancelled';
    });
  }

  get upcomingDepartures(): any[] {
    const today = new Date();
    return this.filteredItems.filter(r => {
      const start = new Date(r.dateDebut);
      const s     = this.getStatus(r);
      return start > today && s !== 'annulee' && s !== 'cancelled';
    });
  }

  get historicalRecords(): any[] {
    const today = new Date();
    return this.filteredItems.filter(r => {
      const end = new Date(r.dateFin);
      const s   = this.getStatus(r);
      return end < today || s === 'annulee' || s === 'cancelled';
    });
  }

  get histCompleted(): any[] {
    return this.historicalRecords.filter(r =>
      ['terminee', 'terminee_avant_terme', 'completed', 'done', 'termine'].includes(this.getStatus(r))
    );
  }

  get histUnclosed(): any[] {
    return this.historicalRecords.filter(r => {
      const s = this.getStatus(r);
      return !['terminee', 'terminee_avant_terme', 'completed', 'done', 'termine',
               'annulee', 'cancelled', 'annule'].includes(s);
    });
  }

  get histCancelled(): any[] {
    return this.historicalRecords.filter(r => this.isCancelled(r));
  }

  openView(item: any) { this.selected = item; this.modalMode = 'view'; }

  openAdd() {
    this.selected  = null;
    this.isEditing = false;
    this.form.reset({ reservationStatus: 'confirmee', modePaiement: 'especes', total: 0, montantPaye: 0 });
    this.modalMode = 'form';
  }

  openEdit(item: any) {
    this.selected  = item;
    this.isEditing = true;
    this.form.patchValue({
      clientId:          item.client?.id  ?? item.clientId  ?? '',
      voitureId:         item.voiture?.id ?? item.voitureId ?? '',
      dateDebut:         item.dateDebut   ?? '',
      dateFin:           item.dateFin     ?? '',
      reservationStatus: item.reservationStatus || item.statut || 'confirmee',
      modePaiement:      item.modePaiement || 'especes',
      total:             item.total ?? item.montant ?? 0,
      montantPaye:       item.montantPaye ?? 0,
    });
    this.modalMode = 'form';
  }

  openDelete(id: number) { this.deleteId = id; this.modalMode = 'delete'; }

  closeModal() {
    this.modalMode    = null;
    this.selected     = null;
    this.deleteId     = null;
    this.isSubmitting = false;
    this.isEditing    = false;
  }

  @HostListener('document:keydown.escape') onEscape() { this.closeModal(); }

  save() {
    if (this.form.invalid) return;
    this.isSubmitting = true;
    const req = this.isEditing
      ? this.crud.update(this.endpoint, this.selected.id, this.form.value)
      : this.crud.create(this.endpoint, this.form.value);
    req.subscribe({
      next:  () => { this.closeModal(); this.load(); },
      error: () => { this.isSubmitting = false; }
    });
  }

  confirmDelete() {
    if (!this.deleteId) return;
    this.crud.remove(this.endpoint, this.deleteId).subscribe({
      next:  () => { this.closeModal(); this.load(); },
      error: () => this.closeModal()
    });
  }

  daysLeft(dateFin: string): number {
    const end   = new Date(dateFin);
    const today = new Date();
    return Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  }

  isCancelled(r: any): boolean {
    const s = this.getStatus(r);
    return s === 'annulee' || s === 'cancelled';
  }

  restoringId: number | null = null;

  restoreReservation(r: any): void {
    this.restoringId = r.id;
    this.crud.update(this.endpoint, r.id, { reservationStatus: 'confirmee' }).subscribe({
      next:  () => { this.restoringId = null; this.load(); },
      error: () => { this.restoringId = null; }
    });
  }

  getAccessoireLabels(r: any): string {
    if (r.accessoires && Array.isArray(r.accessoires) && r.accessoires.length) {
      return r.accessoires.map((a: any) => a.nom || a.name || a).join(', ');
    }
    const ids: number[] = r.accessoireIds || [];
    if (!ids.length) return '—';
    return ids.map(id => {
      const a = this.accessoires.find(x => x.id === id);
      return a ? a.nom : `#${id}`;
    }).join(', ');
  }

  get editRemaining(): number {
    const total = parseFloat(this.form.get('total')?.value || 0);
    const paid  = parseFloat(this.form.get('montantPaye')?.value || 0);
    return total - paid;
  }

  remaining(r: any): number {
    if (this.isCancelled(r)) return 0;
    const total = parseFloat(r.total || r.montant || 0);
    const paid  = parseFloat(r.montantPaye || 0);
    return Math.max(0, total - paid);
  }

  paymentStatusKey(r: any): 'paid' | 'partial' | 'unpaid' {
    if (this.isCancelled(r)) return 'paid';
    const total = parseFloat(r.total || r.montant || 0);
    const paid  = parseFloat(r.montantPaye || 0);
    if (total > 0 && paid >= total) return 'paid';
    if (paid > 0 && paid < total)  return 'partial';
    return 'unpaid';
  }

  paymentStatusLabel(r: any): string { return this.t(this.paymentStatusKey(r)); }
  paymentStatusClass(r: any): string { return 'chip-pay-' + this.paymentStatusKey(r); }

  exportReceipt(r: any)   { this.exportSvc.reservationReceipt(r); }
  generateInvoice(r: any) { this.invoiceSvc.generateForReservation(r.id); }

  goToDossier(item: any): void {
    this.router.navigate(['/location', item.id]);
  }

  goToContrat(item: any): void {
    if (item.contratId) {
      this.router.navigate(['/contrat', item.contratId, 'edit']);
    } else {
      this.router.navigate(['/contrat', 'new'], { queryParams: { reservationId: item.id } });
    }
  }

  deliveryStatus(r: any): string {
    if (r.vehicleDeliveryId || r.hasDelivery) return 'done';
    const s = (r.reservationStatus || '').toLowerCase();
    if (s === 'en_cours' || s === 'terminee') return 'done';
    return 'pending';
  }

  returnStatus(r: any): string {
    if (r.vehicleReturnInspectionId || r.hasReturn) return 'done';
    const s = (r.reservationStatus || '').toLowerCase();
    if (s === 'terminee') return 'done';
    return 'pending';
  }

  t(key: string) { return this.ts.translate(key); }

  displayValue(val: any): string {
    if (val === null || val === undefined) return '-';
    if (typeof val === 'object') return val.nom || val.name || val.libelle || val.marque || val.titre || JSON.stringify(val);
    return String(val);
  }
}
