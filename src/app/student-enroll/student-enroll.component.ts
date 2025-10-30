import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { CourseService, Course } from '../services/course.service';
import { StudentService, Student } from '../services/student.service';

@Component({
  selector: 'app-student-enroll',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './student-enroll.component.html',
  styleUrls: ['./student-enroll.component.css']
})
export class StudentEnrollComponent implements OnInit {
  studentId: number | null = null;
  student: Student | null = null;
  allCourses: Course[] = [];
  enrolledCourseIds: number[] = [];
  isLoading = false;
  errorMessage = '';
  successMessage = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private studentService: StudentService,
    private courseService: CourseService
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.studentId = +id;
        this.loadStudent();
        this.loadAllCourses();
      }
    });
  }

  loadStudent(): void {
    if (!this.studentId) return;

    this.studentService.getStudentById(this.studentId).subscribe({
      next: (student) => {
        this.student = student;
        // Get currently enrolled course IDs
        this.enrolledCourseIds = student.courseIds || [];
      },
      error: (error) => {
        console.error('Error loading student:', error);
        this.errorMessage = 'Error loading student information';
      }
    });
  }

  loadAllCourses(): void {
    this.courseService.getCourses({}).subscribe({
      next: (courses) => {
        this.allCourses = courses;
      },
      error: (error) => {
        console.error('Error loading courses:', error);
        this.errorMessage = 'Error loading courses';
      }
    });
  }

  toggleEnrollment(courseId: number): void {
    const index = this.enrolledCourseIds.indexOf(courseId);
    if (index > -1) {
      this.enrolledCourseIds.splice(index, 1);
    } else {
      this.enrolledCourseIds.push(courseId);
    }
  }

  isEnrolled(courseId: number): boolean {
    return this.enrolledCourseIds.includes(courseId);
  }

  saveEnrollment(): void {
    if (!this.studentId || !this.student) {
      this.errorMessage = 'Student information is missing';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    // Update student with new course IDs - only send fields that backend expects
    const studentData: Student = {
      name: this.student.name,
      dob: this.student.dob,
      email: this.student.email,
      address: this.student.address,
      branch: this.student.branch,
      courseIds: this.enrolledCourseIds
    };

    console.log('Updating enrollment with data:', studentData);
    console.log('Course IDs:', this.enrolledCourseIds);

    this.studentService.updateStudent(this.studentId, studentData).subscribe({
      next: (updatedStudent) => {
        console.log('Successfully updated student:', updatedStudent);
        this.successMessage = 'Enrollment updated successfully!';
        this.isLoading = false;
        // Reload student to reflect changes
        this.loadStudent();
        
        // Navigate back after 2 seconds
        setTimeout(() => {
          this.router.navigate(['/student-list']);
        }, 2000);
      },
      error: (error) => {
        console.error('Error updating enrollment:', error);
        console.error('Error status:', error.status);
        console.error('Error details:', error.error);
        
        let errorMsg = 'Error updating enrollment. Please try again.';
        if (error.error) {
          if (typeof error.error === 'string') {
            errorMsg = error.error;
          } else if (error.error.message) {
            errorMsg = error.error.message;
          } else if (error.error.error) {
            errorMsg = error.error.error;
          }
        }
        
        this.errorMessage = errorMsg;
        this.isLoading = false;
      }
    });
  }

  cancel(): void {
    this.router.navigate(['/student-list']);
  }

  getEnrolledCount(): number {
    return this.enrolledCourseIds.length;
  }

  getTotalCount(): number {
    return this.allCourses.length;
  }
}

