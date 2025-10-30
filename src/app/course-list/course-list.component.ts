import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { CourseService, Course } from '../services/course.service';

@Component({
  selector: 'app-course-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './course-list.component.html',
  styleUrls: ['./course-list.component.css']
})
export class CourseListComponent implements OnInit {
  courses: Course[] = [];
  filteredCourses: Course[] = [];
  isLoading = false;
  errorMessage = '';

  filters = {
    name: '',
    code: ''
  };

  currentPage = 1;
  itemsPerPage = 10;

  constructor(
    private courseService: CourseService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadCourses();
  }

  loadCourses(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.courseService.getCourses(this.filters).subscribe({
      next: (courses) => {
        this.courses = courses;
        this.filteredCourses = [...this.courses];
        this.isLoading = false;
        this.currentPage = 1;
        console.log('Courses loaded:', courses);
      },
      error: (error) => {
        console.error('Error loading courses:', error);
        this.errorMessage = 'Error loading courses. Please try again.';
        this.isLoading = false;
      }
    });
  }

  onSearch(): void {
    this.loadCourses();
  }

  onReset(): void {
    this.filters = { name: '', code: '' };
    this.loadCourses();
  }

  get totalPages(): number {
    return Math.ceil(this.filteredCourses.length / this.itemsPerPage);
  }

  get paginatedCourses(): Course[] {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    const end = start + this.itemsPerPage;
    return this.filteredCourses.slice(start, end);
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) this.currentPage++;
  }

  prevPage(): void {
    if (this.currentPage > 1) this.currentPage--;
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) this.currentPage = page;
  }

  deleteCourse(id: number): void {
    if (confirm('Are you sure you want to delete this course?')) {
      this.courseService.deleteCourse(id).subscribe({
        next: () => {
          console.log('Course deleted successfully');
          this.loadCourses();
        },
        error: (error) => {
          console.error('Error deleting course:', error);
          alert('Error deleting course. Please try again.');
        }
      });
    }
  }

  onUpdate(id: number): void {
    this.router.navigate(['/course-update', id]);
  }
}
