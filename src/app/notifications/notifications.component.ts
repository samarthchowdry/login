import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AdminService, Notification } from '../services/admin.service';
import { AuthRoleService, UserRole } from '../services/auth-role.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './notifications.component.html',
  styleUrl: './notifications.component.css'
})
export class NotificationsComponent implements OnInit, OnDestroy {
  notifications: Notification[] = [];
  loading = false;
  error = '';
  clearing = false;
  markingNotificationIds = new Set<number>();
  isAdmin = false;
  private roleSub?: Subscription;

  constructor(
    private adminService: AdminService,
    private authRoleService: AuthRoleService
  ) {}

  ngOnInit(): void {
    this.isAdmin = this.authRoleService.getRole() === 'ADMIN';
    if (this.isAdmin) {
      this.loadNotifications();
    }
    this.roleSub = this.authRoleService.role$.subscribe((role) => {
      this.isAdmin = role === 'ADMIN';
      if (this.isAdmin && this.notifications.length === 0) {
        this.loadNotifications();
      }
    });
  }

  ngOnDestroy(): void {
    this.roleSub?.unsubscribe();
  }

  private loadNotifications(): void {
    this.loading = true;
    this.error = '';
    this.adminService.getInAppNotifications().subscribe({
      next: (notifications) => {
        this.notifications = notifications;
        this.loading = false;
      },
      error: () => {
        this.error = 'Failed to load notifications.';
        this.loading = false;
      }
    });
  }

  onClearNotifications(): void {
    if (this.clearing) return;
    this.clearing = true;
    this.error = '';
    this.adminService.clearInAppNotifications().subscribe({
      next: () => {
        this.notifications = [];
        this.clearing = false;
      },
      error: () => {
        this.error = 'Unable to clear notifications.';
        this.clearing = false;
      }
    });
  }

  onMarkAsRead(notification: Notification): void {
    if (notification.status === 'READ' || this.isMarkingNotification(notification.id)) {
      return;
    }
    this.markingNotificationIds.add(notification.id);
    this.adminService.markNotificationAsRead(notification.id).subscribe({
      next: (updated) => {
        this.markingNotificationIds.delete(notification.id);
        this.notifications = this.notifications.map((item) =>
          item.id === updated.id ? { ...item, status: updated.status } : item
        );
      },
      error: () => {
        this.error = 'Unable to mark notification as read.';
        this.markingNotificationIds.delete(notification.id);
      }
    });
  }

  isMarkingNotification(id: number): boolean {
    return this.markingNotificationIds.has(id);
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'UNREAD':
        return 'status-unread';
      case 'READ':
        return 'status-read';
      default:
        return '';
    }
  }

  formatDateTime(dateTime: string): string {
    return new Date(dateTime).toLocaleString();
  }

  get unreadCount(): number {
    return this.notifications.filter(n => n.status === 'UNREAD').length;
  }
}

