import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { AuthRoleService } from './auth-role.service';

export interface EmailNotification {
  id: number;
  toEmail: string;
  subject: string;
  status: 'PENDING' | 'SENT' | 'FAILED';
  sentTime: string | null;
}

export interface Notification {
  id: number;
  title: string;
  message: string;
  status: 'READ' | 'UNREAD';
  createdAt: string;
}

export interface BroadcastEmailRequest {
  subject: string;
  message: string;
}

export interface BroadcastEmailResponse {
  recipients: number;
  subject: string;
}

export interface IndividualEmailRequest {
  studentId: number;
  subject: string;
  message: string;
}

export interface IndividualEmailResponse {
  studentId: number;
  studentName: string;
  email: string;
  subject: string;
}

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private apiUrl = 'http://localhost:8080/api/admin';

  constructor(
    private http: HttpClient,
    private authRoleService: AuthRoleService
  ) {}

  /** Get all email notifications */
  getEmailStatus(): Observable<EmailNotification[]> {
    return this.http.get<EmailNotification[]>(`${this.apiUrl}/email-status`, {
      headers: this.authRoleService.createRoleHeaders(),
    });
  }

  /** Get all in-app notifications */
  getInAppNotifications(): Observable<Notification[]> {
    return this.http.get<Notification[]>(`${this.apiUrl}/in-app-notifications`, {
      headers: this.authRoleService.createRoleHeaders(),
    });
  }

  /** Clear all email notifications */
  clearEmailStatus(): Observable<void> {
    return this.http
      .delete(`${this.apiUrl}/email-status`, {
        headers: this.authRoleService.createRoleHeaders(),
        responseType: 'text',
        observe: 'response',
      })
      .pipe(map(() => {}));
  }

  /** Clear all in-app notifications */
  clearInAppNotifications(): Observable<void> {
    return this.http
      .delete(`${this.apiUrl}/in-app-notifications`, {
        headers: this.authRoleService.createRoleHeaders(),
        responseType: 'text',
        observe: 'response',
      })
      .pipe(map(() => {}));
  }

  /** Mark a single notification as read */
  markNotificationAsRead(id: number): Observable<Notification> {
    return this.http.patch<Notification>(
      `${this.apiUrl}/in-app-notifications/${id}/read`,
      {},
      { headers: this.authRoleService.createRoleHeaders() }
    );
  }

  /** Send broadcast email to all students */
  sendBroadcastEmail(request: BroadcastEmailRequest): Observable<BroadcastEmailResponse> {
    return this.http.post<BroadcastEmailResponse>(
      `${this.apiUrl}/email-broadcast`,
      request,
      { headers: this.authRoleService.createRoleHeaders() }
    );
  }

  /** Send email to a single student */
  sendStudentEmail(request: IndividualEmailRequest): Observable<IndividualEmailResponse> {
    return this.http.post<IndividualEmailResponse>(
      `${this.apiUrl}/email-student`,
      request,
      { headers: this.authRoleService.createRoleHeaders() }
    );
  }
}

