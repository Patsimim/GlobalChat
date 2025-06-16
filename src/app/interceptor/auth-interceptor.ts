// src/app/interceptors/auth.interceptor.ts
import { Injectable } from '@angular/core';
import {
  HttpInterceptor,
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpErrorResponse,
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(private authService: AuthService, private router: Router) {}

  intercept(
    req: HttpRequest<any>,
    next: HttpHandler
  ): Observable<HttpEvent<any>> {
    // Get the auth token from the service
    const authToken = this.authService.getToken();

    // Clone the request and add the authorization header if token exists
    let authReq = req;
    if (
      authToken &&
      !req.url.includes('/auth/login') &&
      !req.url.includes('/auth/register')
    ) {
      authReq = req.clone({
        setHeaders: {
          Authorization: `Bearer ${authToken}`,
        },
      });
    }

    // Handle the request
    return next.handle(authReq).pipe(
      catchError((error: HttpErrorResponse) => {
        // Handle 401 Unauthorized errors
        if (error.status === 401) {
          // Token is invalid or expired
          this.authService.logout();
          this.router.navigate(['/auth/login']);
        }

        // Handle 403 Forbidden errors
        if (error.status === 403) {
          console.error('Access forbidden:', error.error.message);
        }

        // Handle server errors (5xx)
        if (error.status >= 500) {
          console.error('Server error:', error.error.message);
        }

        return throwError(() => error);
      })
    );
  }
}
