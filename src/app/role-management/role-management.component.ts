import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { UserAdminService } from '../services/user-admin.service';
import { AuthRoleService, UserRole } from '../services/auth-role.service';

@Component({
  selector: 'app-role-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './role-management.component.html',
  styleUrls: ['./role-management.component.css'],
})
export class RoleManagementComponent {
  availableRoles: UserRole[] = ['ADMIN', 'TEACHER', 'STUDENT'];
  roleUpdateEmail = '';
  roleUpdateRole: UserRole = 'ADMIN';
  roleUpdateMessage = '';
  roleUpdateError = '';
  isUpdatingRole = false;
  isAdmin = false;

  constructor(
    private authRoleService: AuthRoleService,
    private userAdminService: UserAdminService
  ) {
    this.isAdmin = this.authRoleService.getRole() === 'ADMIN';
    this.authRoleService.role$.subscribe((role) => {
      this.isAdmin = role === 'ADMIN';
    });
  }

  assignRole(): void {
    if (!this.roleUpdateEmail || this.roleUpdateEmail.trim() === '') {
      this.roleUpdateError = 'Email is required to update role.';
      this.roleUpdateMessage = '';
      return;
    }

    this.roleUpdateError = '';
    this.roleUpdateMessage = '';
    this.isUpdatingRole = true;

    this.userAdminService
      .updateRole({
        email: this.roleUpdateEmail.trim(),
        role: this.roleUpdateRole,
      })
      .subscribe({
        next: (response) => {
          this.isUpdatingRole = false;
          this.roleUpdateMessage = `Updated ${response.email} to ${response.role}.`;
        },
        error: (error) => {
          this.isUpdatingRole = false;
          const serverMessage =
            typeof error?.error === 'string'
              ? error.error
              : error?.error?.message || error?.message || 'Could not update role.';
          this.roleUpdateError = serverMessage;
        },
      });
  }
}

