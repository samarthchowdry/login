import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { CourseService, Course } from '../services/course.service';
import { AuthRoleService } from '../services/auth-role.service';

@Component({
  selector: 'app-course-update',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './course-update.component.html',
  styleUrls: ['./course-update.component.css']
})
export class CourseUpdateComponent implements OnInit {
  
  private route = inject(ActivatedRoute);
  private courseService = inject(CourseService);
  router = inject(Router);
  private authRoleService = inject(AuthRoleService);

  courseId!: number;
  course: Course = { id: 0, name: '', code: '', description: '', credits: 0 };
  isLoading = false;
  errorMessage = '';

  ngOnInit(): void {
    if (this.authRoleService.getRole() !== 'ADMIN') {
      alert('You do not have permission to update courses.');
      this.router.navigate(['/course-list']);
      return;
    }
    this.courseId = Number(this.route.snapshot.paramMap.get('id'));
    this.loadCourse();
  }

  loadCourse(): void {
    this.isLoading = true;
    this.courseService.getCourseById(this.courseId).subscribe({
      next: (data) => {
        this.course = data;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error loading course:', err);
        this.errorMessage = 'Could not load course details.';
        this.isLoading = false;
      }
    });
  }

  onSubmit(): void {
    this.isLoading = true;
    this.courseService.updateCourse(this.courseId, this.course).subscribe({
      next: () => {
        alert(' Course updated successfully!');
        this.router.navigate(['/course-list']);
      },
      error: (err) => {
        console.error('Error updating course:', err);
        alert('Error updating course. Please try again.');
        this.isLoading = false;
      }
    });
  }

 
  goBack(): void {
    this.router.navigate(['/course-list']);
  }
}
