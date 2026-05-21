import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { LoginComponent } from './auth/login/login.component';
import { RegisterComponent } from './auth/register/register.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { VoitureDashboardComponent } from './voiture/voiture-dashboard/voiture-dashboard.component';
import { VoitureCreateComponent } from './voiture/voiture-create/voiture-create.component';
import { VoitureDetailComponent } from './voiture/voiture-detail/voiture-detail.component';
import { VoitureListComponent } from './voiture/voiture-list/voiture-list.component';
import { PlaceholderComponent } from './shared/placeholder/placeholder.component';

export const routes: Routes = [
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' },

  // PUBLIC ROUTES
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },

  // PROTECTED ROUTES
  { path: 'dashboard', component: DashboardComponent, canActivate: [authGuard] },

  // NEW: Voiture Dashboard with Tab Navigation
  {
    path: 'voiture',
    component: VoitureDashboardComponent,
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'list', pathMatch: 'full' },
      { path: 'list', component: VoitureListComponent },
      { path: 'create', component: VoitureCreateComponent },
      { path: ':id', component: VoitureDetailComponent },
      { path: 'finance', component: PlaceholderComponent },
      { path: 'users', component: PlaceholderComponent }
    ]
  },

  // Keep old routes for backward compatibility (optional)
  { path: 'voiture-create', redirectTo: '/voiture/create' },
  { path: 'voiture-list', redirectTo: '/voiture/list' },
  { path: 'voiture-old/:id', redirectTo: '/voiture/:id' },

  // Catch all
  { path: '**', redirectTo: '/dashboard' }
];
