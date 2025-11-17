import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { RoleManagementComponent } from '../role-management/role-management.component';
import { AuthRoleService, UserRole } from '../services/auth-role.service';
import { Subscription } from 'rxjs';
import { StudentService, StudentPerformance } from '../services/student.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule, RoleManagementComponent],
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

  constructor(
    private authRoleService: AuthRoleService,
    private studentService: StudentService,
    private route: ActivatedRoute
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
}
