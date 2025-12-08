import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthRoleService, UserRole } from '../services/auth-role.service';

interface CreateUserRequest {
  email: string;
  password: string;
  role: UserRole;
  fullName: string;
}

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './user-management.component.html',
  styleUrls: ['./user-management.component.css']
})
export class UserManagementComponent implements OnInit {
  formData: CreateUserRequest = {
    email: '',
    password: '',
    role: 'TEACHER',
    fullName: ''
  };

  isSubmitting = false;
  successMessage = '';
  errorMessage = '';
  deleteEmail = '';
  deleteSuccessMessage = '';
  deleteErrorMessage = '';
  isDeleting = false;
  isAdmin = false;

  roles: { value: UserRole; label: string }[] = [
    { value: 'ADMIN', label: 'Administrator' },
    { value: 'TEACHER', label: 'Teacher' }
  ];

  constructor(private authRoleService: AuthRoleService) {}

  ngOnInit(): void {
    this.isAdmin = this.authRoleService.getRole() === 'ADMIN';
    if (!this.isAdmin) {
      this.errorMessage = 'Access denied. Admin privileges required.';
    }
  }

  async onSubmit(): Promise<void> {
    if (!this.isAdmin) {
      this.errorMessage = 'Access denied. Admin privileges required.';
      return;
    }

    // Validate form
    if (!this.formData.email || !this.formData.email.trim()) {
      this.errorMessage = 'Email is required';
      return;
    }

    if (!this.formData.password || this.formData.password.length < 6) {
      this.errorMessage = 'Password must be at least 6 characters long';
      return;
    }

    if (!this.formData.role) {
      this.errorMessage = 'Role is required';
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';
    this.successMessage = '';

    try {
      // Check if user is authenticated
      if (!this.authRoleService.isAuthenticated()) {
        this.errorMessage = 'You must be logged in to create users. Please log in and try again.';
        this.isSubmitting = false;
        return;
      }

      // Check if user is admin
      const currentRole = this.authRoleService.getRole();
      if (currentRole !== 'ADMIN') {
        this.errorMessage = 'Access denied. Admin privileges required.';
        this.isSubmitting = false;
        return;
      }

      const token = this.authRoleService.getToken();
      if (!token) {
        this.errorMessage = 'Authentication token is missing. Please log in again.';
        this.isSubmitting = false;
        return;
      }

      // Build headers object for fetch
      const headersObj: Record<string, string> = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      };

      const response = await fetch('http://localhost:8080/api/auth/admin/users', {
        method: 'POST',
        headers: headersObj,
        body: JSON.stringify({
          email: this.formData.email.trim(),
          password: this.formData.password,
          role: this.formData.role,
          fullName: this.formData.fullName.trim() || null
        })
      });

      if (!response.ok) {
        // Try to parse error message
        let errorMessage = 'Failed to create user';
        
        // Check status code for better error messages
        if (response.status === 404) {
          errorMessage = 'Endpoint not found. Please ensure the server is running and the endpoint is available.';
        } else if (response.status === 403) {
          errorMessage = 'Access forbidden. You must be logged in as an administrator.';
        } else if (response.status === 401) {
          errorMessage = 'Unauthorized. Please log in again.';
        } else {
          try {
            const errorData = await response.json();
            errorMessage = errorData.message || errorData.error || `Server error (${response.status})`;
          } catch (e) {
            // If JSON parsing fails, try to get text
            try {
              const errorText = await response.text();
              if (errorText) {
                errorMessage = errorText;
              } else {
                errorMessage = `Server error (${response.status}): ${response.statusText}`;
              }
            } catch (e2) {
              errorMessage = `Server error (${response.status}): ${response.statusText}`;
            }
          }
        }
        this.errorMessage = errorMessage;
        this.isSubmitting = false;
        return;
      }

      const data = await response.json();

      // Success
      this.successMessage = `User created successfully! Email: ${data.email}, Role: ${data.role}`;
      
      // Reset form
      this.formData = {
        email: '',
        password: '',
        role: 'TEACHER',
        fullName: ''
      };

      // Clear success message after 5 seconds
      setTimeout(() => {
        this.successMessage = '';
      }, 5000);

    } catch (error) {
      console.error('Error creating user:', error);
      this.errorMessage = 'An error occurred while creating the user. Please try again.';
    } finally {
      this.isSubmitting = false;
    }
  }

  onRoleChange(): void {
    // Role-specific logic if needed
  }

  async deleteTeacher(): Promise<void> {
    if (!this.isAdmin) {
      this.deleteErrorMessage = 'Access denied. Admin privileges required.';
      return;
    }

    const email = this.deleteEmail.trim();
    if (!email) {
      this.deleteErrorMessage = 'Email is required to delete a teacher.';
      return;
    }

    this.isDeleting = true;
    this.deleteErrorMessage = '';
    this.deleteSuccessMessage = '';

    try {
      // Ensure token present
      const token = this.authRoleService.getToken();
      if (!token) {
        this.deleteErrorMessage = 'Authentication token is missing. Please log in again.';
        this.isDeleting = false;
        return;
      }

      const headersObj: Record<string, string> = {
        'Authorization': `Bearer ${token}`
      };

      const response = await fetch(`http://localhost:8080/api/admin/teachers/${encodeURIComponent(email)}`, {
        method: 'DELETE',
        headers: headersObj
      });

      if (!response.ok) {
        let errorMessage = 'Failed to delete teacher';
        if (response.status === 404) {
          errorMessage = 'Teacher not found';
        } else if (response.status === 403) {
          errorMessage = 'Access forbidden. You must be logged in as an administrator.';
        } else if (response.status === 401) {
          errorMessage = 'Unauthorized. Please log in again.';
        } else {
          try {
            const errorData = await response.json();
            errorMessage = errorData.message || errorData.error || `Server error (${response.status})`;
          } catch (e) {
            try {
              const errorText = await response.text();
              if (errorText) {
                errorMessage = errorText;
              } else {
                errorMessage = `Server error (${response.status}): ${response.statusText}`;
              }
            } catch (_) {
              errorMessage = `Server error (${response.status}): ${response.statusText}`;
            }
          }
        }
        this.deleteErrorMessage = errorMessage;
        this.isDeleting = false;
        return;
      }

      this.deleteSuccessMessage = `Teacher deleted successfully: ${email}`;
      this.deleteEmail = '';
    } catch (error) {
      console.error('Error deleting teacher:', error);
      this.deleteErrorMessage = 'An error occurred while deleting the teacher. Please try again.';
    } finally {
      this.isDeleting = false;
    }
  }
}

