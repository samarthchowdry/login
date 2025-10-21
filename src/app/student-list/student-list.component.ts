import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { StudentService, Student } from '../services/student.service';

@Component({
  selector: 'app-student-list',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './student-list.component.html',
  styleUrl: './student-list.component.css'
})
export class StudentListComponent implements OnInit {
  students: Student[] = [];
  isLoading = false;
  errorMessage = '';

  constructor(private studentService: StudentService) { }

  ngOnInit(): void {
    this.loadStudents();
  }

  loadStudents(): void {
    this.isLoading = true;
    this.errorMessage = '';
    
    this.studentService.getAllStudents().subscribe({
      next: (students) => {
        this.students = students;
        this.isLoading = false;
        console.log('Students loaded:', students);
      },
      error: (error) => {
        console.error('Error loading students:', error);
        this.errorMessage = 'Error loading students. Please try again.';
        this.isLoading = false;
      }
    });
  }

  deleteStudent(id: number): void {
    if (confirm('Are you sure you want to delete this student?')) {
      this.studentService.deleteStudent(id).subscribe({
        next: () => {
          console.log('Student deleted successfully');
          this.loadStudents(); // Reload the list
        },
        error: (error) => {
          console.error('Error deleting student:', error);
          alert('Error deleting student. Please try again.');
        }
      });
    }
  }

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
