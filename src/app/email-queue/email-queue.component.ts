import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService, EmailNotification, DailyReportLog, ReportScheduleConfig } from '../services/admin.service';
import { AuthRoleService } from '../services/auth-role.service';

@Component({
  selector: 'app-email-queue',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './email-queue.component.html',
  styleUrl: './email-queue.component.css',
})
export class EmailQueueComponent implements OnInit {
  emailQueue: EmailNotification[] = [];
  dailyReports: DailyReportLog[] = [];
  loadingQueue = false;
  loadingReports = false;
  error = '';
  processingQueue = false;
  reportHour: number = 10;
  reportMinute: number = 45;
  updatingSchedule = false;
  triggeringReport = false;
  triggeringProgressReport = false;

  constructor(
    private adminService: AdminService,
    private authRoleService: AuthRoleService
  ) {}

  ngOnInit(): void {
    const role = this.authRoleService.getRole();
    if (role === 'ADMIN') {
      this.loadEmailQueue();
      this.loadDailyReports();
      this.loadReportSchedule();
    } else {
      this.error = 'You must be an admin to view scheduler status.';
    }
  }

  private loadEmailQueue(): void {
    this.loadingQueue = true;
    this.adminService.getEmailQueue().subscribe({
      next: (queue) => {
        this.emailQueue = queue;
        this.loadingQueue = false;
      },
      error: () => {
        this.error = 'Failed to load email queue.';
        this.loadingQueue = false;
      },
    });
  }

  private loadDailyReports(): void {
    this.loadingReports = true;
    this.adminService.getDailyReports().subscribe({
      next: (reports) => {
        this.dailyReports = reports;
        this.loadingReports = false;
      },
      error: () => {
        this.error = 'Failed to load daily report status.';
        this.loadingReports = false;
      },
    });
  }

  private loadReportSchedule(): void {
    this.adminService.getReportSchedule().subscribe({
      next: (config) => {
        this.reportHour = config.reportHour;
        this.reportMinute = config.reportMinute;
      },
      error: () => {
        this.error = 'Failed to load report schedule.';
      },
    });
  }

  onRefresh(): void {
    this.loadEmailQueue();
    this.loadDailyReports();
  }

  onProcessQueue(): void {
    if (this.processingQueue) {
      return;
    }
    this.processingQueue = true;
    this.adminService.processEmailQueue().subscribe({
      next: () => {
        this.processingQueue = false;
        this.loadEmailQueue();
      },
      error: () => {
        this.error = 'Failed to process email queue.';
        this.processingQueue = false;
      },
    });
  }

  formatDate(date?: string | null): string {
    return date ? new Date(date).toLocaleString() : '-';
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'PENDING':
      case 'GENERATED':
        return 'status-pending';
      case 'SENT':
        return 'status-sent';
      case 'FAILED':
        return 'status-failed';
      default:
        return '';
    }
  }

  onUpdateSchedule(): void {
    if (this.reportHour < 0 || this.reportHour > 23 || this.reportMinute < 0 || this.reportMinute > 59) {
      this.error = 'Hour must be 0-23 and minute must be 0-59.';
      return;
    }
    this.error = '';
    this.updatingSchedule = true;
    this.adminService.updateReportSchedule(this.reportHour, this.reportMinute).subscribe({
      next: (config) => {
        this.reportHour = config.reportHour;
        this.reportMinute = config.reportMinute;
        this.updatingSchedule = false;
        alert(`Report schedule updated to ${this.reportHour}:${this.reportMinute.toString().padStart(2, '0')}`);
      },
      error: () => {
        this.error = 'Failed to update report schedule.';
        this.updatingSchedule = false;
      },
    });
  }

  onTriggerDailyReport(): void {
    if (this.triggeringReport) {
      return;
    }
    this.triggeringReport = true;
    this.error = '';
    this.adminService.triggerDailyReport().subscribe({
      next: (message) => {
        this.error = '';
        alert('Daily report triggered! ' + message + '\n\nCheck your email inbox (and spam folder) for the Excel attachment.');
        this.triggeringReport = false;
        this.loadDailyReports();
      },
      error: (err) => {
        this.error = 'Failed to trigger daily report: ' + (err.error || err.message || 'Unknown error');
        this.triggeringReport = false;
      },
    });
  }

  onTriggerProgressAnalyticsReport(): void {
    if (this.triggeringProgressReport) {
      return;
    }
    this.triggeringProgressReport = true;
    this.error = '';
    this.adminService.triggerProgressAnalyticsReport().subscribe({
      next: (message) => {
        this.error = '';
        alert('Progress Analytics Report triggered! ' + message + '\n\nCheck your email inbox (and spam folder) for the Excel attachment.');
        this.triggeringProgressReport = false;
        this.loadDailyReports();
      },
      error: (err) => {
        this.error = 'Failed to trigger progress analytics report: ' + (err.error || err.message || 'Unknown error');
        this.triggeringProgressReport = false;
      },
    });
  }
}


