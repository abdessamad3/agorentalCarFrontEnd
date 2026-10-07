import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { CrudService } from '../../services/crud.service';
import { TranslationService } from '../../services/translation.service';
import { BtnComponent } from '../../shared/btn/btn.component';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-reservation-edit',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule, BtnComponent],
  templateUrl: './reservation-edit.component.html',
  styleUrls: ['../../shared/styles/crud-list.css', './reservation-edit.component.css']
})
export class ReservationEditComponent implements OnInit {
  reservation: any = null;
  clients:     any[] = [];
  voitures:    any[] = [];
  accessoires: any[] = [];

  loading       = true;
  saving        = false;
  error         = '';
  conflictError = '';
  dir           = 'ltr';

  form: FormGroup;
  selectedAccessoireIds: number[] = [];

  /** Server-computed live preview -- never the form's own math. See reservation-create's
   *  identical pattern/comment for why (same bug class this whole feature replaces). */
  preview: { prixParJour: number; nbJours: number; accessoireTotal: number; total: number } | null = null;
  previewLoading = false;
  private previewTimer: any = null;

  constructor(
    private route:  ActivatedRoute,
    private router: Router,
    private crud:   CrudService,
    private ts:     TranslationService,
    private fb:     FormBuilder,
    private http:   HttpClient,
  ) {
    this.form = this.fb.group({
      clientId:          ['', Validators.required],
      voitureId:         ['', Validators.required],
      dateDebut:         ['', Validators.required],
      dateFin:           ['', Validators.required],
      reservationStatus: ['confirmee', Validators.required],
      modePaiement:      ['especes'],
      montantPaye:       [0, [Validators.min(0)]],
      remiseMontant:     [null, [Validators.min(0)]],
      remiseMotif:       [''],
    });
  }

  ngOnInit() {
    this.ts.direction$.subscribe(d => this.dir = d);
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) { this.router.navigate(['/reservation']); return; }

    forkJoin({
      reservation: this.crud.getById('reservation', +id).pipe(catchError(() => of(null))),
      clients:     this.crud.getAll('client').pipe(catchError(() => of([]))),
      voitures:    this.crud.getAll('voiture').pipe(catchError(() => of([]))),
      accessoires: this.crud.getAll('accessoire').pipe(catchError(() => of([])))
    }).subscribe(({ reservation, clients, voitures, accessoires }) => {
      if (!reservation) {
        this.error   = this.t('notFound');
        this.loading = false;
        return;
      }
      this.reservation = reservation;
      this.clients     = Array.isArray(clients)     ? clients     : (clients     as any)?.data ?? [];
      this.voitures    = Array.isArray(voitures)    ? voitures    : (voitures    as any)?.data ?? [];
      this.accessoires = Array.isArray(accessoires) ? accessoires : (accessoires as any)?.data ?? [];

      this.form.patchValue({
        clientId:          reservation.client?.id  ?? reservation.clientId  ?? '',
        voitureId:         reservation.voiture?.id ?? reservation.voitureId ?? '',
        dateDebut:         reservation.dateDebut   ?? '',
        dateFin:           reservation.dateFin     ?? '',
        reservationStatus: reservation.reservationStatus || 'confirmee',
        modePaiement:      reservation.modePaiement || 'especes',
        montantPaye:       reservation.montantPaye ?? 0,
        remiseMontant:     reservation.remiseMontant ?? null,
        remiseMotif:       reservation.remiseMotif ?? '',
      });

      const accIds: number[] = (reservation.accessoires ?? []).map((a: any) => a.id ?? a);
      this.selectedAccessoireIds = accIds;
      this.loading = false;
      this.refreshPreview();
    });

    // Live preview refreshes when dates or vehicle change (closed reservations' totals
    // are frozen server-side anyway, but the preview itself is harmless either way).
    this.form.get('dateDebut')?.valueChanges.subscribe(start => {
      const fin = this.form.get('dateFin')?.value;
      if (start && fin && fin <= start) {
        const next = new Date(start);
        next.setDate(next.getDate() + 1);
        this.form.patchValue({ dateFin: next.toISOString().slice(0, 10) }, { emitEvent: false });
      }
      this.refreshPreview();
    });
    this.form.get('dateFin')?.valueChanges.subscribe(() => this.refreshPreview());
    this.form.get('voitureId')?.valueChanges.subscribe(() => this.refreshPreview());
    this.form.get('remiseMontant')?.valueChanges.subscribe(() => this.refreshPreview());
  }

  refreshPreview(): void {
    clearTimeout(this.previewTimer);
    const voitureId = this.form.get('voitureId')?.value;
    const dateDebut = this.form.get('dateDebut')?.value;
    const dateFin   = this.form.get('dateFin')?.value;
    if (!voitureId || !dateDebut || !dateFin) { this.preview = null; return; }

    this.previewTimer = setTimeout(() => {
      this.previewLoading = true;
      this.http.post(`${environment.apiUrl}/reservation/preview-total`, {
        voitureId, dateDebut, dateFin,
        accessoireIds: this.selectedAccessoireIds,
        remiseMontant: this.form.get('remiseMontant')?.value || null,
      }).subscribe({
        next: (r: any) => { this.preview = r; this.previewLoading = false; },
        error: () => { this.previewLoading = false; },
      });
    }, 250);
  }

  get days(): number {
    if (this.preview) return this.preview.nbJours;
    const s = this.form.get('dateDebut')?.value;
    const e = this.form.get('dateFin')?.value;
    if (!s || !e) return 0;
    return Math.max(0, Math.ceil((new Date(e).getTime() - new Date(s).getTime()) / 86400000));
  }

  get total(): number {
    return this.preview?.total ?? (this.reservation?.total ?? 0);
  }

  get remaining(): number {
    return Math.max(0, this.total - (this.form.get('montantPaye')?.value ?? 0));
  }

  toggleAccessoire(id: number) {
    const idx = this.selectedAccessoireIds.indexOf(id);
    if (idx >= 0) {
      this.selectedAccessoireIds.splice(idx, 1);
    } else {
      this.selectedAccessoireIds.push(id);
    }
    this.refreshPreview();
  }

  isAccessoireSelected(id: number): boolean {
    return this.selectedAccessoireIds.includes(id);
  }

  get dateRangeInvalid(): boolean {
    const s = this.form.get('dateDebut')?.value;
    const e = this.form.get('dateFin')?.value;
    return !!s && !!e && e <= s;
  }

  save() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    if (this.dateRangeInvalid) {
      this.conflictError = this.t('dateReturnBeforeStart');
      return;
    }
    this.saving        = true;
    this.conflictError = '';

    const payload = {
      ...this.form.value,
      accessoireIds: this.selectedAccessoireIds
    };

    this.crud.update('reservation', this.reservation.id, payload).subscribe({
      next: () => {
        this.router.navigate(['/reservation']);
      },
      error: (err: any) => {
        this.saving = false;
        if (err?.status === 409 || err?.error?.error === 'double_booking') {
          this.conflictError = this.t('doubleBookingError');
        } else {
          this.conflictError = this.t('saveError');
        }
      }
    });
  }

  cancel() { this.router.navigate(['/reservation']); }

  t(key: string): string { return this.ts.translate(key); }
}
