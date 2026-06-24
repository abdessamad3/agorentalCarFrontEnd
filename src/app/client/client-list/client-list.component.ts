import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, of } from 'rxjs';
import { debounceTime, switchMap, takeUntil, catchError } from 'rxjs/operators';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { TranslationService } from '../../services/translation.service';
import { CrudService } from '../../services/crud.service';
import { ClientDocumentsComponent } from '../client-documents/client-documents.component';
import { BtnComponent } from '../../shared/btn/btn.component';
import { PaginatorComponent } from '../../shared/paginator/paginator.component';
import { NATIONALITES, NationaliteEntry } from '../../shared/constants/nationalites';
import { debtRiskClass } from '../../shared/utils/debt.utils';

@Component({
  selector: 'app-client-list',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, TranslatePipe, ClientDocumentsComponent, BtnComponent, PaginatorComponent],
  templateUrl: './client-list.component.html',
  styleUrls: ['../../shared/styles/crud-list.css']
})
export class ClientListComponent implements OnInit, OnDestroy {
  items: any[] = [];
  loading = true;
  error = '';
  dir = 'ltr';
  search = '';
  filterNationalite = '';
  modalMode: 'form' | 'delete' | null = null;
  selected: any = null;
  form: FormGroup;
  isSubmitting = false;
  deleteId: number | null = null;
  isEditing = false;
  /** Both Add and Edit are the same 3-step wizard: personal info -> document numbers/dates ->
   *  document photos (the photos step needs a real client id, which Add only gets once
   *  'info'+'cards' are saved; Edit already has one). */
  formStep: 'info' | 'cards' | 'documents' = 'info';
  createdId: number | null = null;

  private readonly infoStepControls = [
    'nom', 'prenom', 'telephone', 'nationalite', 'email', 'telephoneEtranger',
    'dateNaissance', 'lieuNaissance', 'adresseMaroc', 'adresseEtranger',
  ];

  readonly nationalitesList = NATIONALITES;
  nationaliteDropdownOpen = false;
  readonly endpoint = 'client';
  readonly objectEntries = Object.entries;
  readonly debtRiskClass = debtRiskClass;

  page = 1;
  limit = 20;
  total = 0;

  drawerOpen = false;
  drawerItem: any = null;

  private searchSubject = new Subject<void>();
  private destroy$ = new Subject<void>();

  constructor(
    private crud: CrudService,
    private ts: TranslationService,
    private fb: FormBuilder,
    private router: Router,
  ) {
    this.form = this.fb.group({
      nom:                  ['', Validators.required],
      prenom:               ['', Validators.required],
      telephone:            ['', Validators.required],
      cin:                  ['', Validators.required],
      cinExpiration:        [''],
      cinDelivreLe:         [''],
      cinDelivreA:          [''],
      passeport:            [''],
      passeportExpiration:  [''],
      passeportDelivreLe:   [''],
      passeportDelivreA:    [''],
      permisConduite:       ['', Validators.required],
      permisExpiration:     [''],
      permisDelivreLe:      [''],
      permisDelivreA:       [''],
      nationalite:          ['', Validators.required],
      email:                ['', Validators.email],
      dateNaissance:        [''],
      lieuNaissance:        [''],
      telephoneEtranger:    [''],
      adresseMaroc:         ['', Validators.required],
      adresseEtranger:      [''],
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
    ).subscribe(r => { if (r) { this.items = r.data ?? []; this.total = r.meta?.total ?? this.items.length; } this.loading = false; });
    this.load();
  }

  ngOnDestroy() { this.destroy$.next(); this.destroy$.complete(); }

  load() {
    this.loading = true; this.error = '';
    this.crud.getPage(this.endpoint, { page: this.page, limit: this.limit, search: this.search }).subscribe({
      next: r => {
        this.items = r.data ?? [];
        this.total = r.meta?.total ?? this.items.length;
        this.loading = false;
      },
      error: () => { this.error = this.ts.translate('loadError'); this.loading = false; }
    });
  }

  get nationalites(): string[] {
    const set = new Set<string>();
    this.items.forEach(i => { if (i.nationalite) set.add(i.nationalite); });
    return Array.from(set).sort();
  }

  get filtered() {
    if (!this.filterNationalite) return this.items;
    return this.items.filter(i => i.nationalite === this.filterNationalite);
  }

  get paged(): any[] { return this.filtered; }

  onSearch(): void { this.page = 1; this.searchSubject.next(); }
  onPageChange(p: number): void { this.page = p; this.load(); }

  private static normalize(s: string): string {
    return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  }

  /** Label shown/searched in the active UI language — Arabic input matches the Arabic label, etc. */
  private nationaliteLabel(entry: NationaliteEntry): string {
    const lang = this.ts.getCurrentLanguage();
    return (lang === 'ar' ? entry.ar : lang === 'en' ? entry.en : entry.fr) || entry.fr;
  }

  get filteredNationalites(): string[] {
    const labels = this.nationalitesList.map(n => this.nationaliteLabel(n));
    const q = ClientListComponent.normalize((this.form.get('nationalite')?.value || '').trim());
    if (!q) return labels;
    return labels.filter(label => ClientListComponent.normalize(label).includes(q));
  }

  selectNationalite(n: string): void {
    this.form.get('nationalite')?.setValue(n);
    this.nationaliteDropdownOpen = false;
  }

  onNationaliteBlur(): void {
    // Delay so a click/mousedown on a dropdown item can register before the list closes.
    setTimeout(() => this.nationaliteDropdownOpen = false, 150);
  }

  openView(item: any)    { this.drawerItem = item; this.drawerOpen = true; }
  viewProfile(item: any) { this.router.navigate(['/client', item.id]); }
  openAdd()             { this.selected = null; this.isEditing = false; this.formStep = 'info'; this.createdId = null; this.form.reset(); this.modalMode = 'form'; }
  openEdit(item: any)   { this.selected = item; this.isEditing = true; this.formStep = 'info'; this.form.patchValue(item); this.modalMode = 'form'; }
  openDelete(id: number){ this.deleteId = id; this.modalMode = 'delete'; }
  closeModal()          { this.modalMode = null; this.selected = null; this.deleteId = null; this.isSubmitting = false; this.isEditing = false; this.formStep = 'info'; this.createdId = null; }
  closeDrawer()         { this.drawerOpen = false; this.drawerItem = null; }

  @HostListener('document:keydown.escape') onEscape() { this.closeModal(); this.closeDrawer(); }

  /** Edit now steps through info -> cards -> documents exactly like Add. */
  get showInfoFields(): boolean  { return this.formStep === 'info'; }
  get showCardsFields(): boolean { return this.formStep === 'cards'; }

  get isInfoStepValid(): boolean {
    return this.infoStepControls.every(name => this.form.get(name)?.valid ?? true);
  }

  goToCardsStep(): void {
    if (!this.isInfoStepValid) {
      this.infoStepControls.forEach(name => this.form.get(name)?.markAsTouched());
      return;
    }
    this.formStep = 'cards';
  }

  backToInfoStep(): void {
    this.formStep = 'info';
  }

  save() {
    if (this.form.invalid) return;
    this.isSubmitting = true;
    const req = this.isEditing
      ? this.crud.update(this.endpoint, this.selected.id, this.form.value)
      : this.crud.create(this.endpoint, this.form.value);
    req.subscribe({
      next: (res: any) => {
        this.isSubmitting = false;
        this.load();
        // Both Add and Edit move to the photos step after the cards step is saved —
        // needs a real client id, which already exists for Edit and only now for Add.
        this.createdId = this.isEditing ? this.selected.id : (res?.id ?? null);
        if (this.createdId) this.formStep = 'documents';
        else this.closeModal();
      },
      error: () => { this.isSubmitting = false; },
    });
  }

  confirmDelete() {
    if (!this.deleteId) return;
    this.crud.remove(this.endpoint, this.deleteId).subscribe({ next: () => { this.closeModal(); this.load(); }, error: () => this.closeModal() });
  }
  displayValue(val: any): string {
    if (val === null || val === undefined) return '-';
    if (typeof val === 'object') return val.nom || val.name || val.libelle || val.marque || val.titre || JSON.stringify(val);
    return String(val);
  }
}