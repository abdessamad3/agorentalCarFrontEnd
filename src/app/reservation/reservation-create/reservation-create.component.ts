import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { CrudService } from '../../services/crud.service';
import { TranslationService } from '../../services/translation.service';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Component({
  selector: 'app-reservation-create',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule],
  templateUrl: './reservation-create.component.html',
  styleUrls: ['./reservation-create.component.css']
})
export class ReservationCreateComponent implements OnInit {
  form: FormGroup;
  dir = 'ltr';
  isSubmitting = false;
  submitError = '';

  // Data
  clients: any[] = [];
  voitures: any[] = [];
  accessoires: any[] = [];
  reservations: any[] = [];

  // UI state
  clientSearch = '';
  showClientDropdown = false;
  filteredClients: any[] = [];
  selectedClient: any = null;
  showAddClientModal = false;
  newClientForm: FormGroup;
  addingClient = false;

  selectedVoiture: any = null;

  selectedAccessoires: Set<number> = new Set();

  // Pricing
  get numberOfDays(): number {
    const start = this.form.get('dateDebut')?.value;
    const end = this.form.get('dateFin')?.value;
    if (!start || !end) return 0;
    const diff = new Date(end).getTime() - new Date(start).getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }

  get dailyRate(): number {
    return this.selectedVoiture?.prixJour || 0;
  }

  get vehicleTotal(): number {
    return this.dailyRate * this.numberOfDays;
  }

  get accessoryTotal(): number {
    return this.voitures.length === 0 ? 0 :
      Array.from(this.selectedAccessoires)
        .map(id => this.accessoires.find((a: any) => a.id === id))
        .filter(Boolean)
        .reduce((s, a: any) => s + (parseFloat(a.prix || 0) * this.numberOfDays), 0);
  }

  get totalAmount(): number {
    return this.vehicleTotal + this.accessoryTotal;
  }

  get remaining(): number {
    const paid = parseFloat(this.form.get('montantPaye')?.value || 0);
    return this.totalAmount - paid;
  }

  constructor(
    private fb: FormBuilder,
    private crud: CrudService,
    private ts: TranslationService,
    private router: Router
  ) {
    this.form = this.fb.group({
      clientId:   [null, Validators.required],
      voitureId:  [null, Validators.required],
      dateDebut:  ['', Validators.required],
      dateFin:    ['', Validators.required],
      reservationStatus: ['pending'],
      modePaiement: ['especes'],
      montantPaye: [0, [Validators.min(0)]],
      notes:      [''],
    });

    this.newClientForm = this.fb.group({
      nom:      ['', Validators.required],
      prenom:   [''],
      telephone:[''],
      cin:      [''],
    });
  }

  ngOnInit() {
    this.ts.direction$.subscribe(d => this.dir = d);
    this.loadData();

    // Set today and tomorrow as default dates
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    this.form.patchValue({
      dateDebut: today.toISOString().split('T')[0],
      dateFin: tomorrow.toISOString().split('T')[0],
    });
  }

  loadData() {
    forkJoin({
      voitures:     this.crud.getAll('voiture', { limit: 1000 }).pipe(catchError(() => of([]))),
      accessoires:  this.crud.getAll('accessoire').pipe(catchError(() => of([]))),
      reservations: this.crud.getAll('reservation').pipe(catchError(() => of([]))),
    }).subscribe(({ voitures, accessoires, reservations }) => {
      this.voitures = Array.isArray(voitures) ? voitures : (voitures as any)?.data ?? [];
      this.accessoires  = Array.isArray(accessoires)  ? accessoires  : (accessoires  as any)?.data ?? [];
      this.reservations = Array.isArray(reservations) ? reservations : (reservations as any)?.data ?? [];
    });

    this.crud.getAll('client').pipe(catchError(() => of([]))).subscribe(r => {
      this.clients = Array.isArray(r) ? r : (r as any)?.data ?? [];
      this.filteredClients = this.clients;
    });
  }

  onClientSearch() {
    const q = this.clientSearch.toLowerCase();
    this.filteredClients = q
      ? this.clients.filter(c => `${c.nom} ${c.prenom}`.toLowerCase().includes(q) || (c.telephone || '').includes(q))
      : this.clients;
    this.showClientDropdown = true;
  }

  selectClient(client: any) {
    this.selectedClient = client;
    this.clientSearch = `${client.nom} ${client.prenom || ''}`.trim();
    this.form.patchValue({ clientId: client.id });
    this.showClientDropdown = false;
  }

  clearClient() {
    this.selectedClient = null;
    this.clientSearch = '';
    this.form.patchValue({ clientId: null });
  }

  openAddClient() { this.showAddClientModal = true; this.newClientForm.reset(); }
  closeAddClient() { this.showAddClientModal = false; }

  saveNewClient() {
    if (this.newClientForm.invalid) return;
    this.addingClient = true;
    this.crud.create('client', this.newClientForm.value).subscribe({
      next: (created: any) => {
        this.clients.unshift(created);
        this.selectClient(created);
        this.closeAddClient();
        this.addingClient = false;
      },
      error: () => { this.addingClient = false; }
    });
  }

  isVoitureConflicted(voitureId: number): boolean {
    const start = this.form.get('dateDebut')?.value;
    const end   = this.form.get('dateFin')?.value;
    if (!start || !end || !voitureId) return false;
    const s = new Date(start); s.setHours(0, 0, 0, 0);
    const e = new Date(end);   e.setHours(23, 59, 59, 999);
    return this.reservations.some(r => {
      const rId = r.voiture?.id ?? r.voitureId;
      if (rId !== voitureId) return false;
      const st = (r.reservationStatus || r.statut || '').toLowerCase();
      if (['cancelled', 'annulee', 'annule'].includes(st)) return false;
      const rs = new Date(r.dateDebut); rs.setHours(0, 0, 0, 0);
      const re = new Date(r.dateFin);   re.setHours(23, 59, 59, 999);
      return s <= re && e >= rs;
    });
  }

  selectVoiture(voiture: any) {
    if (this.isVoitureConflicted(voiture.id)) return;
    this.selectedVoiture = voiture;
    this.form.patchValue({ voitureId: voiture.id });
    this.submitError = '';
  }

  toggleAccessoire(id: number) {
    if (this.selectedAccessoires.has(id)) {
      this.selectedAccessoires.delete(id);
    } else {
      this.selectedAccessoires.add(id);
    }
  }

  isAccessoireSelected(id: number): boolean {
    return this.selectedAccessoires.has(id);
  }

  onDateChange() {
    // Recalculate if end date is before start date, push end date
    const start = this.form.get('dateDebut')?.value;
    const end = this.form.get('dateFin')?.value;
    if (start && end && new Date(end) <= new Date(start)) {
      const newEnd = new Date(start);
      newEnd.setDate(newEnd.getDate() + 1);
      this.form.patchValue({ dateFin: newEnd.toISOString().split('T')[0] });
    }
  }

  submit() {
    if (this.form.invalid || !this.selectedVoiture) return;
    if (this.isVoitureConflicted(this.selectedVoiture.id)) {
      this.submitError = this.t('carAlreadyReserved');
      return;
    }
    this.isSubmitting = true;
    this.submitError = '';

    const payload = {
      ...this.form.value,
      montant: this.totalAmount,
      total: this.totalAmount,
      accessoireIds: Array.from(this.selectedAccessoires),
    };

    this.crud.create('reservation', payload).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.router.navigate(['/reservation']);
      },
      error: () => {
        this.isSubmitting = false;
        this.submitError = this.ts.translate('loadError');
      }
    });
  }

  t(key: string) { return this.ts.translate(key); }
}
