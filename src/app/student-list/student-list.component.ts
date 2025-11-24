import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { StudentService, Student } from '../services/student.service';
import { AuthRoleService, UserRole } from '../services/auth-role.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-student-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './student-list.component.html',
  styleUrls: ['./student-list.component.css']
})
export class StudentListComponent implements OnInit, OnDestroy {
  students: Student[] = [];
  filteredStudents: Student[] = [];
  isLoading = false;
  errorMessage = '';
  bulkMessage = '';
  bulkUploading = false;
  userRole: UserRole = 'STUDENT';
  private roleSub?: Subscription;

  filters = {
    id: '',
    name: '',
    dob: '',
    email: '',
    branch: ''
  };

  currentPage = 1;
  itemsPerPage = 5;
  readonly itemsPerPageOptions = [5, 10, 20, 50];
  private readonly visiblePageCount = 7;

  constructor(
    private studentService: StudentService,
    private authRoleService: AuthRoleService
  ) {}

  ngOnInit(): void {
    this.roleSub = this.authRoleService.role$.subscribe((role) => {
      this.userRole = role;
    });
    this.loadStudents();
  }

  ngOnDestroy(): void {
    this.roleSub?.unsubscribe();
  }

  // Bulk upload
  onFileSelected(event: Event): void {
    if (!this.canManageStudents) {
      alert('You do not have permission to upload students.');
      return;
    }
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    const file = input.files[0];
    this.bulkUploading = true;
    this.bulkMessage = '';
    this.studentService.bulkUpload(file).subscribe({
      next: (msg) => {
        this.bulkMessage = msg;
        this.bulkUploading = false;
        this.loadStudents();
        if (input) input.value = '';
      },
      error: (err) => {
        console.error('Bulk upload failed:', err);
        this.bulkMessage = 'Bulk upload failed. Please check file format and try again.';
        this.bulkUploading = false;
        if (input) input.value = '';
      }
    });
  }

  /**  Load Students from Backend */
  loadStudents(): void {
    const idFilter = this.filters.id?.toString().trim();
    if (idFilter) {
      this.searchStudentById(idFilter);
      return;
    }

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
    const idFilter = this.filters.id?.toString().trim();
    if (idFilter) {
      this.searchStudentById(idFilter);
      return;
    }
    this.loadStudents();
  }

  //Reset Filters 
  onReset(): void {
    this.filters = {
      id: '',
      name: '',
      dob: '',
      email: '',
      branch: ''
    };
    this.loadStudents();
  }

  //Pagination Logic 
  get totalPages(): number {
    const total = Math.ceil(this.filteredStudents.length / this.itemsPerPage);
    return total > 0 ? total : 1;
  }

  get pageButtons(): number[] {
    const total = this.totalPages;
    const blockIndex = Math.floor((this.currentPage - 1) / this.visiblePageCount);
    const start = blockIndex * this.visiblePageCount + 1;
    const end = Math.min(start + this.visiblePageCount - 1, total);

    const pages: number[] = [];
    for (let page = start; page <= end; page++) {
      pages.push(page);
    }
    return pages;
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

  onItemsPerPageChange(value: string): void {
    const parsed = Number(value);
    if (!Number.isNaN(parsed) && parsed > 0) {
      this.itemsPerPage = parsed;
      this.currentPage = 1;
    }
  }

  // Delete Student
  deleteStudent(id: number): void {
    if (this.userRole !== 'ADMIN') {
      alert('You do not have permission to delete students.');
      return;
    }
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

  get canManageStudents(): boolean {
    return this.userRole === 'ADMIN' || this.userRole === 'TEACHER';
  }

  get canDeleteStudents(): boolean {
    return this.userRole === 'ADMIN';
  }

  get canViewMarksCard(): boolean {
    return true;
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

  private searchStudentById(idValue: string): void {
    const parsedId = Number(idValue);
    if (Number.isNaN(parsedId) || parsedId <= 0) {
      this.errorMessage = 'Please enter a valid numeric ID.';
      this.students = [];
      this.filteredStudents = [];
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    this.studentService.getStudentById(parsedId).subscribe({
      next: (student) => {
        this.students = student ? [student] : [];
        this.filteredStudents = [...this.students];
        this.currentPage = 1;
        this.isLoading = false;
        if (!student) {
          this.errorMessage = `No student found with ID ${parsedId}.`;
        }
      },
      error: (error) => {
        console.error('Error fetching student by ID:', error);
        if (error.status === 404) {
          this.errorMessage = `No student found with ID ${parsedId}.`;
        } else {
          this.errorMessage = 'Error searching by ID. Please try again.';
        }
        this.students = [];
        this.filteredStudents = [];
        this.isLoading = false;
      }
    });
  }
}
