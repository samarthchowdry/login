import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthRoleService } from '../services/auth-role.service';

/**
 * HTTP interceptor function for JWT token authentication.
 * Production-ready: Automatically adds JWT token to requests and handles 401 errors.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authRoleService = inject(AuthRoleService);
  const router = inject(Router);

  // Add JWT token to request if available
  const token = authRoleService.getToken();
  if (token) {
    req = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      // Handle 401 Unauthorized - token expired or invalid
      if (error.status === 401) {
        // Clear authentication and redirect to login
        authRoleService.clearRole();
        router.navigate(['/']);
      }
      return throwError(() => error);
    })
  );
};

