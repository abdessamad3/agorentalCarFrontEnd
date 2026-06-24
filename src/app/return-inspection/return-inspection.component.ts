import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { TranslationService } from '../services/translation.service';
import { CrudService } from '../services/crud.service';
import { ToastService } from '../services/toast.service';
import { BtnComponent } from '../shared/btn/btn.component';
import { PaginatorComponent } from '../shared/paginator/paginator.component';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Component({
  selector: 'app-return-inspection',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, BtnComponent, PaginatorComponent],
  templateUrl: './return-inspection.component.html',
  styleUrls: ['./return-inspection.component.css']
})
export class ReturnInspectionComponent implements OnInit {
  items: any[] = [];
  reservations: any[] = [];
  loading = true;
  error = '';
  dir = 'ltr';
  search = '';
  filterCondition = '';

  page = 1;
  limit = 20;

  modalMode: 'form' | 'delete' | 'view' | null = null;
  selected: any = null;
  form: FormGroup;
  isSubmitting = false;
  deleteId: number | null = null;
  isEditing = false;

  resSearch = '';
  resDropdownOpen = false;

  readonly conditionOptions = [
    { value: 'clean',        label: 'Clean' },
    { value: 'minor_damage', label: 'Minor Damage' },
    { value: 'major_damage', label: 'Major Damage' },
  ];

  constructor(
    private crud: CrudService,
    private ts: TranslationService,
    private fb: FormBuilder,
    private toast: ToastService,
  ) {
    this.form = this.fb.group({
      reservationId: ['', Validators.required],
      fuelLevel:     [50, [Validators.min(0), Validators.max(100)]],
      kilometrage:   [null],
      condition:     ['clean', Validators.required],
      damages:       [''],
      notes:         [''],
    });
  }

  total = 0;

  ngOnInit() {
    this.ts.direction$.subscribe(d => this.dir = d);
    forkJoin({
      items:        this.crud.getPage('vehicle-return-inspection', { page: this.page, limit: this.limit }).pipe(catchError(() => of({ data: [], meta: { total: 0 } }))),
      reservations: this.crud.getAll('reservation').pipe(catchError(() => of([]))),
    }).subscribe({
      next: ({ items, reservations }) => {
        this.items        = (items as any)?.data ?? [];
        this.total        = (items as any)?.meta?.total ?? 0;
        this.reservations = Array.isArray(reservations) ? reservations : (reservations as any)?.data ?? [];
        this.loading = false;
      },
      error: () => { this.error = 'Erreur de chargement.'; this.loading = false; }
    });
  }

  load() {
    this.loading = true; this.error = '';
    const params: Record<string, any> = { page: this.page, limit: this.limit };
    if (this.search.trim())    params['search']    = this.search;
    if (this.filterCondition)  params['condition'] = this.filterCondition;
    this.crud.getPage('vehicle-return-inspection', params).subscribe({
      next: r => { this.items = r.data ?? []; this.total = r.meta?.total ?? 0; this.loading = false; },
      error: () => { this.error = 'Erreur de chargement.'; this.loading = false; }
    });
  }

  get filtered(): any[] { return this.items; }

  get paged(): any[] { return this.items; }

  onSearch()               { this.page = 1; this.load(); }
  onPageChange(p: number)  { this.page = p; this.load(); }

  conditionLabel(val: string): string {
    return this.conditionOptions.find(o => o.value === val)?.label ?? val;
  }

  /** Reservations eligible for a return inspection: confirmed/active/completed, past dateFin, no inspection yet */
  private readonly INSPECTABLE_STATUSES = [
    'confirmed', 'confirmee',
    'active', 'en_cours', 'encours',
    'completed', 'terminee', 'done', 'termine',
  ];

  get availableReservations() {
    const usedIds = new Set(this.items.map(i => i.reservationId));
    const now = new Date();
    return this.reservations.filter(r =>
      !usedIds.has(r.id) &&
      r.dateFin && new Date(r.dateFin) <= now &&
      this.INSPECTABLE_STATUSES.includes((r.reservationStatus || '').toLowerCase())
    );
  }

  get filteredResOptions(): any[] {
    const q = this.resSearch.toLowerCase();
    return q
      ? this.availableReservations.filter(r => this.reservationLabel(r).toLowerCase().includes(q))
      : this.availableReservations;
  }

  get selectedReservationLabel(): string {
    const id = this.form.get('reservationId')?.value;
    if (!id) return '';
    const r = this.reservations.find(x => x.id === +id);
    return r ? this.reservationLabel(r) : `#${id}`;
  }

  openResDropdown() {
    this.resSearch = '';
    this.resDropdownOpen = true;
  }

  closeResDropdown() {
    setTimeout(() => {
      this.resDropdownOpen = false;
      this.resSearch = this.selectedReservationLabel;
    }, 160);
  }

  selectReservation(r: any) {
    this.form.patchValue({ reservationId: r.id });
    this.resSearch = this.reservationLabel(r);
    this.resDropdownOpen = false;
  }

  openAdd() {
    this.selected = null; this.isEditing = false;
    this.resSearch = ''; this.resDropdownOpen = false;
    this.form.reset({ fuelLevel: 50, condition: 'clean' });
    this.modalMode = 'form';
  }

  openEdit(item: any) {
    this.selected = item; this.isEditing = true;
    this.form.patchValue({
      reservationId: item.reservationId,
      fuelLevel:     item.fuelLevel ?? 50,
      kilometrage:   item.kilometrage,
      condition:     item.condition,
      damages:       item.damages || '',
      notes:         item.notes   || '',
    });
    this.form.get('reservationId')!.disable();
    this.modalMode = 'form';
  }

  openView(item: any)    { this.selected = item; this.modalMode = 'view'; }
  openDelete(id: number) { this.deleteId = id; this.modalMode = 'delete'; }

  closeModal() {
    this.modalMode = null; this.selected = null; this.deleteId = null;
    this.isSubmitting = false; this.isEditing = false;
    this.resSearch = ''; this.resDropdownOpen = false;
    this.form.get('reservationId')!.enable();
  }

  @HostListener('document:keydown.escape') onEscape() { this.closeModal(); }

  save() {
    if (this.form.invalid) return;
    this.isSubmitting = true;
    const raw = this.form.getRawValue();
    const payload: any = {
      fuelLevel:   raw.fuelLevel != null ? +raw.fuelLevel : null,
      kilometrage: raw.kilometrage != null ? +raw.kilometrage : null,
      condition:   raw.condition,
      damages:     raw.damages || null,
      notes:       raw.notes   || null,
    };
    if (!this.isEditing) payload['reservationId'] = +raw.reservationId;

    const req = this.isEditing
      ? this.crud.update('vehicle-return-inspection', this.selected.id, payload)
      : this.crud.create('vehicle-return-inspection', payload);

    req.subscribe({
      next: () => { this.closeModal(); this.load(); },
      error: (err) => {
        this.toast.show(err?.error?.error || 'Erreur lors de la sauvegarde.', 'error');
        this.isSubmitting = false;
      }
    });
  }

  confirmDelete() {
    if (!this.deleteId) return;
    this.crud.remove('vehicle-return-inspection', this.deleteId).subscribe({
      next: () => { this.closeModal(); this.load(); },
      error: () => { this.closeModal(); }
    });
  }

  fuelBar(level: number | null): string {
    if (level == null) return '0%';
    return level + '%';
  }

  fuelColor(level: number | null): string {
    if (level == null || level < 20) return '#e74c3c';
    if (level < 50)  return '#f39c12';
    return '#27ae60';
  }

  reservationLabel(r: any): string {
    const v      = r.voiture;
    const car    = (v && typeof v === 'object')
      ? `${v.marque ?? ''} ${v.modele ?? ''}`.trim() || `#${v.id}`
      : r.voitureNom || r.immatriculation || `#${r.voitureId}`;
    const cl     = r.client;
    const client = (cl && typeof cl === 'object')
      ? cl.nom || cl.prenom || `#${cl.id}`
      : r.clientNom || `#${r.clientId}`;
    const date   = r.dateFin ? new Date(r.dateFin).toLocaleDateString('fr-FR') : '';
    return `#${r.id} — ${car} / ${client}${date ? ' (' + date + ')' : ''}`;
  }
}
