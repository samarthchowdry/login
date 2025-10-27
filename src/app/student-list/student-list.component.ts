import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { StudentService, Student } from '../services/student.service';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-student-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './student-list.component.html',
  styleUrls: ['./student-list.component.css']
})
export class StudentListComponent implements OnInit {
  students: Student[] = [];
  filteredStudents: Student[] = []; // Used for pagination
  isLoading = false;
  errorMessage = '';

  // 🔹 Filters for search
  filters = {
    name: '',
    dob: '',
    email: '',
    branch: ''
  };

  // 🔹 Pagination variables
  currentPage = 1;
  itemsPerPage = 10;

  constructor(private studentService: StudentService) {}

  ngOnInit(): void {
    this.loadStudents();
  }

  // 🔹 Load students from backend with filters
  loadStudents(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.studentService.getStudents(this.filters).subscribe({
      next: (students) => {
        this.students = students;
        this.filteredStudents = [...this.students];
        this.isLoading = false;
        this.currentPage = 1; // reset pagination
        console.log('Students loaded:', students);
      },
      error: (error) => {
        console.error('Error loading students:', error);
        this.errorMessage = 'Error loading students. Please try again.';
        this.isLoading = false;
      }
    });
  }

  // 🔹 Called when Search button is clicked
  onSearch(): void {
    this.loadStudents();
  }

  // 🔹 Called when Reset button is clicked
  onReset(): void {
    this.filters = {
      name: '',
      dob: '',
      email: '',
      branch: ''
    };
    this.loadStudents();
  }

  // 🔹 Pagination Logic
  get totalPages(): number {
    return Math.ceil(this.filteredStudents.length / this.itemsPerPage);
  }

  get paginatedStudents(): Student[] {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    const end = start + this.itemsPerPage;
    return this.filteredStudents.slice(start, end);
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

  // 🔹 Delete student
  deleteStudent(id: number): void {
    if (confirm('Are you sure you want to delete this student?')) {
      this.studentService.deleteStudent(id).subscribe({
        next: () => {
          console.log('Student deleted successfully');
          this.loadStudents();
        },
        error: (error) => {
          console.error('Error deleting student:', error);
          alert('Error deleting student. Please try again.');
        }
      });
    }
  }

  // 🔹 Utility methods
  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  }

  calculateAge(dateString: string): number {
    const today = new Date();
    const birthDate = new Date(dateString);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  }
}
