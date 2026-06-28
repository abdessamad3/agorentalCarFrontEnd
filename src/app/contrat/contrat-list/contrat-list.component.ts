import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { TranslationService } from '../../services/translation.service';
import { CrudService } from '../../services/crud.service';
import { ContratService } from '../../services/contrat.service';
import { ExportService } from '../../services/export.service';
import { InvoiceService } from '../../services/invoice.service';
import { ToastService } from '../../services/toast.service';
import { PrintContratComponent } from '../print-contrat/print-contrat.component';
import { VehicleDeliveryFormComponent } from '../vehicle-delivery-form/vehicle-delivery-form.component';
import { VehicleReturnFormComponent } from '../vehicle-return-form/vehicle-return-form.component';
import { BtnComponent } from '../../shared/btn/btn.component';
import { PaginatorComponent } from '../../shared/paginator/paginator.component';
import { Subject, of } from 'rxjs';
import { debounceTime, switchMap, takeUntil, catchError } from 'rxjs/operators';

@Component({
  selector: 'app-contrat-list',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule, TranslatePipe, PrintContratComponent, VehicleDeliveryFormComponent, VehicleReturnFormComponent, BtnComponent, PaginatorComponent],
  templateUrl: './contrat-list.component.html',
  styleUrls: ['../../shared/styles/crud-list.css', './contrat-list.component.css']
})
export class ContratListComponent implements OnInit, OnDestroy {
  items: any[] = [];
  loading = true; error = ''; dir = 'ltr'; search = '';
  page = 1; limit = 20; total = 0;
  modalMode: 'form' | 'delete' | null = null;
  form: FormGroup; isSubmitting = false; deleteId: number | null = null;
  printItem: any = null;
  printLoading = false;
  readonly endpoint = 'contrat';
  readonly objectEntries = Object.entries;

  drawerOpen = false;
  drawerItem: any = null;

  deliveryItem: any  = null;
  returnItem: any    = null;
  deliveryData: any  = null;

  private searchSubject = new Subject<void>();
  private destroy$ = new Subject<void>();

  constructor(
    private crud: CrudService,
    private ts: TranslationService,
    private fb: FormBuilder,
    private exportSvc: ExportService,
    private invoiceSvc: InvoiceService,
    private contratService: ContratService,
    private toast: ToastService,
    private router: Router,
  ) {
    this.form = this.fb.group({
      clientId:     ['', Validators.required],
      voitureId:    ['', Validators.required],
      dateDebut:    [''],
      dateFin:      [''],
      montantTotal: [0]
    });
  }

  ngOnInit() {
    this.ts.direction$.subscribe(d => this.dir = d);
    this.searchSubject.pipe(
      debounceTime(300),
      switchMap(() => {
        this.loading = true; this.error = '';
        return this.crud.getPage(this.endpoint, { page: this.page, limit: this.limit, search: this.search }).pipe(
          catchError(() => { this.error = this.ts.translate('loadError'); return of(null); })
        );
      }),
      takeUntil(this.destroy$)
    ).subscribe(r => { if (r) { this.items = r.data ?? []; this.total = r.meta?.total ?? 0; } this.loading = false; });
    this.load();
  }

  ngOnDestroy() { this.destroy$.next(); this.destroy$.complete(); }

  load() {
    this.loading = true; this.error = '';
    this.crud.getPage(this.endpoint, { page: this.page, limit: this.limit, search: this.search }).subscribe({
      next: (r: any) => {
        this.items = r.data ?? [];
        this.total = r.meta?.total ?? 0;
        this.loading = false;
      },
      error: () => { this.error = this.ts.translate('loadError'); this.loading = false; }
    });
  }

  get filtered() { return this.items; }

  get paged(): any[] { return this.items; }

  onSearch(): void { this.page = 1; this.searchSubject.next(); }
  onPageChange(p: number): void { this.page = p; this.load(); }

  openView(item: any)    { this.drawerItem = item; this.drawerOpen = true; }
  openAdd()              { this.router.navigate(['/contrat', 'new']); }
  openEdit(item: any)    { this.router.navigate(['/contrat', item.id, 'edit']); }
  openDelete(id: number) { this.deleteId = id; this.modalMode = 'delete'; }
  openPrint(item: any) {
    this.printLoading = true;
    this.crud.getById('contrat', item.id + '/full').subscribe({
      next: (full: any) => { this.printItem = full; this.printLoading = false; },
      error: () => { this.printItem = item; this.printLoading = false; }
    });
  }
  exportPDF(item: any)   { this.exportSvc.rentalContract(item); }

  openDelivery(item: any) {
    this.deliveryItem = item.reservation;
    this.returnItem   = null;
  }

  openReturn(item: any) {
    this.returnItem   = item.reservation;
    this.deliveryItem = null;
    this.deliveryData = null;
    this.crud.getById('vehicle-delivery/contrat', item.id).subscribe({
      next: (d: any) => { this.deliveryData = d; },
      error: () => {}
    });
  }

  onDeliverySaved()  { this.deliveryItem = null; this.load(); }
  onDeliveryClosed() { this.deliveryItem = null; }
  onReturnSaved()    { this.returnItem = null; this.deliveryData = null; this.load(); }
  onReturnClosed()   { this.returnItem = null; this.deliveryData = null; }

  reservationStatus(item: any): string {
    return item.reservation?.reservationStatus ?? '';
  }
  generateInvoice(item: any) {
    const resId = item.reservationId ?? item.reservation?.id ?? item.id;
    if (resId) this.invoiceSvc.generateForReservation(resId);
  }

  downloadPdf(item: any) {
    this.contratService.downloadPdf(item.id).subscribe({
      next: (blob: Blob) => {
        const url  = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href  = url;
        link.download = `contrat-${item.numero || item.id}.pdf`;
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 5000);
      },
      error: () => this.toast.show('Erreur de génération PDF', 'error')
    });
  }
  closeModal()           { this.modalMode = null; this.deleteId = null; this.isSubmitting = false; }
  closeDrawer()          { this.drawerOpen = false; this.drawerItem = null; }

  @HostListener('document:keydown.escape') onEscape() { this.closeModal(); this.closeDrawer(); }

  save() {
    if (this.form.invalid) return;
    this.isSubmitting = true;
    this.crud.create(this.endpoint, this.form.value).subscribe({
      next: () => { this.closeModal(); this.load(); },
      error: () => { this.isSubmitting = false; }
    });
  }

  confirmDelete() {
    if (!this.deleteId) return;
    this.crud.remove(this.endpoint, this.deleteId).subscribe({
      next: () => { this.closeModal(); this.load(); },
      error: () => this.closeModal()
    });
  }

  displayValue(val: any): string {
    if (val === null || val === undefined) return '-';
    if (typeof val === 'object') return val.nom || val.name || val.libelle || val.marque || val.titre || JSON.stringify(val);
    return String(val);
  }
}
