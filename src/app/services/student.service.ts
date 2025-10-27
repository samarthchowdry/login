import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Student {
  id?: number;
  name: string;
  dob: string;
  email: string;
  address: string;
  branch: string;
}

@Injectable({
  providedIn: 'root'
})
export class StudentService {
  private apiUrl = 'http://localhost:8080/students'; 

  constructor(private http: HttpClient) {}

  /**
   * Get students with optional filters.
   * Sends query parameters like:
   *   GET /students?name=John&email=gmail&dob=2000-05-10
   */
  getStudents(filters: {
    name?: string;
    dob?: string;
    email?: string;
    address?: string;
    branch?: string;
  }): Observable<Student[]> {
    let params = new HttpParams();

    // Only add non-empty filters
    Object.keys(filters).forEach((key) => {
      const value = (filters as any)[key];
      if (value && value.trim() !== '') {
        params = params.set(key, value);
      }
    });

    return this.http.get<Student[]>(this.apiUrl, { params });
  }

  // Get single student by ID
  getStudentById(id: number): Observable<Student> {
    return this.http.get<Student>(`${this.apiUrl}/${id}`);
  }

  // Create new student
  createStudent(student: Student): Observable<Student> {
    return this.http.post<Student>(this.apiUrl, student);
  }

  // Update existing student
  updateStudent(id: number, student: Student): Observable<Student> {
    return this.http.put<Student>(`${this.apiUrl}/${id}`, student);
  }

  // Delete student by ID
  deleteStudent(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
