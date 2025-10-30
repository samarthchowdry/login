import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CourseService, Course } from '../services/course.service';

@Component({
  selector: 'app-course-add',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './course-add.component.html',
  styleUrls: ['./course-add.component.css']
})
export class CourseAddComponent {
  course: Course = {
    name: '',
    code: '',
    description: '',
    credits: undefined
  };

  isLoading = false;
  errorMessage = '';

  constructor(
    private courseService: CourseService,
    private router: Router
  ) {}

  onSubmit(): void {
    if (!this.validateForm()) {
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    this.courseService.createCourse(this.course).subscribe({
      next: (createdCourse) => {
        console.log('Course created successfully:', createdCourse);
        alert('Course created successfully!');
        this.router.navigate(['/course-list']);
      },
      error: (error) => {
        console.error('Error creating course:', error);
        this.errorMessage = 'Error creating course. Please try again.';
        this.isLoading = false;
      }
    });
  }

  validateForm(): boolean {
    if (!this.course.name || this.course.name.trim() === '') {
      this.errorMessage = 'Course name is required';
      return false;
    }
    if (!this.course.code || this.course.code.trim() === '') {
      this.errorMessage = 'Course code is required';
      return false;
    }
    if (this.course.credits !== undefined && this.course.credits < 0) {
      this.errorMessage = 'Credits must be a positive number';
      return false;
    }
    return true;
  }

  cancel(): void {
    this.router.navigate(['/course-list']);
  }
}

