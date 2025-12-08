import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AuthRoleService, UserRole } from '../services/auth-role.service';
import { StudentService, Student } from '../services/student.service';
import { CourseService, Course } from '../services/course.service';

@Component({
  selector: 'app-student-management',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './student-management.component.html',
  styleUrls: ['./student-management.component.css']
})
export class StudentManagementComponent implements OnInit {
  // Form data for creating new student
  formData: Partial<Student> = {
    name: '',
    dob: '',
    email: '',
    address: '',
    branch: '',
    password: '',
    courseIds: []
  };

  // List of students
  students: Student[] = [];
  courses: Course[] = [];
  selectedCourseIds: number[] = [];

  // UI state
  isSubmitting = false;
  successMessage = '';
  errorMessage = '';
  isTeacher = false;
  isAdmin = false;
  isLoadingStudents = false;
  isLoadingCourses = false;

  // Delete student
  deleteStudentId: number | null = null;
  deleteEmail = '';
  deleteSuccessMessage = '';
  deleteErrorMessage = '';
  isDeleting = false;

  constructor(
    private authRoleService: AuthRoleService,
    private studentService: StudentService,
    private courseService: CourseService
  ) {}

  ngOnInit(): void {
    const role = this.authRoleService.getRole();
    this.isTeacher = role === 'TEACHER';
    this.isAdmin = role === 'ADMIN';
    
    if (!this.isTeacher && !this.isAdmin) {
      this.errorMessage = 'Access denied. Teacher or Admin privileges required.';
      return;
    }

    this.loadStudents();
    this.loadCourses();
  }

  loadStudents(): void {
    this.isLoadingStudents = true;
    this.studentService.getStudents({}).subscribe({
      next: (students) => {
        this.students = students;
        this.isLoadingStudents = false;
      },
      error: (error) => {
        console.error('Error loading students:', error);
        this.errorMessage = 'Failed to load students. Please try again.';
        this.isLoadingStudents = false;
      }
    });
  }

  loadCourses(): void {
    this.isLoadingCourses = true;
    this.courseService.getCourses({}).subscribe({
      next: (courses) => {
        this.courses = courses;
        this.isLoadingCourses = false;
      },
      error: (error) => {
        console.error('Error loading courses:', error);
        this.isLoadingCourses = false;
      }
    });
  }

  toggleCourse(courseId: number): void {
    const index = this.selectedCourseIds.indexOf(courseId);
    if (index > -1) {
      this.selectedCourseIds.splice(index, 1);
    } else {
      this.selectedCourseIds.push(courseId);
    }
  }

  isCourseSelected(courseId: number): boolean {
    return this.selectedCourseIds.includes(courseId);
  }

  async onSubmit(): Promise<void> {
    if (!this.isTeacher && !this.isAdmin) {
      this.errorMessage = 'Access denied. Teacher or Admin privileges required.';
      return;
    }

    // Validate form
    if (!this.formData.name || !this.formData.name.trim()) {
      this.errorMessage = 'Name is required';
      return;
    }

    if (!this.formData.dob) {
      this.errorMessage = 'Date of birth is required';
      return;
    }

    if (!this.formData.email || !this.formData.email.trim()) {
      this.errorMessage = 'Email is required';
      return;
    }

    if (!this.formData.address || !this.formData.address.trim()) {
      this.errorMessage = 'Address is required';
      return;
    }

    if (!this.formData.branch || !this.formData.branch.trim()) {
      this.errorMessage = 'Branch is required';
      return;
    }

    if (!this.formData.password || this.formData.password.trim().length < 6) {
      this.errorMessage = 'Password must be at least 6 characters long';
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';
    this.successMessage = '';

    try {
      // Format date
      const studentData: Student = {
        name: this.formData.name!.trim(),
        dob: this.formData.dob!,
        email: this.formData.email!.trim(),
        address: this.formData.address!.trim(),
        branch: this.formData.branch!.trim(),
        password: this.formData.password!.trim(),
        courseIds: this.selectedCourseIds.length > 0 ? this.selectedCourseIds : undefined
      };

      this.studentService.createStudent(studentData).subscribe({
        next: (response) => {
          this.successMessage = `Student created successfully! Name: ${response.name}, ID: ${response.id}`;
          this.resetForm();
          this.loadStudents(); // Refresh list
          
          // Clear success message after 5 seconds
          setTimeout(() => {
            this.successMessage = '';
          }, 5000);
        },
        error: (error) => {
          console.error('Error creating student:', error);
          let errorMessage = 'Failed to create student';
          
          if (error.error && error.error.message) {
            errorMessage = error.error.message;
          } else if (error.message) {
            errorMessage = error.message;
          }
          
          this.errorMessage = errorMessage;
        },
        complete: () => {
          this.isSubmitting = false;
        }
      });
    } catch (error) {
      console.error('Error creating student:', error);
      this.errorMessage = 'An error occurred while creating the student. Please try again.';
      this.isSubmitting = false;
    }
  }

  resetForm(): void {
    this.formData = {
      name: '',
      dob: '',
      email: '',
      address: '',
      branch: '',
      password: '',
      courseIds: []
    };
    this.selectedCourseIds = [];
  }

  async deleteStudent(): Promise<void> {
    if (!this.isTeacher && !this.isAdmin) {
      this.deleteErrorMessage = 'Access denied. Teacher or Admin privileges required.';
      return;
    }

    const email = this.deleteEmail.trim();
    if (!email) {
      this.deleteErrorMessage = 'Email is required to delete a student.';
      return;
    }

    // Find student by email
    const student = this.students.find(s => s.email.toLowerCase() === email.toLowerCase());
    if (!student || !student.id) {
      this.deleteErrorMessage = 'Student not found with this email.';
      return;
    }

    if (!confirm(`Are you sure you want to delete student "${student.name}" (${student.email})? This action cannot be undone.`)) {
      return;
    }

    this.isDeleting = true;
    this.deleteErrorMessage = '';
    this.deleteSuccessMessage = '';

    try {
      this.studentService.deleteStudent(student.id).subscribe({
        next: () => {
          this.deleteSuccessMessage = `Student deleted successfully: ${student.name} (${student.email})`;
          this.deleteEmail = '';
          this.loadStudents(); // Refresh list
          
          setTimeout(() => {
            this.deleteSuccessMessage = '';
          }, 5000);
        },
        error: (error) => {
          console.error('Error deleting student:', error);
          let errorMessage = 'Failed to delete student';
          
          if (error.status === 404) {
            errorMessage = 'Student not found';
          } else if (error.status === 403) {
            errorMessage = 'Access forbidden. You do not have permission to delete students.';
          } else if (error.error && error.error.message) {
            errorMessage = error.error.message;
          }
          
          this.deleteErrorMessage = errorMessage;
        },
        complete: () => {
          this.isDeleting = false;
        }
      });
    } catch (error) {
      console.error('Error deleting student:', error);
      this.deleteErrorMessage = 'An error occurred while deleting the student. Please try again.';
      this.isDeleting = false;
    }
  }

  formatDate(dateString: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString();
  }
}


