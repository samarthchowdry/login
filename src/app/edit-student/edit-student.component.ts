import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { StudentService, Student, StudentMark } from '../services/student.service';
import { AuthRoleService } from '../services/auth-role.service';
import { CourseService, Course } from '../services/course.service';

@Component({
  selector: 'app-edit-student',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, RouterModule],
  templateUrl: './edit-student.component.html',
  styleUrl: './edit-student.component.css'
})
export class EditStudentComponent implements OnInit {
  studentForm: FormGroup;
  markForm: FormGroup;
  isSubmitting = false;
  submitMessage = '';
  studentId: number | null = null;
  isLoading = true;
  isMarkSubmitting = false;
  markMessage = '';
  marks: StudentMark[] = [];
  isEditingMark = false;
  editingMarkId: number | null = null;
  enrolledCourses: Course[] = [];

  constructor(
    private fb: FormBuilder,
    private studentService: StudentService,
    private route: ActivatedRoute,
    private router: Router,
    private authRoleService: AuthRoleService,
    private courseService: CourseService
  ) {
    this.studentForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      dob: ['', [Validators.required, this.dateValidator.bind(this)]],
      email: ['', [Validators.required, Validators.email]],
      address: ['', [Validators.required, Validators.minLength(5)]],
      branch: ['', [Validators.required, Validators.minLength(2)]]
    });

    this.markForm = this.fb.group({
      subject: ['', [Validators.required, Validators.minLength(2)]],
      assessmentName: [''],
      score: [null, [Validators.required, Validators.min(0)]],
      maxScore: [null, [Validators.required, Validators.min(1)]],
      assessedOn: ['', this.assessedOnValidator],
      recordedBy: ['']
    });
  }

  ngOnInit(): void {
    const role = this.authRoleService.getRole();
    if (role !== 'ADMIN' && role !== 'TEACHER') {
      alert('You do not have permission to edit students.');
      this.router.navigate(['/student-list']);
      return;
    }
    this.studentId = +this.route.snapshot.paramMap.get('id')!;
    this.loadStudent();
    this.loadMarks();
    this.loadCourses();
  }

  loadStudent(): void {
    if (this.studentId) {
      this.studentService.getStudentById(this.studentId).subscribe({
        next: (student) => {
          this.studentForm.patchValue({
            name: student.name,
            dob: student.dob,
            email: student.email,
            address: student.address,
            branch: student.branch
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

  loadMarks(): void {
    if (!this.studentId) {
      return;
    }
    this.studentService.getMarks(this.studentId).subscribe({
      next: (marks) => {
        this.marks = marks;
      },
      error: (error) => {
        console.error('Error loading marks:', error);
      }
    });
  }

  loadCourses(): void {
    if (!this.studentId) {
      this.enrolledCourses = [];
      return;
    }

    this.courseService.getCoursesByStudent(this.studentId).subscribe({
      next: (courses) => {
        this.enrolledCourses = Array.isArray(courses) ? this.toDistinctCourses(courses) : [];
      },
      error: (error) => {
        console.error('Error loading enrolled courses:', error);
        this.enrolledCourses = [];
      }
    });
  }

  private toDistinctCourses(courses: Course[]): Course[] {
    const unique = new Map<string, Course>();
    courses.forEach((course) => {
      if (!course) {
        return;
      }

      const normalizedName = (course.name ?? '').trim().toLowerCase();
      const normalizedCode = (course.code ?? '').trim().toLowerCase();
      const keyParts = [
        course.id != null ? `id:${course.id}` : null,
        normalizedName ? `name:${normalizedName}` : null,
        normalizedCode ? `code:${normalizedCode}` : null,
      ].filter(Boolean);

      if (!keyParts.length) {
        return;
      }

      const key = keyParts.join('|');
      if (!unique.has(key)) {
        unique.set(key, course);
      }
    });
    return Array.from(unique.values());
  }

  // Custom date validator
  dateValidator(control: AbstractControl): ValidationErrors | null {
    const rawValue = control.value;
    if (!rawValue) {
      return null;
    }
    
    const parsed = new Date(rawValue);
    if (Number.isNaN(parsed.getTime())) {
      return { invalidDate: true };
    }

    const inputDate = new Date(parsed);
    const today = new Date();
    inputDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    
    if (inputDate > today) {
      return { futureDate: true };
    }
    
    return null;
  }

  assessedOnValidator = (control: AbstractControl): ValidationErrors | null => {
    const rawValue = control.value;
    if (!rawValue) {
      return null;
    }

    const parsed = new Date(rawValue);
    if (Number.isNaN(parsed.getTime())) {
      return { invalidDate: true };
    }

    const inputDate = new Date(parsed);
    const today = new Date();
    inputDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);

    if (inputDate > today) {
      return { futureDate: true };
    }

    return null;
  };

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

  onAddMark(): void {
    if (!this.studentId) {
      this.markMessage = 'Student not loaded.';
      return;
    }
    if (this.markForm.invalid) {
      this.markForm.markAllAsTouched();
      return;
    }

    const formValue = this.markForm.value;
    const payload: StudentMark = {
      subject: (formValue.subject || '').trim(),
      score: Number(formValue.score),
    };

    if (formValue.assessmentName && formValue.assessmentName.trim() !== '') {
      payload.assessmentName = formValue.assessmentName.trim();
    }

    payload.maxScore = Number(formValue.maxScore);

    const assessedValue: unknown = formValue.assessedOn;
    if (assessedValue instanceof Date) {
      payload.assessedOn = assessedValue.toISOString().split('T')[0];
    } else if (typeof assessedValue === 'string' && assessedValue.trim() !== '') {
      payload.assessedOn = assessedValue;
    }

    if (formValue.recordedBy && formValue.recordedBy.trim() !== '') {
      payload.recordedBy = formValue.recordedBy.trim();
    }

    this.isMarkSubmitting = true;
    this.markMessage = '';

    const request$ = this.isEditingMark && this.editingMarkId
      ? this.studentService.updateMark(this.studentId, this.editingMarkId, payload)
      : this.studentService.addMark(this.studentId, payload);

    request$.subscribe({
      next: () => {
        this.isMarkSubmitting = false;
        this.markMessage = this.isEditingMark ? 'Mark updated successfully.' : 'Mark recorded successfully.';
        this.markForm.reset();
        this.isEditingMark = false;
        this.editingMarkId = null;
        this.loadMarks();
      },
      error: (error) => {
        console.error('Error saving mark:', error);
        const message =
          typeof error?.error === 'string'
            ? error.error
            : error?.error?.message || 'Could not save mark.';
        this.markMessage = message;
        this.isMarkSubmitting = false;
      }
    });
  }

  startEditMark(mark: StudentMark): void {
    this.markForm.patchValue({
      subject: mark.subject || '',
      assessmentName: mark.assessmentName || '',
      score: mark.score ?? null,
      maxScore: mark.maxScore ?? null,
      assessedOn: mark.assessedOn || '',
      recordedBy: mark.recordedBy || ''
    });
    this.isEditingMark = true;
    this.editingMarkId = mark.id ?? null;
    this.markMessage = '';
  }

  cancelMarkEdit(): void {
    this.markForm.reset();
    this.isEditingMark = false;
    this.editingMarkId = null;
    this.markMessage = '';
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
      if (field.errors['futureDate']) {
        return 'Date of birth cannot be in the future';
      }
      if (field.errors['email']) {
        return 'Please enter a valid email address';
      }
    }
    return '';
  }

  get markControls() {
    return this.markForm.controls;
  }
}
