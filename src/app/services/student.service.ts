import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { AuthRoleService } from './auth-role.service';

export interface Student {
  id?: number;
  name: string;
  dob: string;
  email: string;
  address: string;
  branch: string;
  password?: string;
  courseIds?: number[];
  courseNames?: string[];
  marks?: StudentMark[];
}

export interface StudentMark {
  id?: number;
  subject: string;
  assessmentName?: string;
  score: number;
  maxScore?: number;
  grade?: string;
  assessedOn?: string;
  recordedBy?: string;
  recordedAt?: string;
}

export interface MarksCard {
  studentId: number;
  studentName: string;
  branch: string;
  email: string;
  dateOfBirth: string;
  courses: string[];
  marks: StudentMark[];
  totalScore?: number;
  totalMaxScore?: number;
  percentage?: number;
  overallGrade?: string;
  generatedOn: string;
}

export interface StudentPerformance {
  studentId: number;
  studentName: string;
  branch?: string;
  totalAssessments: number;
  totalScore: number;
  totalMaxScore: number;
  averageScore?: number;
  percentage?: number;
  lastAssessedOn?: string;
}

export interface StudentCourseSummary {
  courseId?: number;
  name?: string;
  code?: string;
  credits?: number;
}

export interface StudentSubjectAnalytics {
  subject: string;
  assessments: number;
  totalScore: number;
  totalMaxScore: number;
  averageScore?: number;
  percentage?: number;
}

export interface StudentProgressReport {
  studentId?: number;
  studentName?: string;
  branch?: string;
  courses: StudentCourseSummary[];
  subjects: StudentSubjectAnalytics[];
  totalAssessments: number;
  overallAverageScore?: number;
  overallPercentage?: number;
  lastAssessmentDate?: string;
}

export interface StudentProgressReportResponse {
  generatedAt?: string;
  totalStudents: number;
  totalAssessments: number;
  students: StudentProgressReport[];
}

@Injectable({
  providedIn: 'root'
})
export class StudentService {
  private apiUrl = 'http://localhost:8080/students'; 

  constructor(private http: HttpClient, private authRoleService: AuthRoleService) {}

  /** 🔹 Get students with optional filters */
  getStudents(filters: {
    id?: string | number;
    name?: string;
    dob?: string;
    email?: string;
    address?: string;
    branch?: string;
  }): Observable<Student[]> {
    let params = new HttpParams();

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        const trimmedValue =
          typeof value === 'string' ? value.trim() : value.toString().trim();
        if (trimmedValue !== '') {
          params = params.set(key, trimmedValue);
        }
      }
    });

    return this.http.get<Student[]>(this.apiUrl, {
      params,
      ...this.authRoleService.createRoleOptions()
    });
  }

  /**  Get single student by ID */
  getStudentById(id: number): Observable<Student> {
    return this.http.get<Student>(`${this.apiUrl}/${id}`, 
      this.authRoleService.createRoleOptions()
    );
  }

  /** Create new student */
  createStudent(student: Student): Observable<Student> {
    return this.http.post<Student>(
      this.apiUrl,
      student,
      this.authRoleService.createRoleOptions()
    );
  }

  /** Update existing student */
  updateStudent(id: number, student: Student): Observable<Student> {
    return this.http.put<Student>(
      `${this.apiUrl}/${id}`,
      student,
      this.authRoleService.createRoleOptions()
    );
  }

  /** Delete student (Fixed for Angular 18 and 204 responses) */
  deleteStudent(id: number): Observable<void> {
    return this.http
      .delete(`${this.apiUrl}/${id}`, {
        observe: 'response',
        responseType: 'text', // prevents JSON parse errors
        headers: this.authRoleService.createRoleHeaders(),
      })
      .pipe(map(() => {})); // convert to Observable<void>
  }

  /** Bulk upload students via CSV */
  bulkUpload(file: File): Observable<string> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post(this.apiUrl + '/bulk-upload', formData, {
      responseType: 'text',
      headers: this.authRoleService.createRoleHeaders(),
    });
  }

  /** Add a mark for a student */
  addMark(studentId: number, mark: StudentMark): Observable<StudentMark> {
    return this.http.post<StudentMark>(
      `${this.apiUrl}/${studentId}/marks`,
      mark,
      this.authRoleService.createRoleOptions()
    );
  }

  /** Update a mark for a student */
  updateMark(studentId: number, markId: number, mark: StudentMark): Observable<StudentMark> {
    return this.http.put<StudentMark>(
      `${this.apiUrl}/${studentId}/marks/${markId}`,
      mark,
      this.authRoleService.createRoleOptions()
    );
  }

  /** Get all marks for a student */
  getMarks(studentId: number): Observable<StudentMark[]> {
    return this.http.get<StudentMark[]>(`${this.apiUrl}/${studentId}/marks`, 
      this.authRoleService.createRoleOptions()
    );
  }

  /** Get marks card summary */
  getMarksCard(studentId: number): Observable<MarksCard> {
    return this.http.get<MarksCard>(`${this.apiUrl}/${studentId}/marks-card`, 
      this.authRoleService.createRoleOptions()
    );
  }

  /** Fetch performance summary for dashboard */
  getPerformanceSummary(): Observable<StudentPerformance[]> {
    return this.http.get<StudentPerformance[]>(`${this.apiUrl}/performance`, 
      this.authRoleService.createRoleOptions()
    );
  }

  /** Generate consolidated student progress report */
  getProgressReport(): Observable<StudentProgressReportResponse> {
    return this.http.get<StudentProgressReportResponse>(
      `http://localhost:8080/api/reports/student-progress`,
      this.authRoleService.createRoleOptions()
    );
  }

  /** Email student progress report to admin */
  emailProgressReport(report: StudentProgressReportResponse): Observable<string> {
    return this.http.post<string>(
      `http://localhost:8080/api/reports/student-progress/email`,
      report,
      this.authRoleService.createRoleOptions()
    );
  }

  /** Fetch total student count */
  getStudentsCount(): Observable<number> {
    return this.http.get<number>(`${this.apiUrl}/count`, 
      this.authRoleService.createRoleOptions()
    );
  }

}
