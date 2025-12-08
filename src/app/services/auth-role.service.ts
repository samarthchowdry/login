import { Injectable } from '@angular/core';
import { HttpHeaders } from '@angular/common/http';
import { BehaviorSubject } from 'rxjs';

export type UserRole = 'ADMIN' | 'TEACHER' | 'STUDENT';

@Injectable({
  providedIn: 'root',
})
export class AuthRoleService {
  private readonly roleStorageKey = 'app.userRole';
  private readonly tokenStorageKey = 'app.jwtToken';
  private readonly roleSubject = new BehaviorSubject<UserRole>(this.loadInitialRole());
  private readonly tokenSubject = new BehaviorSubject<string | null>(this.loadInitialToken());

  readonly role$ = this.roleSubject.asObservable();

  /**
   * Sets the user role and optionally the JWT token.
   * Production-ready: Stores JWT token for secure authentication.
   */
  setRole(role: UserRole, token?: string): void {
    this.roleSubject.next(role);
    if (this.hasStorageAccess()) {
      localStorage.setItem(this.roleStorageKey, role);
      if (token) {
        this.setToken(token);
      }
    }
  }

  /**
   * Sets the JWT token.
   */
  setToken(token: string): void {
    this.tokenSubject.next(token);
    if (this.hasStorageAccess()) {
      localStorage.setItem(this.tokenStorageKey, token);
    }
  }

  /**
   * Gets the current user role.
   */
  getRole(): UserRole {
    return this.roleSubject.value;
  }

  /**
   * Gets the current JWT token.
   */
  getToken(): string | null {
    return this.tokenSubject.value;
  }

  /**
   * Checks if user is authenticated (has valid token).
   * Production-ready: Validates token expiration client-side.
   */
  isAuthenticated(): boolean {
    const token = this.getToken();
    if (!token || token.trim() === '') {
      return false;
    }
    
    // Check if token is expired (basic check - decode JWT payload)
    try {
      const payload = this.decodeTokenPayload(token);
      if (payload && payload.exp) {
        const expirationTime = payload.exp * 1000; // Convert to milliseconds
        const currentTime = Date.now();
        if (currentTime >= expirationTime) {
          // Token expired, clear it
          this.clearRole();
          return false;
        }
      }
      return true;
    } catch (_) {
      // Invalid token format
      this.clearRole();
      return false;
    }
  }

  /**
   * Decodes JWT token payload (without verification).
   * Used for client-side expiration check only.
   * Note: This does not verify the token signature - server-side validation is required.
   */
  private decodeTokenPayload(token: string): any {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(jsonPayload);
    } catch (_) {
      return null;
    }
  }

  /**
   * Clears authentication data (logout).
   */
  clearRole(): void {
    this.roleSubject.next('STUDENT');
    this.tokenSubject.next(null);
    if (this.hasStorageAccess()) {
      localStorage.removeItem(this.roleStorageKey);
      localStorage.removeItem(this.tokenStorageKey);
    }
  }

  /**
   * Creates HTTP headers with JWT token for authenticated requests.
   * Production-ready: Uses Authorization Bearer token (RFC 6750 standard).
   */
  createRoleHeaders(extra: Record<string, string> = {}): HttpHeaders {
    let headers = new HttpHeaders(extra);
    const token = this.getToken();
    
    if (token) {
      // Use standard Authorization header with Bearer token
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    
    return headers;
  }

  /**
   * Creates HTTP options with authentication headers.
   */
  createRoleOptions(extra?: Record<string, string>): { headers?: HttpHeaders } {
    const headers = this.createRoleHeaders(extra ?? {});
    return headers.keys().length > 0 ? { headers } : {};
  }

  /**
   * Loads initial role from localStorage.
   */
  private loadInitialRole(): UserRole {
    if (!this.hasStorageAccess()) {
      return 'STUDENT';
    }
    const stored = localStorage.getItem(this.roleStorageKey);
    if (stored === 'ADMIN' || stored === 'TEACHER' || stored === 'STUDENT') {
      return stored;
    }
    return 'STUDENT';
  }

  /**
   * Loads initial JWT token from localStorage.
   */
  private loadInitialToken(): string | null {
    if (!this.hasStorageAccess()) {
      return null;
    }
    return localStorage.getItem(this.tokenStorageKey);
  }

  /**
   * Checks if localStorage is available.
   */
  private hasStorageAccess(): boolean {
    return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
  }
}

