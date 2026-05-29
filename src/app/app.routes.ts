import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { LoginComponent } from './auth/login/login.component';
import { RegisterComponent } from './auth/register/register.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { VoitureDashboardComponent } from './voiture/voiture-dashboard/voiture-dashboard.component';
import { VoitureListComponent } from './voiture/voiture-list/voiture-list.component';
import { VoitureCreateComponent } from './voiture/voiture-create/voiture-create.component';
import { VoitureDetailComponent } from './voiture/voiture-detail/voiture-detail.component';
import { BureauListComponent } from './bureau/bureau-list/bureau-list.component';
import { BureauCreateComponent } from './bureau/bureau-create/bureau-create.component';
import { BureauDetailComponent } from './bureau/bureau-detail/bureau-detail.component';
import { BureauEditComponent } from './bureau/bureau-edit/bureau-edit.component';
import { PlaceholderComponent } from './shared/placeholder/placeholder.component';
import { ClientListComponent } from './client/client-list/client-list.component';
import { ReservationListComponent } from './reservation/reservation-list/reservation-list.component';
import { ReservationCreateComponent } from './reservation/reservation-create/reservation-create.component';
import { CalendarComponent } from './calendar/calendar.component';
import { ContratListComponent } from './contrat/contrat-list/contrat-list.component';
import { PaiementListComponent } from './paiement/paiement-list/paiement-list.component';
import { ReparationListComponent } from './reparation/reparation-list/reparation-list.component';
import { VidangeListComponent } from './vidange/vidange-list/vidange-list.component';
import { AdblueListComponent } from './adblue/adblue-list/adblue-list.component';
import { AssuranceListComponent } from './assurance/assurance-list/assurance-list.component';
import { SuiviTechniqueListComponent } from './suivi-technique/suivi-technique-list/suivi-technique-list.component';
import { VignetteListComponent } from './vignette/vignette-list/vignette-list.component';
import { DepenseListComponent } from './depense/depense-list/depense-list.component';
import { CreditListComponent } from './credit/credit-list/credit-list.component';
import { InfractionListComponent } from './infraction/infraction-list/infraction-list.component';
import { AccessoireListComponent } from './accessoire/accessoire-list/accessoire-list.component';
import { PaiementClientComponent } from './paiement-client/paiement-client.component';
import { UtilisateurListComponent } from './utilisateur/utilisateur-list/utilisateur-list.component';
import { VenteListComponent } from './vente/vente-list/vente-list.component';
import { TestUploadComponent } from './test-upload/test-upload.component';
import { AchatListComponent } from './achat/achat-list/achat-list.component';
import { FournisseurListComponent } from './fournisseur/fournisseur-list/fournisseur-list.component';
import { MensualiteListComponent } from './mensualite/mensualite-list/mensualite-list.component';

export const routes: Routes = [
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },

  // Dashboard
  { path: 'dashboard', component: DashboardComponent, canActivate: [authGuard] },

  // Voiture Module
  {
    path: 'voiture',
    component: VoitureDashboardComponent,
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'list', pathMatch: 'full' },
      { path: 'list', component: VoitureListComponent },
      { path: 'create', component: VoitureCreateComponent },
      { path: ':id', component: VoitureDetailComponent }
    ]
  },
  { path: 'voiture-create', redirectTo: '/voiture/create' },
  { path: 'voiture-list', redirectTo: '/voiture/list' },

  // Bureau Module
  {
    path: 'bureau',
    canActivate: [authGuard],
    children: [
      { path: '', component: BureauListComponent },
      { path: 'create', component: BureauCreateComponent },
      { path: ':id', component: BureauDetailComponent },
      { path: ':id/edit', component: BureauEditComponent }
    ]
  },

  // Calendar
  { path: 'calendar', component: CalendarComponent, canActivate: [authGuard] },

  // Operations
  { path: 'client', component: ClientListComponent, canActivate: [authGuard] },
  {
    path: 'reservation',
    canActivate: [authGuard],
    children: [
      { path: '', component: ReservationListComponent },
      { path: 'create', component: ReservationCreateComponent },
    ]
  },
  { path: 'contrat', component: ContratListComponent, canActivate: [authGuard] },
  { path: 'paiement', component: PaiementListComponent, canActivate: [authGuard] },
  { path: 'paiement-client', component: PaiementClientComponent, canActivate: [authGuard] },

  // Maintenance
  { path: 'reparation', component: ReparationListComponent, canActivate: [authGuard] },
  { path: 'vidange', component: VidangeListComponent, canActivate: [authGuard] },
  { path: 'adblue', component: AdblueListComponent, canActivate: [authGuard] },
  { path: 'assurance', component: AssuranceListComponent, canActivate: [authGuard] },
  { path: 'suivi-technique', component: SuiviTechniqueListComponent, canActivate: [authGuard] },
  { path: 'vignette', component: VignetteListComponent, canActivate: [authGuard] },

  // Finance
  { path: 'depense', component: DepenseListComponent, canActivate: [authGuard] },
  { path: 'credit', component: CreditListComponent, canActivate: [authGuard] },
  { path: 'infraction', component: InfractionListComponent, canActivate: [authGuard] },

  // Car Purchase & Credit Financing
  { path: 'achat-voiture', component: AchatListComponent, canActivate: [authGuard] },
  { path: 'fournisseur', component: FournisseurListComponent, canActivate: [authGuard] },
  { path: 'mensualite', component: MensualiteListComponent, canActivate: [authGuard] },

  // Vehicle Sales
  { path: 'vente', component: VenteListComponent, canActivate: [authGuard] },

  // Admin
  { path: 'accessoire', component: AccessoireListComponent, canActivate: [authGuard] },
  { path: 'utilisateur', component: UtilisateurListComponent, canActivate: [authGuard] },

  // Test
  { path: 'test-upload', component: TestUploadComponent },

  // Catch all
  { path: '**', redirectTo: '/dashboard' }
];
