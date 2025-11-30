import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { AuthRoleService, UserRole } from './auth-role.service';

export interface RoleUpdateRequest {
  email?: string;
  googleSub?: string;
  role: UserRole;
}

export interface RoleUpdateResponse {
  email: string;
  googleSub?: string;
  name?: string;
  role: UserRole;
}

@Injectable({
  providedIn: 'root',
})
export class UserAdminService {
  private readonly apiUrl = 'http://localhost:8080/api/auth/role';

  constructor(private http: HttpClient, private authRoleService: AuthRoleService) {}

  updateRole(payload: RoleUpdateRequest): Observable<RoleUpdateResponse> {
    const headers = this.authRoleService.createRoleHeaders({
      'Content-Type': 'application/json',
    });
    return this.http
      .patch<RoleUpdateResponse | string>(this.apiUrl, payload, {
        headers,
        responseType: 'text' as 'json',
      })
      .pipe(
        map((response) =>
          typeof response === 'string' ? JSON.parse(response) : response
        )
      );
  }
}

