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
import { PAGE_SIZE } from '../../shared/constants/pagination';
import { StatusPipe } from '../../shared/pipes/status.pipe';

@Component({
  selector: 'app-contrat-list',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule, TranslatePipe, PrintContratComponent, VehicleDeliveryFormComponent, VehicleReturnFormComponent, BtnComponent, PaginatorComponent, StatusPipe],
  templateUrl: './contrat-list.component.html',
  styleUrls: ['../../shared/styles/crud-list.css', './contrat-list.component.css']
})
export class ContratListComponent implements OnInit, OnDestroy {
  items: any[] = [];
  loading = true; error = ''; dir = 'ltr'; search = '';
  page = 1; limit = PAGE_SIZE; total = 0;
  modalMode: 'form' | 'delete' | null = null;
  form: FormGroup; isSubmitting = false; deleteId: number | null = null;
  printItem: any = null;
  printLoading = false;
  autoDownloadPdf = false;
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
    this.autoDownloadPdf = false;
    this.printLoading = true;
    this.crud.getById('contrat', item.id + '/full').subscribe({
      next: (full: any) => { this.printItem = this.adaptFull(full); this.printLoading = false; },
      error: () => { this.printItem = item; this.printLoading = false; }
    });
  }

  onPrintClosed() { this.printItem = null; this.autoDownloadPdf = false; }

  private adaptFull(data: any): any {
    const c    = data.contrat;
    const res  = c?.reservation;
    const cli  = res?.client;
    const voit = res?.voiture;
    const d2   = c?.deuxiemeChauffeur;
    const del  = data.vehicleDelivery;
    const ret  = data.vehicleReturnInspection;
    return {
      numeroContrat: c?.numero, id: c?.id,
      dateDebut: res?.dateDebut, dateFin: res?.dateFin,
      faitA: c?.faitA, signedAt: c?.signedAt,
      montantTotal: res?.total, montantPaye: res?.montantPaye,
      prixParJour: res?.prixParJour ?? c?.prixParJourSnapshot,
      nbJoursFactures: c?.nbJoursFactures, remise: c?.remise,
      franchise: c?.franchise, hasCaution: c?.hasCaution, cautionMontant: c?.cautionMontant,
      lieuLivraison: res?.lieuLivraison, lieuRetour: res?.lieuRetour,
      client: cli ? {
        nom: cli.nom, prenom: '',
        dateNaissance: cli.dateNaissance, lieuNaissance: cli.lieuNaissance,
        nationalite: cli.nationalite,
        adresseMaroc: cli.adresseMaroc, adresseEtranger: cli.adresseEtranger,
        telephone: cli.telephone, telephoneEtranger: cli.telephoneEtranger,
        cin: cli.cin,
        permisConduite: cli.permisConduite, permisDelivreLe: cli.permisDelivreLe, permisDelivreA: cli.permisDelivreA,
        passeport: cli.passeport, passeportDelivreLe: cli.passeportDelivreLe, passeportDelivreA: cli.passeportDelivreA,
      } : {},
      deuxiemeChauffeur: d2 ? {
        nom: d2.nom, dateNaissance: d2.dateNaissance, nationalite: d2.nationalite,
        adresseMaroc: d2.adresseMaroc, telephone: d2.telephone, cin: d2.cin,
        permisConduite: d2.permisConduite, permisDelivreLe: d2.permisDelivreLe, permisDelivreA: d2.permisDelivreA,
        passeport: d2.passeport, passeportDelivreLe: d2.passeportDelivreLe, passeportDelivreA: d2.passeportDelivreA,
      } : null,
      voiture: voit ? {
        marque: voit.marque, modele: voit.modele, immatriculation: voit.immatriculation,
        kilometrageActuel: del?.mileageOut ?? voit.kilometrageActuel,
        prixJour: res?.prixParJour ?? c?.prixParJourSnapshot ?? voit.prixJour,
      } : {},
      vehicleDelivery: del ?? null,
      vehicleReturnInspection: ret ?? null,
    };
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
    this.autoDownloadPdf = true;
    this.printLoading = true;
    this.crud.getById('contrat', item.id + '/full').subscribe({
      next: (full: any) => { this.printItem = this.adaptFull(full); this.printLoading = false; },
      error: () => { this.printLoading = false; this.autoDownloadPdf = false; this.toast.show(this.ts.translate('pdfGenerationError'), 'error'); }
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
