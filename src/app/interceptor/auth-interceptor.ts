import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  // Inject services using the inject() function
  const authService = inject(AuthService);
  const router = inject(Router);

  // Debug logging
  console.log(`🚀 INTERCEPTOR: ${req.method} ${req.url}`);

  // Get the auth token from the service
  const authToken = authService.getToken();
  console.log(`🔑 INTERCEPTOR: Token exists = ${!!authToken}`);

  if (authToken) {
    console.log(
      `🔑 INTERCEPTOR: Token preview = ${authToken.substring(0, 30)}...`
    );
  }

  // Skip auth for login/register
  const skipAuthUrls = ['/auth/login', '/auth/register'];
  const shouldSkipAuth = skipAuthUrls.some((url) => req.url.includes(url));

  // Clone the request and add the authorization header if token exists
  let authReq = req;
  if (authToken && !shouldSkipAuth) {
    authReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
    });
    console.log(`✅ INTERCEPTOR: Added Authorization header to ${req.url}`);
  } else if (shouldSkipAuth) {
    console.log(`⚠️ INTERCEPTOR: Skipping auth for ${req.url}`);
  } else {
    console.log(`❌ INTERCEPTOR: No token available for ${req.url}`);
  }

  // Handle the request
  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      console.error(
        `❌ INTERCEPTOR ERROR: ${error.status} for ${req.method} ${req.url}`
      );
      console.error('❌ INTERCEPTOR ERROR DETAILS:', error);

      // Handle 401 Unauthorized errors
      if (error.status === 401) {
        console.log('🔒 INTERCEPTOR: 401 Unauthorized - logging out');
        authService.logout();
      }

      // Handle 403 Forbidden errors
      if (error.status === 403) {
        console.error(
          '🚫 INTERCEPTOR: Access forbidden:',
          error.error?.message
        );
      }

      // Handle server errors (5xx)
      if (error.status >= 500) {
        console.error('🔥 INTERCEPTOR: Server error:', error.error?.message);
      }

      return throwError(() => error);
    })
  );
};
