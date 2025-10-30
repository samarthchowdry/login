import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { StudentService, Student } from '../services/student.service';

@Component({
  selector: 'app-student-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './student-list.component.html',
  styleUrls: ['./student-list.component.css']
})
export class StudentListComponent implements OnInit {
  students: Student[] = [];
  filteredStudents: Student[] = [];
  isLoading = false;
  errorMessage = '';

  filters = {
    name: '',
    dob: '',
    email: '',
    branch: ''
  };

  currentPage = 1;
  itemsPerPage = 10;

  constructor(private studentService: StudentService) {}

  ngOnInit(): void {
    this.loadStudents();
  }

  /** 🔹 Load Students from Backend */
  loadStudents(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.studentService.getStudents(this.filters).subscribe({
      next: (students) => {
        this.students = students;
        this.filteredStudents = [...this.students];
        this.isLoading = false;
        this.currentPage = 1;
        console.log(' Students loaded:', students);
      },
      error: (error) => {
        console.error('Error loading students:', error);
        this.errorMessage = 'Error loading students. Please try again.';
        this.isLoading = false;
      }
    });
  }

  //Search Button Click 
  onSearch(): void {
    this.loadStudents();
  }

  //Reset Filters 
  onReset(): void {
    this.filters = {
      name: '',
      dob: '',
      email: '',
      branch: ''
    };
    this.loadStudents();
  }

  //Pagination Logic 
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

  // Delete Student
  deleteStudent(id: number): void {
    if (!confirm('Are you sure you want to delete this student?')) return;

    this.studentService.deleteStudent(id).subscribe({
      next: () => {
        console.log(`Student with ID ${id} deleted successfully`);

        // Remove deleted student locally (avoids reloading)
        this.students = this.students.filter(student => student.id !== id);
        this.filteredStudents = this.filteredStudents.filter(student => student.id !== id);

        // Adjust pagination safely
        if (this.currentPage > this.totalPages) {
          this.currentPage = this.totalPages || 1;
        }

        alert('Student deleted successfully.');
      },
      error: (error) => {
        console.error('Error deleting student:', error);
        alert('Error deleting student. Please try again.');
      }
    });
  }

  // Utility: Format Date 
  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  }

  // Utility: Calculate Age 
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
