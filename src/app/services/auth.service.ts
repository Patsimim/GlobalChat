// src/app/services/auth.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject, tap, catchError, throwError } from 'rxjs';
import { Router } from '@angular/router';
import { environment } from '../../environments/environment';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  firstName: string;
  lastName: string;
  email: string;
  country: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  token: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    country: string;
    createdAt: string;
  };
}

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  country: string;
  createdAt: string;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly API_URL = `${environment.apiUrl}/auth`;
  private readonly TOKEN_KEY = 'auth_token';
  private readonly USER_KEY = 'user_data';

  private currentUserSubject = new BehaviorSubject<User | null>(
    this.getUserFromStorage()
  );
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(private http: HttpClient, private router: Router) {
    if (environment.enableLogging) {
      console.log('🔗 Auth API URL:', this.API_URL);
      console.log('🏷️ App Name:', environment.appName);
      console.log('📊 Version:', environment.version);
      console.log('🏗️ Production:', environment.production);
    }
  }

  login(credentials: LoginRequest): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.API_URL}/login`, credentials)
      .pipe(
        tap((response) => {
          if (response.success && response.token) {
            this.setAuthData(response.token, response.user);
            if (environment.enableLogging) {
              console.log('✅ Login successful for:', response.user.email);
            }
          }
        }),
        catchError(this.handleError)
      );
  }

  // Register method
  register(userData: RegisterRequest): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.API_URL}/register`, userData)
      .pipe(
        tap((response) => {
          if (response.success && response.token) {
            this.setAuthData(response.token, response.user);
            if (environment.enableLogging) {
              console.log(
                '✅ Registration successful for:',
                response.user.email
              );
            }
          }
        }),
        catchError(this.handleError)
      );
  }

  // Get user profile
  getProfile(): Observable<any> {
    return this.http
      .get(`${this.API_URL}/profile`, {
        headers: this.getAuthHeaders(),
      })
      .pipe(
        tap((response) => {
          if (environment.enableLogging) {
            console.log('👤 Profile data fetched');
          }
        }),
        catchError(this.handleError)
      );
  }

  // Logout method
  logout(): void {
    if (environment.enableLogging) {
      console.log('👋 User logged out');
    }
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    this.currentUserSubject.next(null);
    this.router.navigate(['/login']);
  }

  // Check if user is logged in
  isLoggedIn(): boolean {
    const token = this.getToken();
    if (!token) return false;

    // Check if token is expired
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Date.now() / 1000;
      const isValid = payload.exp > currentTime;

      if (!isValid && environment.enableLogging) {
        console.log('⚠️ Token expired');
      }

      return isValid;
    } catch (error) {
      if (environment.enableLogging) {
        console.error('❌ Invalid token format:', error);
      }
      return false;
    }
  }

  // Get stored token
  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  // Get current user
  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  // Get API URL (useful for other services)
  getApiUrl(): string {
    return environment.apiUrl;
  }

  // Get Socket URL (for WebSocket connections)
  getSocketUrl(): string {
    return environment.socketUrl;
  }

  // Private methods
  private setAuthData(token: string, user: User): void {
    localStorage.setItem(this.TOKEN_KEY, token);
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
    this.currentUserSubject.next(user);
  }

  private getUserFromStorage(): User | null {
    const userData = localStorage.getItem(this.USER_KEY);
    return userData ? JSON.parse(userData) : null;
  }

  private getAuthHeaders(): HttpHeaders {
    const token = this.getToken();
    return new HttpHeaders({
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    });
  }

  private handleError(error: any): Observable<never> {
    if (environment.enableLogging) {
      console.error('❌ Auth service error:', error);
    }
    return throwError(() => error);
  }
}
