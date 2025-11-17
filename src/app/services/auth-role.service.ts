import { Injectable } from '@angular/core';
import { HttpHeaders } from '@angular/common/http';
import { BehaviorSubject } from 'rxjs';

export type UserRole = 'ADMIN' | 'TEACHER' | 'STUDENT';

@Injectable({
  providedIn: 'root',
})
export class AuthRoleService {
  private readonly storageKey = 'app.userRole';
  private readonly roleSubject = new BehaviorSubject<UserRole>(this.loadInitialRole());

  readonly role$ = this.roleSubject.asObservable();

  setRole(role: UserRole): void {
    this.roleSubject.next(role);
    if (this.hasStorageAccess()) {
      localStorage.setItem(this.storageKey, role);
    }
  }

  getRole(): UserRole {
    return this.roleSubject.value;
  }

  clearRole(): void {
    this.roleSubject.next('STUDENT');
    if (this.hasStorageAccess()) {
      localStorage.removeItem(this.storageKey);
    }
  }

  createRoleHeaders(extra: Record<string, string> = {}): HttpHeaders {
    let headers = new HttpHeaders(extra);
    const role = this.getRole();
    if (role) {
      headers = headers.set('X-Role', role);
    }
    return headers;
  }

  createRoleOptions(extra?: Record<string, string>): { headers?: HttpHeaders } {
    const headers = this.createRoleHeaders(extra ?? {});
    return headers.keys().length ? { headers } : {};
  }

  private loadInitialRole(): UserRole {
    if (!this.hasStorageAccess()) {
      return 'STUDENT';
    }
    const stored = localStorage.getItem(this.storageKey);
    if (stored === 'ADMIN' || stored === 'TEACHER' || stored === 'STUDENT') {
      return stored;
    }
    return 'STUDENT';
  }

  private hasStorageAccess(): boolean {
    return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
  }
}

