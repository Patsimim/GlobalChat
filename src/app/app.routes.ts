// src/app/app.routes.ts
import { Routes } from '@angular/router';
import { LoginComponent } from './auth/login/login';
import { RegisterComponent } from './auth/register/register';
import { Home } from './home/home';
import { AuthGuard } from './guards/auth.guard';
import { GuestGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  {
    path: 'login',
    component: LoginComponent,
    canActivate: [GuestGuard], // Prevent logged-in users from accessing login
  },
  {
    path: 'register',
    component: RegisterComponent,
    canActivate: [GuestGuard], // Prevent logged-in users from accessing register
  },
  {
    path: 'home',
    component: Home,
    canActivate: [AuthGuard], // Protect home route - require authentication
  },
  // Add any other routes you might have
  { path: '**', redirectTo: '/login' }, // Catch-all route
];
