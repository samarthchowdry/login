import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { Subscription, forkJoin } from 'rxjs';
import {
  StudentPerformance,
  StudentService,
} from '../services/student.service';
import { CourseService } from '../services/course.service';
import { AuthRoleService, UserRole } from '../services/auth-role.service';

interface OverviewFeature {
  title: string;
  description: string;
  cta: string;
  link: string[];
  queryParams?: Record<string, any>;
}

interface AnalyticsSlice {
  label: string;
  count: number;
  percent: number;
}

@Component({
  selector: 'app-overview',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './overview.component.html',
  styleUrl: './overview.component.css',
})
export class OverviewComponent implements OnInit, OnDestroy {
  features: OverviewFeature[] = [
    {
      title: 'Students Management',
      description: 'View and manage students in the student database.',
      cta: 'View Students List',
      link: ['/student-list'],
    },
    {
      title: 'Courses Management',
      description: 'View and manage courses with enrolled students.',
      cta: 'View Courses List',
      link: ['/course-list'],
    },
    {
      title: 'Performance Insights',
      description:
        'Analyse assessment trends across every student and branch.',
      cta: 'Open Performance Dashboard',
      link: ['/student-performance'],
    },
  ];
  visibleFeatures: OverviewFeature[] = [...this.features];

  stats = {
    students: { label: 'Total Students', value: 0 },
    courses: { label: 'Active Courses', value: 0 },
  };

  statsLoading = false;
  statsError = '';

  analyticsLoading = false;
  analyticsError = '';
  analyticsSummary: AnalyticsSlice[] = [];
  private statsSub?: Subscription;
  private analyticsSub?: Subscription;
  private roleSub?: Subscription;
  isAdmin = false;

  constructor(
    private studentService: StudentService,
    private courseService: CourseService,
    private authRoleService: AuthRoleService
  ) {}

  ngOnInit(): void {
    const currentRole = this.authRoleService.getRole();
    this.isAdmin = currentRole === 'ADMIN';
    this.updateFeatureVisibility(currentRole);
    this.loadStats();
    if (this.isAdmin) {
      this.loadShortAnalytics();
    }
    this.roleSub = this.authRoleService.role$.subscribe((role) => {
      const adminNow = role === 'ADMIN';
      this.updateFeatureVisibility(role);
      if (adminNow && !this.isAdmin && !this.analyticsSummary.length) {
        this.loadShortAnalytics();
      }
      this.isAdmin = adminNow;
    });
  }

  ngOnDestroy(): void {
    this.statsSub?.unsubscribe();
    this.analyticsSub?.unsubscribe();
    this.roleSub?.unsubscribe();
  }

  private loadStats(): void {
    this.statsLoading = true;
    this.statsError = '';
    this.statsSub?.unsubscribe();
    this.statsSub = forkJoin({
      students: this.studentService.getStudentsCount(),
      courses: this.courseService.getCoursesCount(),
    }).subscribe({
      next: ({ students, courses }) => {
        this.stats.students.value = students;
        this.stats.courses.value = courses;
        this.statsLoading = false;
      },
      error: () => {
        this.statsError = 'Unable to fetch overview metrics right now.';
        this.statsLoading = false;
      },
    });
  }

  private loadShortAnalytics(): void {
    this.analyticsLoading = true;
    this.analyticsError = '';
    this.analyticsSub?.unsubscribe();
    this.analyticsSub = this.studentService
      .getPerformanceSummary()
      .subscribe({
        next: (summary) => {
          this.analyticsSummary = this.buildAnalyticsSlices(summary);
          this.analyticsLoading = false;
        },
        error: () => {
          this.analyticsError = 'Analytics snapshot not available.';
          this.analyticsLoading = false;
        },
      });
  }

  private buildAnalyticsSlices(
    summary: StudentPerformance[]
  ): AnalyticsSlice[] {
    const buckets: Record<string, number> = {
      '0-35%': 0,
      '35-50%': 0,
      '50-75%': 0,
      '75-100%': 0,
    };

    summary
      .filter(
        (item) =>
          item.percentage !== null && item.percentage !== undefined
      )
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

    const pairs = Object.entries(buckets).map(([label, count]) => ({
      label,
      count,
    }));
    const max = Math.max(...pairs.map((p) => p.count), 1);
    return pairs.map((pair) => ({
      ...pair,
      percent: Math.round((pair.count / max) * 100),
    }));
  }

  private updateFeatureVisibility(role: UserRole): void {
    const canViewAnalytics = role === 'ADMIN' || role === 'TEACHER';
    this.visibleFeatures = canViewAnalytics
      ? this.features
      : this.features.filter(
          (feature) => feature.link?.[0] !== '/student-performance'
        );
  }
}

