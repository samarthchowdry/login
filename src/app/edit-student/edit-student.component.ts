import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { StudentService, Student } from '../services/student.service';

@Component({
  selector: 'app-edit-student',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, RouterModule],
  templateUrl: './edit-student.component.html',
  styleUrl: './edit-student.component.css'
})
export class EditStudentComponent implements OnInit {
  studentForm: FormGroup;
  isSubmitting = false;
  submitMessage = '';
  studentId: number | null = null;
  isLoading = true;

  constructor(
    private fb: FormBuilder,
    private studentService: StudentService,
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.studentForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      dob: ['', [Validators.required, this.dateValidator.bind(this)]]
    });
  }

  ngOnInit(): void {
    this.studentId = +this.route.snapshot.paramMap.get('id')!;
    this.loadStudent();
  }

  loadStudent(): void {
    if (this.studentId) {
      this.studentService.getStudentById(this.studentId).subscribe({
        next: (student) => {
          this.studentForm.patchValue({
            name: student.name,
            dob: student.dob
          });
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading student:', error);
          this.submitMessage = 'Error loading student. Please try again.';
          this.isLoading = false;
        }
      });
    }
  }

  // Custom date validator
  dateValidator(control: any) {
    if (!control.value) {
      return null;
    }
    
    const date = new Date(control.value);
    const today = new Date();
    
    if (isNaN(date.getTime()) || date > today) {
      return { invalidDate: true };
    }
    
    return null;
  }

  onSubmit(): void {
    if (this.studentForm.valid && this.studentId) {
      this.isSubmitting = true;
      this.submitMessage = '';

      const formData = this.studentForm.value;
      
      // Ensure date is in YYYY-MM-DD format
      if (formData.dob) {
        const date = new Date(formData.dob);
        formData.dob = date.toISOString().split('T')[0];
      }
      
      console.log('Updating student:', formData);
      
      this.studentService.updateStudent(this.studentId, formData).subscribe({
        next: (response) => {
          console.log('Student updated successfully:', response);
          this.submitMessage = 'Student updated successfully!';
          this.isSubmitting = false;
          
          // Navigate back to student list after 2 seconds
          setTimeout(() => {
            this.router.navigate(['/student-list']);
          }, 2000);
        },
        error: (error) => {
          console.error('Error updating student:', error);
          this.submitMessage = 'Error updating student. Please try again.';
          this.isSubmitting = false;
        }
      });
    } else {
      this.markFormGroupTouched();
    }
  }

  private markFormGroupTouched(): void {
    Object.keys(this.studentForm.controls).forEach(key => {
      const control = this.studentForm.get(key);
      control?.markAsTouched();
    });
  }

  getFieldError(fieldName: string): string {
    const field = this.studentForm.get(fieldName);
    if (field?.errors && field.touched) {
      if (field.errors['required']) {
        return `${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)} is required`;
      }
      if (field.errors['minlength']) {
        return `${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)} must be at least ${field.errors['minlength'].requiredLength} characters`;
      }
      if (field.errors['invalidDate']) {
        return 'Please enter a valid date (not in the future)';
      }
    }
    return '';
  }
}
