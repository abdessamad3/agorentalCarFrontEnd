import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { CrudService } from '../../services/crud.service';
import { TranslationService } from '../../services/translation.service';
import { BtnComponent } from '../../shared/btn/btn.component';

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

  constructor(
    private route:  ActivatedRoute,
    private router: Router,
    private crud:   CrudService,
    private ts:     TranslationService,
    private fb:     FormBuilder
  ) {
    this.form = this.fb.group({
      clientId:          ['', Validators.required],
      voitureId:         ['', Validators.required],
      dateDebut:         ['', Validators.required],
      dateFin:           ['', Validators.required],
      reservationStatus: ['confirmed', Validators.required],
      modePaiement:      ['especes'],
      total:             [0, [Validators.required, Validators.min(0)]],
      montantPaye:       [0, [Validators.min(0)]]
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
        reservationStatus: reservation.reservationStatus || 'confirmed',
        modePaiement:      reservation.modePaiement || 'especes',
        total:             reservation.total    ?? 0,
        montantPaye:       reservation.montantPaye ?? 0
      });

      const accIds: number[] = (reservation.accessoires ?? []).map((a: any) => a.id ?? a);
      this.selectedAccessoireIds = accIds;
      this.loading = false;
    });

    // Auto-recalculate total when dates or vehicle change
    this.form.get('dateDebut')?.valueChanges.subscribe(() => this.recalcTotal());
    this.form.get('dateFin')?.valueChanges.subscribe(()   => this.recalcTotal());
    this.form.get('voitureId')?.valueChanges.subscribe(() => this.recalcTotal());
  }

  recalcTotal() {
    const start     = this.form.get('dateDebut')?.value;
    const end       = this.form.get('dateFin')?.value;
    const voitureId = this.form.get('voitureId')?.value;
    if (!start || !end || !voitureId) return;

    const days = Math.ceil(
      (new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60 * 60 * 24)
    );
    if (days <= 0) return;

    const voiture = this.voitures.find(v => v.id == voitureId);
    if (voiture?.prixJour) {
      this.form.patchValue({ total: days * parseFloat(voiture.prixJour) }, { emitEvent: false });
    }
  }

  get days(): number {
    const s = this.form.get('dateDebut')?.value;
    const e = this.form.get('dateFin')?.value;
    if (!s || !e) return 0;
    return Math.max(0, Math.ceil((new Date(e).getTime() - new Date(s).getTime()) / 86400000));
  }

  get remaining(): number {
    return Math.max(0, (this.form.get('total')?.value ?? 0) - (this.form.get('montantPaye')?.value ?? 0));
  }

  toggleAccessoire(id: number) {
    const idx = this.selectedAccessoireIds.indexOf(id);
    if (idx >= 0) {
      this.selectedAccessoireIds.splice(idx, 1);
    } else {
      this.selectedAccessoireIds.push(id);
    }
  }

  isAccessoireSelected(id: number): boolean {
    return this.selectedAccessoireIds.includes(id);
  }

  save() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
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
