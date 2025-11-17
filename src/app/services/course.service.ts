import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthRoleService } from './auth-role.service';

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

  constructor(private http: HttpClient, private authRoleService: AuthRoleService) {}

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
    return this.http.post<Course>(
      this.apiUrl,
      course,
      this.authRoleService.createRoleOptions()
    );
  }

  updateCourse(id: number, course: Course): Observable<Course> {
    return this.http.put<Course>(
      `${this.apiUrl}/${id}`,
      course,
      this.authRoleService.createRoleOptions()
    );
  }

  deleteCourse(id: number): Observable<void> {
    return this.http.delete<void>(
      `${this.apiUrl}/${id}`,
      this.authRoleService.createRoleOptions()
    );
  }

  addStudentToCourse(courseId: number, studentId: number): Observable<Course> {
    return this.http.post<Course>(
      `${this.apiUrl}/${courseId}/students/${studentId}`,
      {},
      this.authRoleService.createRoleOptions()
    );
  }

  removeStudentFromCourse(courseId: number, studentId: number): Observable<Course> {
    return this.http.delete<Course>(
      `${this.apiUrl}/${courseId}/students/${studentId}`,
      this.authRoleService.createRoleOptions()
    );
  }

  getCoursesByStudent(studentId: number): Observable<Course[]> {
    return this.http.get<Course[]>(
      `${this.apiUrl}/student/${studentId}`,
      this.authRoleService.createRoleOptions()
    );
  }

  getCoursesCount(): Observable<number> {
    return this.http.get<number>(`${this.apiUrl}/count`);
  }
}

