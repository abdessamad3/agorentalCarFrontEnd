import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { roleGuard } from './guards/role.guard';

export const routes: Routes = [
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
  {
    path: 'login',
    loadComponent: () => import('./auth/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'register',
    loadComponent: () => import('./auth/register/register.component').then(m => m.RegisterComponent)
  },

  // ── Organisation ───────────────────────────────────────────────────────────
  {
    path: 'dashboard',
    loadComponent: () => import('./dashboard/dashboard.component').then(m => m.DashboardComponent),
    canActivate: [authGuard]
  },
  {
    path: 'calendar',
    loadComponent: () => import('./calendar/calendar.component').then(m => m.CalendarComponent),
    canActivate: [authGuard],
    data: { breadcrumbs: ['Organisation', 'Calendar'] }
  },
  {
    path: 'bureau',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['ROLE_ADMIN', 'ROLE_MANAGER', 'ROLE_STAFF'] },
    children: [
      {
        path: '',
        loadComponent: () => import('./bureau/bureau-list/bureau-list.component').then(m => m.BureauListComponent),
        data: { breadcrumbs: ['Organisation', 'Offices'] }
      },
      {
        path: 'create',
        loadComponent: () => import('./bureau/bureau-create/bureau-create.component').then(m => m.BureauCreateComponent),
        canActivate: [roleGuard],
        data: { roles: ['ROLE_ADMIN'], breadcrumbs: ['Organisation', 'Offices', 'New Office'] }
      },
      {
        path: ':id',
        loadComponent: () => import('./bureau/bureau-detail/bureau-detail.component').then(m => m.BureauDetailComponent),
        data: { breadcrumbs: ['Organisation', 'Offices', 'Detail'] }
      },
      {
        path: ':id/edit',
        loadComponent: () => import('./bureau/bureau-edit/bureau-edit.component').then(m => m.BureauEditComponent),
        canActivate: [roleGuard],
        data: { roles: ['ROLE_ADMIN'], breadcrumbs: ['Organisation', 'Offices', 'Edit'] }
      }
    ]
  },

  // ── Fleet ──────────────────────────────────────────────────────────────────
  {
    path: 'voiture',
    loadComponent: () => import('./voiture/voiture-dashboard/voiture-dashboard.component').then(m => m.VoitureDashboardComponent),
    canActivate: [authGuard, roleGuard],
    data: { roles: ['ROLE_ADMIN', 'ROLE_MANAGER', 'ROLE_STAFF'] },
    children: [
      { path: '', redirectTo: 'list', pathMatch: 'full' },
      {
        path: 'list',
        loadComponent: () => import('./voiture/voiture-list/voiture-list.component').then(m => m.VoitureListComponent),
        data: { breadcrumbs: ['Fleet', 'Vehicles'] }
      },
      {
        path: 'create',
        loadComponent: () => import('./voiture/voiture-create/voiture-create.component').then(m => m.VoitureCreateComponent),
        data: { breadcrumbs: ['Fleet', 'Vehicles', 'Acquire Vehicle'] }
      },
      {
        path: ':id',
        loadComponent: () => import('./voiture/voiture-detail/voiture-detail.component').then(m => m.VoitureDetailComponent),
        data: { breadcrumbs: ['Fleet', 'Vehicles', 'Detail'] }
      }
    ]
  },
  { path: 'voiture-create', redirectTo: '/voiture/create' },
  { path: 'voiture-list',   redirectTo: '/voiture/list' },
  {
    path: 'assurance',
    loadComponent: () => import('./assurance/assurance-list/assurance-list.component').then(m => m.AssuranceListComponent),
    canActivate: [authGuard, roleGuard],
    data: { roles: ['ROLE_ADMIN', 'ROLE_MANAGER'], breadcrumbs: ['Fleet', 'Insurance'] }
  },
  {
    path: 'vignette',
    loadComponent: () => import('./vignette/vignette-list/vignette-list.component').then(m => m.VignetteListComponent),
    canActivate: [authGuard, roleGuard],
    data: { roles: ['ROLE_ADMIN', 'ROLE_MANAGER'], breadcrumbs: ['Fleet', 'Vignettes'] }
  },
  {
    path: 'reparation',
    loadComponent: () => import('./reparation/reparation-list/reparation-list.component').then(m => m.ReparationListComponent),
    canActivate: [authGuard, roleGuard],
    data: { roles: ['ROLE_ADMIN', 'ROLE_MANAGER'], breadcrumbs: ['Fleet', 'Repairs'] }
  },
  {
    path: 'vidange',
    loadComponent: () => import('./vidange/vidange-list/vidange-list.component').then(m => m.VidangeListComponent),
    canActivate: [authGuard, roleGuard],
    data: { roles: ['ROLE_ADMIN', 'ROLE_MANAGER'], breadcrumbs: ['Fleet', 'Oil Changes'] }
  },
  {
    path: 'adblue',
    loadComponent: () => import('./adblue/adblue-list/adblue-list.component').then(m => m.AdblueListComponent),
    canActivate: [authGuard, roleGuard],
    data: { roles: ['ROLE_ADMIN', 'ROLE_MANAGER'], breadcrumbs: ['Fleet', 'AdBlue'] }
  },
  {
    path: 'suivi-technique',
    loadComponent: () => import('./suivi-technique/suivi-technique-list/suivi-technique-list.component').then(m => m.SuiviTechniqueListComponent),
    canActivate: [authGuard, roleGuard],
    data: { roles: ['ROLE_ADMIN', 'ROLE_MANAGER'], breadcrumbs: ['Fleet', 'Technical Check'] }
  },
  {
    path: 'compliance',
    loadComponent: () => import('./notifications/notifications.component').then(m => m.NotificationsComponent),
    canActivate: [authGuard],
    data: { breadcrumbs: ['Fleet', 'Compliance'] }
  },
  {
    path: 'compliance-center',
    loadComponent: () => import('./compliance-center/compliance-center.component').then(m => m.ComplianceCenterComponent),
    canActivate: [authGuard, roleGuard],
    data: { roles: ['ROLE_ADMIN', 'ROLE_MANAGER'], breadcrumbs: ['Fleet', 'Compliance Center'] }
  },
  {
    path: 'fleet-health',
    loadComponent: () => import('./fleet-health/fleet-health.component').then(m => m.FleetHealthComponent),
    canActivate: [authGuard, roleGuard],
    data: { roles: ['ROLE_ADMIN', 'ROLE_MANAGER'], breadcrumbs: ['Fleet', 'Health Score'] }
  },
  {
    path: 'maintenance/planning',
    loadComponent: () => import('./maintenance-planning/maintenance-planning.component').then(m => m.MaintenancePlanningComponent),
    canActivate: [authGuard, roleGuard],
    data: { roles: ['ROLE_ADMIN', 'ROLE_MANAGER'], breadcrumbs: ['Fleet', 'Maintenance Planning'] }
  },

  // ── Rentals ────────────────────────────────────────────────────────────────
  {
    path: 'client',
    loadComponent: () => import('./client/client-list/client-list.component').then(m => m.ClientListComponent),
    canActivate: [authGuard, roleGuard],
    data: { roles: ['ROLE_ADMIN', 'ROLE_MANAGER', 'ROLE_STAFF'], breadcrumbs: ['Rentals', 'Clients'] }
  },
  {
    path: 'client/:id',
    loadComponent: () => import('./client/client-detail/client-detail.component').then(m => m.ClientDetailComponent),
    canActivate: [authGuard, roleGuard],
    data: { roles: ['ROLE_ADMIN', 'ROLE_MANAGER', 'ROLE_STAFF'], breadcrumbs: ['Rentals', 'Clients', 'Profile'] }
  },
  {
    path: 'reservation',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['ROLE_ADMIN', 'ROLE_MANAGER', 'ROLE_STAFF'] },
    children: [
      {
        path: '',
        loadComponent: () => import('./reservation/reservation-list/reservation-list.component').then(m => m.ReservationListComponent),
        data: { breadcrumbs: ['Rentals', 'Reservations'] }
      },
      {
        path: 'create',
        loadComponent: () => import('./reservation/reservation-create/reservation-create.component').then(m => m.ReservationCreateComponent),
        data: { breadcrumbs: ['Rentals', 'New Booking'] }
      },
      {
        path: 'edit/:id',
        loadComponent: () => import('./reservation/reservation-edit/reservation-edit.component').then(m => m.ReservationEditComponent),
        data: { breadcrumbs: ['Rentals', 'Reservations', 'Edit'] }
      }
    ]
  },
  {
    path: 'location/new',
    loadComponent: () => import('./location/location-create/location-create.component').then(m => m.LocationCreateComponent),
    canActivate: [authGuard, roleGuard],
    data: { roles: ['ROLE_ADMIN', 'ROLE_MANAGER', 'ROLE_STAFF'], breadcrumbs: ['Rentals', 'New Rental'] }
  },
  {
    path: 'location/:id',
    loadComponent: () => import('./location/location-dossier/location-dossier.component').then(m => m.LocationDossierComponent),
    canActivate: [authGuard, roleGuard],
    data: { roles: ['ROLE_ADMIN', 'ROLE_MANAGER', 'ROLE_STAFF'], breadcrumbs: ['Rentals', 'Rental Dossier'] }
  },
  {
    path: 'contrat',
    loadComponent: () => import('./contrat/contrat-list/contrat-list.component').then(m => m.ContratListComponent),
    canActivate: [authGuard, roleGuard],
    data: { roles: ['ROLE_ADMIN', 'ROLE_MANAGER', 'ROLE_STAFF'], breadcrumbs: ['Rentals', 'Contracts'] }
  },
  {
    path: 'contrat/:id/print',
    loadComponent: () => import('./contrat/contrat-print-page/contrat-print-page.component').then(m => m.ContratPrintPageComponent),
    canActivate: [authGuard, roleGuard],
    data: { roles: ['ROLE_ADMIN', 'ROLE_MANAGER', 'ROLE_STAFF'] }
  },
  {
    path: 'contrat/:id',
    loadComponent: () => import('./contrat/contrat-detail/contrat-detail.component').then(m => m.ContratDetailComponent),
    canActivate: [authGuard, roleGuard],
    data: { roles: ['ROLE_ADMIN', 'ROLE_MANAGER', 'ROLE_STAFF'], breadcrumbs: ['Rentals', 'Contracts', 'Detail'] }
  },
  {
    path: 'return-inspection',
    loadComponent: () => import('./return-inspection/return-inspection.component').then(m => m.ReturnInspectionComponent),
    canActivate: [authGuard, roleGuard],
    data: { roles: ['ROLE_ADMIN', 'ROLE_MANAGER', 'ROLE_STAFF'], breadcrumbs: ['Rentals', 'Return Inspections'] }
  },

  // ── Finance ────────────────────────────────────────────────────────────────
  {
    path: 'paiement',
    loadComponent: () => import('./paiement/paiement-list/paiement-list.component').then(m => m.PaiementListComponent),
    canActivate: [authGuard, roleGuard],
    data: { roles: ['ROLE_ADMIN', 'ROLE_MANAGER'], breadcrumbs: ['Finance', 'Payments'] }
  },
  {
    path: 'paiement-client',
    loadComponent: () => import('./paiement-client/paiement-client.component').then(m => m.PaiementClientComponent),
    canActivate: [authGuard, roleGuard],
    data: { roles: ['ROLE_ADMIN', 'ROLE_MANAGER'], breadcrumbs: ['Finance', 'Client Payments'] }
  },
  {
    path: 'vehicle-expenses',
    loadComponent: () => import('./depense/vehicle-expense-list/vehicle-expense-list.component').then(m => m.VehicleExpenseListComponent),
    canActivate: [authGuard, roleGuard],
    data: { roles: ['ROLE_ADMIN', 'ROLE_MANAGER'], breadcrumbs: ['Finance', 'Vehicle Expenses'] }
  },
  {
    path: 'bureau-expenses',
    loadComponent: () => import('./depense/bureau-expense-list/bureau-expense-list.component').then(m => m.BureauExpenseListComponent),
    canActivate: [authGuard, roleGuard],
    data: { roles: ['ROLE_ADMIN', 'ROLE_MANAGER'], breadcrumbs: ['Finance', 'Bureau Expenses'] }
  },
  {
    path: 'depense',
    loadComponent: () => import('./depense/depense-list/depense-list.component').then(m => m.DepenseListComponent),
    canActivate: [authGuard, roleGuard],
    data: { roles: ['ROLE_ADMIN', 'ROLE_MANAGER'], breadcrumbs: ['Finance', 'Expenses'] }
  },
  {
    path: 'credit',
    loadComponent: () => import('./credit/credit-list/credit-list.component').then(m => m.CreditListComponent),
    canActivate: [authGuard, roleGuard],
    data: { roles: ['ROLE_ADMIN', 'ROLE_MANAGER'], breadcrumbs: ['Finance', 'Credits'] }
  },
  {
    path: 'credit-monitoring',
    loadComponent: () => import('./credit/credit-monitoring/credit-monitoring.component').then(m => m.CreditMonitoringComponent),
    canActivate: [authGuard, roleGuard],
    data: { roles: ['ROLE_ADMIN', 'ROLE_MANAGER'], breadcrumbs: ['Finance', 'Credit Monitoring'] }
  },
  {
    path: 'infraction',
    loadComponent: () => import('./infraction/infraction-list/infraction-list.component').then(m => m.InfractionListComponent),
    canActivate: [authGuard, roleGuard],
    data: { roles: ['ROLE_ADMIN', 'ROLE_MANAGER'], breadcrumbs: ['Finance', 'Infractions'] }
  },
  {
    path: 'achat-voiture',
    loadComponent: () => import('./achat/achat-list/achat-list.component').then(m => m.AchatListComponent),
    canActivate: [authGuard, roleGuard],
    data: { roles: ['ROLE_ADMIN', 'ROLE_MANAGER'], breadcrumbs: ['Finance', 'Car Purchases'] }
  },
  {
    path: 'vente',
    loadComponent: () => import('./vente/vente-list/vente-list.component').then(m => m.VenteListComponent),
    canActivate: [authGuard, roleGuard],
    data: { roles: ['ROLE_ADMIN', 'ROLE_MANAGER'], breadcrumbs: ['Finance', 'Vehicle Sales'] }
  },
  {
    path: 'fournisseur',
    loadComponent: () => import('./fournisseur/fournisseur-list/fournisseur-list.component').then(m => m.FournisseurListComponent),
    canActivate: [authGuard, roleGuard],
    data: { roles: ['ROLE_ADMIN', 'ROLE_MANAGER'], breadcrumbs: ['Finance', 'Suppliers'] }
  },
  {
    path: 'mensualite',
    loadComponent: () => import('./mensualite/mensualite-list/mensualite-list.component').then(m => m.MensualiteListComponent),
    canActivate: [authGuard, roleGuard],
    data: { roles: ['ROLE_ADMIN', 'ROLE_MANAGER'], breadcrumbs: ['Finance', 'Monthly Payments'] }
  },
  {
    path: 'vehicle-financing',
    loadComponent: () => import('./vehicle-financing/credit-dashboard/credit-dashboard.component').then(m => m.CreditDashboardComponent),
    canActivate: [authGuard, roleGuard],
    data: { roles: ['ROLE_ADMIN', 'ROLE_MANAGER'], breadcrumbs: ['Finance', 'Financing Dashboard'] }
  },
  {
    path: 'vehicle-financing/contracts',
    loadComponent: () => import('./vehicle-financing/credit-list/credit-list.component').then(m => m.CreditListComponent),
    canActivate: [authGuard, roleGuard],
    data: { roles: ['ROLE_ADMIN', 'ROLE_MANAGER'], breadcrumbs: ['Finance', 'Financing Contracts'] }
  },
  {
    path: 'vehicle-financing/create',
    loadComponent: () => import('./vehicle-financing/credit-create/credit-create.component').then(m => m.CreditCreateComponent),
    canActivate: [authGuard, roleGuard],
    data: { roles: ['ROLE_ADMIN', 'ROLE_MANAGER'], breadcrumbs: ['Finance', 'New Financing Contract'] }
  },
  {
    path: 'vehicle-financing/detail/:id',
    loadComponent: () => import('./vehicle-financing/credit-detail/credit-detail.component').then(m => m.CreditDetailComponent),
    canActivate: [authGuard, roleGuard],
    data: { roles: ['ROLE_ADMIN', 'ROLE_MANAGER'], breadcrumbs: ['Finance', 'Contract Detail'] }
  },
  {
    path: 'vehicle-financing/institutions',
    loadComponent: () => import('./vehicle-financing/financial-institution/financial-institution.component').then(m => m.FinancialInstitutionComponent),
    canActivate: [authGuard, roleGuard],
    data: { roles: ['ROLE_ADMIN', 'ROLE_MANAGER'], breadcrumbs: ['Finance', 'Financial Institutions'] }
  },

  // ── Analytics ──────────────────────────────────────────────────────────────
  {
    path: 'executive',
    loadComponent: () => import('./executive/executive.component').then(m => m.ExecutiveComponent),
    canActivate: [authGuard, roleGuard],
    data: { roles: ['ROLE_ADMIN', 'ROLE_MANAGER'], breadcrumbs: ['Analytics', 'Executive Dashboard'] }
  },
  {
    path: 'rapports/fleet',
    loadComponent: () => import('./rapports/fleet-report/fleet-report.component').then(m => m.FleetReportComponent),
    canActivate: [authGuard, roleGuard],
    data: { roles: ['ROLE_ADMIN', 'ROLE_MANAGER'], breadcrumbs: ['Analytics', 'Fleet Report'] }
  },
  {
    path: 'rapports/financial',
    loadComponent: () => import('./rapports/financial-report/financial-report.component').then(m => m.FinancialReportComponent),
    canActivate: [authGuard, roleGuard],
    data: { roles: ['ROLE_ADMIN', 'ROLE_MANAGER'], breadcrumbs: ['Analytics', 'Financial Report'] }
  },
  {
    path: 'rapports/profitability',
    loadComponent: () => import('./rapports/profitability-report/profitability-report.component').then(m => m.ProfitabilityReportComponent),
    canActivate: [authGuard, roleGuard],
    data: { roles: ['ROLE_ADMIN', 'ROLE_MANAGER'], breadcrumbs: ['Analytics', 'Profitability'] }
  },
  {
    path: 'rapports/maintenance',
    loadComponent: () => import('./rapports/maintenance-report/maintenance-report.component').then(m => m.MaintenanceReportComponent),
    canActivate: [authGuard, roleGuard],
    data: { roles: ['ROLE_ADMIN', 'ROLE_MANAGER'], breadcrumbs: ['Analytics', 'Maintenance Report'] }
  },
  {
    path: 'rapports/clients',
    loadComponent: () => import('./rapports/customer-report/customer-report.component').then(m => m.CustomerReportComponent),
    canActivate: [authGuard, roleGuard],
    data: { roles: ['ROLE_ADMIN', 'ROLE_MANAGER'], breadcrumbs: ['Analytics', 'Customers'] }
  },
  {
    path: 'rapports/branches',
    loadComponent: () => import('./rapports/branch-report/branch-report.component').then(m => m.BranchReportComponent),
    canActivate: [authGuard, roleGuard],
    data: { roles: ['ROLE_ADMIN', 'ROLE_MANAGER'], breadcrumbs: ['Analytics', 'Branch Report'] }
  },
  {
    path: 'rapports/forecast',
    loadComponent: () => import('./rapports/forecast-report/forecast-report.component').then(m => m.ForecastReportComponent),
    canActivate: [authGuard, roleGuard],
    data: { roles: ['ROLE_ADMIN', 'ROLE_MANAGER'], breadcrumbs: ['Analytics', 'Forecast'] }
  },

  // ── Administration ─────────────────────────────────────────────────────────
  {
    path: 'settings/parametres-societe',
    loadComponent: () => import('./settings/parametres-societe/parametres-societe.component').then(m => m.ParametresSocieteComponent),
    canActivate: [authGuard, roleGuard],
    data: { roles: ['ROLE_ADMIN'], breadcrumbs: ['Administration', 'Company Profile'] }
  },
  {
    path: 'settings/conditions-contrat',
    loadComponent: () => import('./settings/conditions-contrat/conditions-contrat.component').then(m => m.ConditionsContratComponent),
    canActivate: [authGuard, roleGuard],
    data: { roles: ['ROLE_ADMIN'], breadcrumbs: ['Administration', 'Contract Conditions'] }
  },
  {
    path: 'accessoire',
    loadComponent: () => import('./accessoire/accessoire-list/accessoire-list.component').then(m => m.AccessoireListComponent),
    canActivate: [authGuard, roleGuard],
    data: { breadcrumbs: ['Administration', 'Accessories'], roles: ['ROLE_ADMIN', 'ROLE_MANAGER', 'ROLE_STAFF'] }
  },
  {
    path: 'utilisateur',
    loadComponent: () => import('./utilisateur/utilisateur-list/utilisateur-list.component').then(m => m.UtilisateurListComponent),
    canActivate: [authGuard, roleGuard],
    data: { roles: ['ROLE_ADMIN', 'ROLE_MANAGER', 'ROLE_STAFF'], breadcrumbs: ['Administration', 'Users & Roles'] }
  },
  {
    path: 'company',
    loadComponent: () => import('./company/company-list/company-list.component').then(m => m.CompanyListComponent),
    canActivate: [authGuard, roleGuard],
    data: { roles: ['ROLE_ADMIN', 'ROLE_MANAGER', 'ROLE_STAFF'], breadcrumbs: ['Administration', 'Companies'] }
  },
  {
    path: 'parametres',
    loadComponent: () => import('./parametres/parametres.component').then(m => m.ParametresComponent),
    canActivate: [authGuard, roleGuard],
    data: { roles: ['ROLE_ADMIN'], breadcrumbs: ['Administration', 'Parameters'] }
  },
  {
    path: 'activity-log',
    loadComponent: () => import('./activity-log/activity-log-list/activity-log-list.component').then(m => m.ActivityLogListComponent),
    canActivate: [authGuard, roleGuard],
    data: { roles: ['ROLE_ADMIN'], breadcrumbs: ['Administration', 'Activity Log'] }
  },
  {
    path: 'email-log',
    loadComponent: () => import('./email-log/email-log-list/email-log-list.component').then(m => m.EmailLogListComponent),
    canActivate: [authGuard, roleGuard],
    data: { roles: ['ROLE_ADMIN'], breadcrumbs: ['Administration', 'Email History'] }
  },

  // ── Profile & Utilities ────────────────────────────────────────────────────
  {
    path: 'profile',
    loadComponent: () => import('./profile/profile/profile.component').then(m => m.ProfileComponent),
    canActivate: [authGuard],
    data: { breadcrumbs: ['Profile'] }
  },
  {
    path: 'change-password',
    loadComponent: () => import('./profile/change-password/change-password.component').then(m => m.ChangePasswordComponent),
    canActivate: [authGuard],
    data: { breadcrumbs: ['Profile', 'Change Password'] }
  },
  {
    path: 'notifications',
    loadComponent: () => import('./notifications-inbox/notifications-inbox.component').then(m => m.NotificationsInboxComponent),
    canActivate: [authGuard],
    data: { breadcrumbs: ['Notifications'] }
  },

  // Catch all
  { path: '**', redirectTo: '/dashboard' }
];
