import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Course {
  id?: number;
  name: string;
  code: string;
  description?: string;
  credits?: number;
  studentIds?: number[];
  studentNames?: string[];
}

@Injectable({
  providedIn: 'root'
})
export class CourseService {
  private apiUrl = 'http://localhost:8080/courses'; 

  constructor(private http: HttpClient) {}

  getCourses(filters: {
    name?: string;
    code?: string;
  }): Observable<Course[]> {
    let params = new HttpParams();

    Object.keys(filters).forEach((key) => {
      const value = (filters as any)[key];
      if (value && value.trim() !== '') {
        params = params.set(key, value);
      }
    });

    return this.http.get<Course[]>(this.apiUrl, { params });
  }

  getCourseById(id: number): Observable<Course> {
    return this.http.get<Course>(`${this.apiUrl}/${id}`);
  }

  createCourse(course: Course): Observable<Course> {
    return this.http.post<Course>(this.apiUrl, course);
  }

  updateCourse(id: number, course: Course): Observable<Course> {
    return this.http.put<Course>(`${this.apiUrl}/${id}`, course);
  }

  deleteCourse(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  addStudentToCourse(courseId: number, studentId: number): Observable<Course> {
    return this.http.post<Course>(`${this.apiUrl}/${courseId}/students/${studentId}`, {});
  }

  removeStudentFromCourse(courseId: number, studentId: number): Observable<Course> {
    return this.http.delete<Course>(`${this.apiUrl}/${courseId}/students/${studentId}`);
  }

  getCoursesByStudent(studentId: number): Observable<Course[]> {
    return this.http.get<Course[]>(`${this.apiUrl}/student/${studentId}`);
  }
}

