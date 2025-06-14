import { Routes } from '@angular/router';
import { LoginComponent } from './auth/login/login';
import { Home } from './home/home';

export const routes: Routes = [
  { path: '', redirectTo: '/home', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'home', component: Home },
];
