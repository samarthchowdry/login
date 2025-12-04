import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RoleManagementComponent } from '../role-management/role-management.component';
import { AuthRoleService, UserRole } from '../services/auth-role.service';
import { Subscription } from 'rxjs';
import { StudentService, StudentPerformance, Student } from '../services/student.service';
import { AdminService, EmailNotification, Notification } from '../services/admin.service';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, RoleManagementComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent implements OnInit, OnDestroy {
  isAdmin = false;
  canViewAnalytics = false;
  private roleSub?: Subscription;
  private routeSub?: Subscription;
  private analyticsSub?: Subscription;
  analyticsBuckets: Array<{ label: string; count: number }> = [];
  yAxisTicks: number[] = [];
  analyticsLoading = false;
  analyticsLoaded = false;
  analyticsError = '';
  showAnalyticsPanel = false;
  private maxBucketCount = 0;

  // Email and notifications data
  emailNotifications: EmailNotification[] = [];
  inAppNotifications: Notification[] = [];
  emailLoading = false;
  notificationsLoading = false;
  clearingEmails = false;
  clearingNotifications = false;
  markingNotificationIds = new Set<number>();
  emailError = '';
  notificationsError = '';
  broadcastSubject = '';
  broadcastMessage = '';
  broadcastSending = false;
  broadcastSuccessMessage = '';
  broadcastErrorMessage = '';
  studentOptions: Student[] = [];
  studentOptionsLoading = false;
  studentOptionsError = '';
  selectedStudentId: string | null = null;
  individualSubject = '';
  individualMessage = '';
  individualSending = false;
  individualSuccessMessage = '';
  individualErrorMessage = '';
  emailType: 'broadcast' | 'individual' = 'broadcast';

  constructor(
    private authRoleService: AuthRoleService,
    private studentService: StudentService,
    private adminService: AdminService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.updateRoleState(this.authRoleService.getRole());
    this.roleSub = this.authRoleService.role$.subscribe((role) =>
      this.updateRoleState(role)
    );
    this.routeSub = this.route.queryParamMap.subscribe((params) => {
      const wantsAnalytics = params.get('view') === 'analytics';
      this.updateAnalyticsVisibility(wantsAnalytics);
    });
  }

  canSendBroadcast(): boolean {
    return !!this.broadcastSubject.trim() && !!this.broadcastMessage.trim() && !this.broadcastSending;
  }

  onEmailTypeChange(): void {
    // Clear messages when switching email types
    if (this.emailType === 'broadcast') {
      this.individualSuccessMessage = '';
      this.individualErrorMessage = '';
    } else {
      this.broadcastSuccessMessage = '';
      this.broadcastErrorMessage = '';
      // Load student options if not already loaded
      if (this.studentOptions.length === 0 && !this.studentOptionsLoading) {
        this.loadStudentOptions();
      }
    }
  }

  ngOnDestroy(): void {
    this.roleSub?.unsubscribe();
    this.routeSub?.unsubscribe();
    this.analyticsSub?.unsubscribe();
  }

  private updateRoleState(role: UserRole): void {
    this.isAdmin = role === 'ADMIN';
    this.canViewAnalytics = role === 'ADMIN' || role === 'TEACHER';
    const wantsAnalytics =
      this.route.snapshot.queryParamMap.get('view') === 'analytics';
    this.updateAnalyticsVisibility(wantsAnalytics);
    
    // Load admin data if admin
    if (this.isAdmin) {
      this.loadEmailStatus();
      this.loadNotifications();
      this.loadStudentOptions();
    }
  }

  private updateAnalyticsVisibility(wantsAnalytics: boolean): void {
    if (!this.canViewAnalytics) {
      this.resetAnalyticsState();
      return;
    }
    this.showAnalyticsPanel = wantsAnalytics;
    if (this.showAnalyticsPanel && !this.analyticsLoaded && !this.analyticsLoading) {
      this.loadAnalytics();
    }
    if (!this.showAnalyticsPanel) {
      this.analyticsLoading = false;
    }
  }

  private loadAnalytics(): void {
    this.analyticsLoading = true;
    this.analyticsError = '';
    this.analyticsSub?.unsubscribe();
    this.analyticsSub = this.studentService.getPerformanceSummary().subscribe({
      next: (summary) => {
        this.computeBuckets(summary);
        this.analyticsLoading = false;
        this.analyticsLoaded = true;
      },
      error: () => {
        this.analyticsError = 'Unable to load analytics right now.';
        this.analyticsLoading = false;
        this.analyticsLoaded = false;
        this.analyticsBuckets = [];
        this.yAxisTicks = [0, 5, 10, 15, 20];
      }
    });
  }

  private resetAnalyticsState(): void {
    this.analyticsBuckets = [];
    this.yAxisTicks = [];
    this.analyticsLoading = false;
    this.analyticsLoaded = false;
    this.analyticsError = '';
    this.showAnalyticsPanel = false;
    this.maxBucketCount = 0;
    this.analyticsSub?.unsubscribe();
  }

  private computeBuckets(summary: StudentPerformance[]): void {
    const buckets: Record<string, number> = {
      '0-35%': 0,
      '35-50%': 0,
      '50-75%': 0,
      '75-100%': 0
    };

    summary
      .filter((item) => item.percentage !== null && item.percentage !== undefined)
      .forEach((item) => {
        const score = item.percentage ?? 0;
        if (score < 35) {
          buckets['0-35%'] += 1;
        } else if (score < 50) {
          buckets['35-50%'] += 1;
        } else if (score < 75) {
          buckets['50-75%'] += 1;
        } else {
          buckets['75-100%'] += 1;
        }
      });

    this.analyticsBuckets = Object.entries(buckets).map(([label, count]) => ({
      label,
      count
    }));

    this.maxBucketCount = Math.max(...this.analyticsBuckets.map((b) => b.count), 0);
    this.buildYAxisTicks();
  }

  private buildYAxisTicks(): void {
    const max = this.maxBucketCount;
    if (max <= 0) {
      this.yAxisTicks = [4, 3, 2, 1, 0];
      return;
    }

    const step = Math.max(1, Math.ceil(max / 4));
    const ticks: number[] = [];
    for (let value = step * 4; value >= 0; value -= step) {
      ticks.push(value);
    }
    if (ticks[0] < max) {
      ticks.unshift(max);
    }
    this.yAxisTicks = Array.from(new Set(ticks));
  }

  get hasAnalyticsData(): boolean {
    return this.analyticsBuckets.some((bucket) => bucket.count > 0);
  }

  getBarHeight(count: number): number {
    if (this.maxBucketCount === 0) {
      return 0;
    }
    return (count / this.maxBucketCount) * 100;
  }

  private loadEmailStatus(): void {
    this.emailLoading = true;
    this.emailError = '';
    this.adminService.getEmailStatus().subscribe({
      next: (emails) => {
        this.emailNotifications = emails;
        this.emailLoading = false;
      },
      error: (err) => {
        this.emailError = this.resolveHttpError(err, 'Failed to load email status.');
        this.emailLoading = false;
      }
    });
  }

  private loadNotifications(): void {
    this.notificationsLoading = true;
    this.notificationsError = '';
    this.adminService.getInAppNotifications().subscribe({
      next: (notifications) => {
        this.inAppNotifications = notifications;
        this.notificationsLoading = false;
      },
      error: (err) => {
        this.notificationsError = this.resolveHttpError(err, 'Failed to load notifications.');
        this.notificationsLoading = false;
      }
    });
  }

  loadStudentOptions(force = false): void {
    if (!force && (this.studentOptionsLoading || this.studentOptions.length > 0)) {
      return;
    }
    this.studentOptionsLoading = true;
    this.studentOptionsError = '';
    this.studentService.getStudents({}).subscribe({
      next: (students) => {
        this.studentOptions = [...students].sort((a, b) =>
          a.name.localeCompare(b.name)
        );
        this.studentOptionsLoading = false;
      },
      error: (err) => {
        this.studentOptionsError = this.resolveHttpError(err, 'Unable to load students for emailing.');
        this.studentOptionsLoading = false;
      },
    });
  }

  formatDateTime(dateTime: string | null): string {
    if (!dateTime) return 'N/A';
    return new Date(dateTime).toLocaleString();
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'SENT':
        return 'status-sent';
      case 'FAILED':
        return 'status-failed';
      case 'PENDING':
        return 'status-pending';
      case 'UNREAD':
        return 'status-unread';
      case 'READ':
        return 'status-read';
      default:
        return '';
    }
  }

  onClearEmailStatus(): void {
    if (this.clearingEmails) {
      return;
    }
    this.clearingEmails = true;
    this.emailError = '';
    this.adminService.clearEmailStatus().subscribe({
      next: () => {
        this.emailNotifications = [];
        this.clearingEmails = false;
      },
      error: (err) => {
        this.emailError = this.resolveHttpError(err, 'Unable to clear email status.');
        this.clearingEmails = false;
      }
    });
  }

  onClearNotifications(): void {
    if (this.clearingNotifications) {
      return;
    }
    this.clearingNotifications = true;
    this.notificationsError = '';
    this.adminService.clearInAppNotifications().subscribe({
      next: () => {
        this.inAppNotifications = [];
        this.clearingNotifications = false;
      },
      error: (err) => {
        this.notificationsError = this.resolveHttpError(err, 'Unable to clear notifications.');
        this.clearingNotifications = false;
      }
    });
  }

  isMarkingNotification(id: number): boolean {
    return this.markingNotificationIds.has(id);
  }

  onMarkNotificationAsRead(notification: Notification): void {
    if (notification.status === 'READ' || this.isMarkingNotification(notification.id)) {
      return;
    }
    this.markingNotificationIds.add(notification.id);
    this.adminService.markNotificationAsRead(notification.id).subscribe({
      next: (updated) => {
        this.markingNotificationIds.delete(notification.id);
        this.inAppNotifications = this.inAppNotifications.map((item) =>
          item.id === updated.id ? { ...item, status: updated.status } : item
        );
      },
      error: (err) => {
        this.notificationsError = this.resolveHttpError(err, 'Unable to mark notification as read.');
        this.markingNotificationIds.delete(notification.id);
      },
    });
  }

  onSendBroadcastEmail(): void {
    if (!this.isAdmin || this.broadcastSending) {
      return;
    }
    const subject = this.broadcastSubject.trim();
    const message = this.broadcastMessage.trim();
    if (!subject || !message) {
      this.broadcastErrorMessage = 'Subject and message are required.';
      return;
    }
    this.broadcastSending = true;
    this.broadcastErrorMessage = '';
    this.broadcastSuccessMessage = '';
    this.adminService
      .sendBroadcastEmail({ subject, message })
      .subscribe({
        next: (response) => {
          this.broadcastSending = false;
          this.broadcastSuccessMessage = `Email queued for ${response.recipients} students. Checking status...`;
          this.broadcastSubject = '';
          this.broadcastMessage = '';
          this.loadEmailStatus();
          // Check email status after a delay to see if they actually sent
          setTimeout(() => {
            this.checkEmailStatusAfterSend(subject);
          }, 3000);
        },
        error: (err) => {
          this.broadcastSending = false;
          this.broadcastErrorMessage = this.resolveHttpError(err, 'Unable to send broadcast email.');
        },
      });
  }

  canSendIndividualEmail(): boolean {
    return (
      !!this.selectedStudentId &&
      !!this.individualSubject.trim() &&
      !!this.individualMessage.trim() &&
      !this.individualSending
    );
  }

  onSendIndividualEmail(): void {
    if (!this.canSendIndividualEmail()) {
      return;
    }
    const studentId = Number(this.selectedStudentId);
    if (Number.isNaN(studentId)) {
      this.individualErrorMessage = 'Select a valid student.';
      return;
    }
    const subject = this.individualSubject.trim();
    const message = this.individualMessage.trim();
    const studentName = this.studentOptions.find((s) => s.id === studentId)?.name || 'student';
    this.individualSending = true;
    this.individualErrorMessage = '';
    this.individualSuccessMessage = '';
    this.adminService
      .sendStudentEmail({ studentId, subject, message })
      .subscribe({
        next: (response) => {
          this.individualSending = false;
          const name = response.studentName || studentName;
          this.individualSuccessMessage = `Email queued for ${name}. Checking status...`;
          this.individualSubject = '';
          this.individualMessage = '';
          this.selectedStudentId = null;
          this.loadEmailStatus();
          // Check email status after a delay to see if it actually sent
          setTimeout(() => {
            this.checkEmailStatusAfterSend(subject, name);
          }, 3000);
        },
        error: (err) => {
          this.individualSending = false;
          this.individualErrorMessage = this.resolveHttpError(err, 'Unable to send email to student.');
        },
      });
  }

  private checkEmailStatusAfterSend(subject: string, recipientName?: string): void {
    this.loadEmailStatus();
    setTimeout(() => {
      // Find the most recent email with this subject
      const recentEmail = this.emailNotifications
        .filter(email => email.subject === subject)
        .sort((a, b) => (b.id || 0) - (a.id || 0))[0];

      if (!recentEmail) {
        return;
      }

      if (recentEmail.status === 'FAILED') {
        if (recipientName) {
          this.individualSuccessMessage = '';
          this.individualErrorMessage = `Email not sent to ${recipientName}. Check email status table for details.`;
        } else {
          this.broadcastSuccessMessage = '';
          this.broadcastErrorMessage = 'Some emails failed to send. Check email status table for details.';
        }
      } else if (recentEmail.status === 'SENT') {
        if (recipientName) {
          this.individualSuccessMessage = `Email sent to ${recipientName}.`;
          this.individualErrorMessage = '';
        } else {
          // For broadcast, check if all are sent
          const pendingCount = this.emailNotifications.filter(e => e.subject === subject && e.status === 'PENDING').length;
          const failedCount = this.emailNotifications.filter(e => e.subject === subject && e.status === 'FAILED').length;
          if (failedCount > 0) {
            this.broadcastSuccessMessage = '';
            this.broadcastErrorMessage = `${failedCount} email(s) failed to send. Check email status table for details.`;
          } else if (pendingCount > 0) {
            this.broadcastSuccessMessage = `${this.emailNotifications.filter(e => e.subject === subject && e.status === 'SENT').length} email(s) sent. ${pendingCount} still pending.`;
          } else {
            this.broadcastSuccessMessage = 'All emails sent successfully.';
          }
        }
      } else if (recentEmail.status === 'PENDING') {
        if (recipientName) {
          this.individualSuccessMessage = `Email pending for ${recipientName}. It will be sent by the scheduler.`;
        } else {
          const pendingCount = this.emailNotifications.filter(e => e.subject === subject && e.status === 'PENDING').length;
          this.broadcastSuccessMessage = `${pendingCount} email(s) pending. They will be sent by the scheduler.`;
        }
      }
    }, 1000);
  }

  toggleNotificationsPanel(): void {
    if (!this.isAdmin) {
      return;
    }
    this.router.navigate(['/notifications']);
  }

  get unreadNotificationsCount(): number {
    return this.inAppNotifications.filter(
      (notification) => notification.status === 'UNREAD'
    ).length;
  }

  get pendingEmailCount(): number {
    return this.emailNotifications.filter(
      (email) => email.status === 'PENDING'
    ).length;
  }

  get failedEmailCount(): number {
    return this.emailNotifications.filter(
      (email) => email.status === 'FAILED'
    ).length;
  }

  get hasPendingEmails(): boolean {
    return this.pendingEmailCount > 0;
  }

  get hasFailedEmails(): boolean {
    return this.failedEmailCount > 0;
  }

  private resolveHttpError(err: unknown, fallback: string): string {
    if (err instanceof HttpErrorResponse) {
      const backendMessage =
        (typeof err.error === 'string' && err.error) ||
        err.error?.message ||
        err.error?.error ||
        '';
      if (backendMessage) {
        return backendMessage;
      }
      if (err.status === 0) {
        return 'Cannot reach server. Is the backend running?';
      }
      if (err.statusText) {
        return `${fallback} (${err.status} ${err.statusText})`;
      }
      return `${fallback} (status ${err.status})`;
    }
    return fallback;
  }
}
