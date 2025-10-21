import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { StudentService } from '../services/student.service';

@Component({
  selector: 'app-items',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, RouterModule],
  templateUrl: './items.component.html',
  styleUrl: './items.component.css'
})
export class ItemsComponent implements OnInit {
  itemForm: FormGroup;
  isSubmitting = false;
  submitMessage = '';

  constructor(
    private fb: FormBuilder,
    private studentService: StudentService
  ) {
    this.itemForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      dob: ['', [Validators.required, this.dateValidator.bind(this)]]
    });
  }

  // Custom date validator to ensure proper date format
  dateValidator(control: any) {
    if (!control.value) {
      return null;
    }
    
    const date = new Date(control.value);
    const today = new Date();
    
    // Check if date is valid and not in the future
    if (isNaN(date.getTime()) || date > today) {
      return { invalidDate: true };
    }
    
    return null;
  }

  ngOnInit(): void {
    // Log form initialization
    console.log('Form initialized with validators');
    console.log('Form controls:', this.itemForm.controls);
  }

  onSubmit(): void {
    if (this.itemForm.valid) {
      this.isSubmitting = true;
      this.submitMessage = '';

      const formData = this.itemForm.value;
      
      // Ensure date is in YYYY-MM-DD format
      if (formData.dob) {
        const date = new Date(formData.dob);
        formData.dob = date.toISOString().split('T')[0]; // Format as YYYY-MM-DD
      }
      
      console.log('Sending data to API:', formData);
      console.log('Data format check:');
      console.log('- Name:', formData.name);
      console.log('- DOB:', formData.dob);
      console.log('- DOB type:', typeof formData.dob);
      
      this.studentService.createStudent(formData).subscribe({
        next: (response) => {
          console.log('Student saved successfully to studentdb:', response);
          this.submitMessage = 'Student saved successfully to studentdb!';
          this.itemForm.reset();
          this.isSubmitting = false;
        },
        error: (error) => {
          console.error('Full error details:', error);
          console.error('Error status:', error.status);
          console.error('Error message:', error.message);
          console.error('Error body:', error.error);
          
          let errorMessage = 'Error saving student to studentdb. ';
          
          if (error.status === 0) {
            errorMessage += 'Cannot connect to server. Please check if your backend is running on http://localhost:8080';
          } else if (error.status === 404) {
            errorMessage += 'API endpoint not found. Please check the server configuration.';
          } else if (error.status === 500) {
            errorMessage += 'Server error. Please check the backend logs.';
          } else if (error.error && error.error.message) {
            errorMessage += `Server says: ${error.error.message}`;
          } else {
            errorMessage += `HTTP ${error.status}: ${error.message}`;
          }
          
          this.submitMessage = errorMessage;
          this.isSubmitting = false;
        }
      });
    } else {
      this.markFormGroupTouched();
    }
  }

  private markFormGroupTouched(): void {
    Object.keys(this.itemForm.controls).forEach(key => {
      const control = this.itemForm.get(key);
      control?.markAsTouched();
    });
  }

  getFieldError(fieldName: string): string {
    const field = this.itemForm.get(fieldName);
    if (field?.errors && field.touched) {
      if (field.errors['required']) {
        return `${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)} is required`;
      }
      if (field.errors['email']) {
        return 'Please enter a valid email address';
      }
      if (field.errors['minlength']) {
        return `${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)} must be at least ${field.errors['minlength'].requiredLength} characters`;
      }
      if (field.errors['pattern']) {
        return 'Please enter a valid phone number';
      }
      if (field.errors['invalidDate']) {
        return 'Please enter a valid date (not in the future)';
      }
    }
    return '';
  }
}
