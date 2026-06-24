import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { CrudService } from '../../services/crud.service';
import { ToastService } from '../../services/toast.service';
import { forkJoin, of } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { complianceSeverity } from '../../shared/utils/compliance.utils';

@Component({
  selector: 'app-location-create',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './location-create.component.html',
  styleUrls: ['./location-create.component.css']
})
export class LocationCreateComponent implements OnInit {
  clients: any[]    = [];
  voitures: any[]   = [];
  accessoires: any[] = [];

  clientSearch       = '';
  filteredClients: any[] = [];
  selectedClient: any   = null;
  showClientDropdown    = false;

  selectedVoiture: any  = null;
  selectedAccessoireIds: Set<number> = new Set();

  dateDebut  = '';
  dateFin    = '';
  lieuLivraison = '';
  lieuRetour    = '';
  modePaiement  = 'especes';
  montantPaye   = 0;

  // Inline new client form
  showNewClientForm = false;
  newClient = { nom: '', telephone: '', cin: '', permisConduite: '' };
  savingClient = false;

  isSubmitting = false;

  constructor(
    private crud: CrudService,
    private toast: ToastService,
    public  router: Router
  ) {}

  ngOnInit() {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    this.dateDebut = now.toISOString().slice(0, 16);
    this.dateFin   = tomorrow.toISOString().slice(0, 16);

    forkJoin({
      voitures:    this.crud.getAll('voiture').pipe(catchError(() => of([]))),
      accessoires: this.crud.getAll('accessoire').pipe(catchError(() => of([]))),
    }).subscribe(({ voitures, accessoires }) => {
      this.voitures    = Array.isArray(voitures)    ? voitures    : (voitures    as any)?.data ?? [];
      this.accessoires = Array.isArray(accessoires) ? accessoires : (accessoires as any)?.data ?? [];
    });

    this.crud.getPage('client').pipe(catchError(() => of({ data: [] } as any))).subscribe((r: any) => {
      this.clients = r?.data ?? [];
      this.filteredClients = this.clients;
    });
  }

  onClientSearch() {
    const q = this.clientSearch.toLowerCase();
    this.filteredClients = q
      ? this.clients.filter(c => (c.nom || '').toLowerCase().includes(q) || (c.telephone || '').includes(q))
      : this.clients;
    this.showClientDropdown = true;
  }

  selectClient(c: any) {
    this.selectedClient    = c;
    this.clientSearch      = c.nom;
    this.showClientDropdown = false;
  }

  clearClient() {
    this.selectedClient    = null;
    this.clientSearch      = '';
    this.showClientDropdown = false;
  }

  selectVoiture(v: any) {
    this.selectedVoiture = this.selectedVoiture?.id === v.id ? null : v;
  }

  toggleAccessoire(id: number) {
    this.selectedAccessoireIds.has(id)
      ? this.selectedAccessoireIds.delete(id)
      : this.selectedAccessoireIds.add(id);
  }

  get numberOfDays(): number {
    if (!this.dateDebut || !this.dateFin) return 0;
    const diff = new Date(this.dateFin).getTime() - new Date(this.dateDebut).getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }

  get vehicleTotal(): number {
    return (this.selectedVoiture?.prixJour ?? 0) * this.numberOfDays;
  }

  get accessoryTotal(): number {
    return Array.from(this.selectedAccessoireIds)
      .map(id => this.accessoires.find((a: any) => a.id === id))
      .filter(Boolean)
      .reduce((s, a: any) => s + parseFloat(a.prix ?? 0) * this.numberOfDays, 0);
  }

  get totalAmount(): number { return this.vehicleTotal + this.accessoryTotal; }

  get remaining(): number { return this.totalAmount - (this.montantPaye ?? 0); }

  get canSubmit(): boolean {
    return !!(this.selectedClient && this.selectedVoiture && this.dateDebut && this.dateFin && this.numberOfDays > 0);
  }

  createClient() {
    if (!this.newClient.nom) { this.toast.show('Le nom est requis', 'error'); return; }
    this.savingClient = true;
    this.crud.rawPost('client', this.newClient).subscribe({
      next: (c: any) => {
        this.clients.unshift(c);
        this.filteredClients = this.clients;
        this.selectClient(c);
        this.showNewClientForm = false;
        this.newClient = { nom: '', telephone: '', cin: '', permisConduite: '' };
        this.savingClient = false;
        this.toast.show('Client créé', 'success');
      },
      error: () => { this.toast.show('Erreur lors de la création du client', 'error'); this.savingClient = false; }
    });
  }

  submit() {
    if (!this.canSubmit) return;
    this.isSubmitting = true;

    const payload = {
      clientId:          this.selectedClient.id,
      voitureId:         this.selectedVoiture.id,
      dateDebut:         this.dateDebut,
      dateFin:           this.dateFin,
      total:             this.totalAmount.toFixed(2),
      prixParJour:       this.selectedVoiture.prixJour ?? 0,
      modePaiement:      this.modePaiement,
      montantPaye:       this.montantPaye,
      lieuLivraison:     this.lieuLivraison || null,
      lieuRetour:        this.lieuRetour    || null,
      accessoireIds:     Array.from(this.selectedAccessoireIds),
      reservationStatus: 'confirmed',
    };

    this.crud.rawPost('reservation', payload).pipe(
      switchMap((res: any) => {
        const resId = res?.id ?? res?.reservation?.id;
        return this.crud.rawPost('contrat', { reservationId: resId }).pipe(
          catchError(() => of(null)),
          switchMap(() => of(resId))
        );
      })
    ).subscribe({
      next: (resId: number) => {
        this.isSubmitting = false;
        this.toast.show('Dossier créé', 'success');
        this.router.navigate(['/location', resId]);
      },
      error: (err: any) => {
        this.toast.show(err?.error?.message ?? 'Erreur lors de la création', 'error');
        this.isSubmitting = false;
      }
    });
  }

  complianceClass(v: any): string {
    const s = v?.compliance?.overall;
    const sev = complianceSeverity(s);
    if (sev === 'ok')      return 'cpl-valid';
    if (sev === 'warning') return 'cpl-warning';
    if (sev === 'danger')  return s === 'EXPIRED' ? 'cpl-expired' : 'cpl-critical';
    return 'cpl-unknown';
  }

  isAvailable(v: any): boolean {
    const s = (v.reservationStatus || v.statut || '').toLowerCase();
    return !['en_cours', 'active'].includes(s);
  }
}
