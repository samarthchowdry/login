import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin, Subscription, firstValueFrom } from 'rxjs';
import {
  StudentPerformance,
  StudentService,
  StudentMark,
  Student,
  StudentProgressReport,
  StudentProgressReportResponse,
} from '../services/student.service';
import { AuthRoleService, UserRole } from '../services/auth-role.service';

type ViewMode = 'percentage' | 'average';

interface StudentSubjectSummary {
  courseId?: number;
  subject: string;
  totalScore: number;
  totalMaxScore: number;
  percentage?: number;
  assessments: number;
}

@Component({
  selector: 'app-student-performance',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './student-performance.component.html',
  styleUrl: './student-performance.component.css'
})
export class StudentPerformanceComponent implements OnInit, OnDestroy {
  isLoading = false;
  errorMessage = '';
  performance: StudentPerformance[] = [];
  filtered: StudentPerformance[] = [];
  viewMode: ViewMode = 'percentage';
  selectedBranch = 'ALL';
  private dataSub?: Subscription;

  // Student detail side panel
  selectedStudentId: number | null = null;
  selectedStudentName = '';
  marksLoading = false;
  marksError = '';
  subjectSummaries: StudentSubjectSummary[] = [];
  private marksCache = new Map<number, StudentSubjectSummary[]>();
  private courseNameCache = new Map<number, string[]>();
  private selectedStudentSummaryRows: StudentSubjectSummary[] = [];
  private selectedStudentPerformance?: StudentPerformance;
  private selectedStudentCourseNames: string[] = [];

  // Report analytics
  isAdmin = false;
  reportLoading = false;
  reportError = '';
  progressReport: StudentProgressReport[] = [];
  reportGeneratedAt: string | null = null;
  reportTotals = {
    students: 0,
    assessments: 0,
  };
  reportProgress = 0;
  reportSuccessMessage = '';
  private reportRequested = false;
  private roleSub?: Subscription;
  private reportTimer?: ReturnType<typeof setInterval>;
  private reportStartTime = 0;
  // Duration for the fake loading/progress animation (8 seconds)
  private readonly reportDurationMs = 8000;
  private pendingReportResponse: StudentProgressReportResponse | null = null;
  private progressCompleted = false;

  constructor(private studentService: StudentService, private authRoleService: AuthRoleService) {}

  ngOnInit(): void {
    this.isAdmin = this.authRoleService.getRole() === 'ADMIN';
    this.roleSub = this.authRoleService.role$.subscribe((role: UserRole) => {
      this.isAdmin = role === 'ADMIN';
      if (!this.isAdmin) {
        this.progressReport = [];
        this.reportError = '';
        this.reportGeneratedAt = null;
      }
    });
    this.loadPerformance();
  }

  ngOnDestroy(): void {
    this.dataSub?.unsubscribe();
    this.roleSub?.unsubscribe();
    this.stopProgressTimer();
  }

  loadPerformance(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.dataSub?.unsubscribe();
    this.dataSub = this.studentService.getPerformanceSummary().subscribe({
      next: (data) => {
        this.performance = Array.isArray(data) ? data : [];
        this.selectedBranch = 'ALL';
        this.applyFilters();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading performance summary:', error);
        this.errorMessage = 'Unable to load performance summary. Please try again.';
        this.isLoading = false;
      },
    });
  }

  get availableBranches(): string[] {
    const branches = new Set<string>();
    this.performance.forEach((item) => {
      if (item.branch) {
        branches.add(item.branch);
      }
    });
    return ['ALL', ...Array.from(branches).sort((a, b) => a.localeCompare(b))];
  }

  setViewMode(mode: ViewMode): void {
    if (this.viewMode !== mode) {
      this.viewMode = mode;
      this.applyFilters();
    }
  }

  onBranchChange(branch: string): void {
    this.selectedBranch = branch;
    this.applyFilters();
  }

  applyFilters(): void {
    const branchFilter = this.selectedBranch;
    this.filtered = this.performance
      .filter((item) => branchFilter === 'ALL' || (item.branch ?? '').toLowerCase() === branchFilter.toLowerCase())
      .sort((a, b) => this.metricValue(b) - this.metricValue(a));
    this.ensureSelectedStudent();
  }

  refresh(): void {
    this.loadPerformance();
    this.resetReport();
  }

  get maxMetric(): number {
    if (!this.filtered.length) {
      return 0;
    }
    return Math.max(...this.filtered.map((item) => this.metricValue(item)));
  }

  get totalAssessments(): number {
    return this.filtered.reduce((sum, item) => sum + (item.totalAssessments ?? 0), 0);
  }

  get overallAveragePercentage(): number | null {
    const values = this.filtered
      .map((item) => item.percentage)
      .filter((value): value is number => value !== null && value !== undefined && Number.isFinite(value));
    if (!values.length) {
      return null;
    }
    const total = values.reduce((sum, value) => sum + value, 0);
    return total / values.length;
  }

  get topPerformer(): StudentPerformance | undefined {
    return this.filtered[0];
  }

  get emptyStateMessage(): string {
    if (!this.performance.length) {
      return 'No assessment records found yet.';
    }
    return 'No students match the selected filters.';
  }

  formatPercentage(value: number | null | undefined): string {
    if (value === null || value === undefined || !Number.isFinite(value)) {
      return '—';
    }
    return value.toFixed(1) + '%';
  }

  formatScore(value: number | null | undefined): string {
    if (value === null || value === undefined || !Number.isFinite(value)) {
      return '—';
    }
    return value.toFixed(1);
  }

  formatDate(value: string | null | undefined): string {
    if (!value) {
      return '—';
    }
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return value;
    }
    return parsed.toLocaleDateString();
  }

  metricLabel(): string {
    return this.viewMode === 'percentage' ? 'Overall Percentage' : 'Average Score';
  }

  metricSuffix(): string {
    return this.viewMode === 'percentage' ? '%' : '';
  }

  get yAxisLabel(): string {
    return this.viewMode === 'percentage' ? 'Percentage (%)' : 'Average Score';
  }

  get xAxisLabel(): string {
    return 'Students';
  }

  metricValue(item: StudentPerformance): number {
    const metric = this.viewMode === 'percentage' ? item.percentage : item.averageScore;
    if (metric === null || metric === undefined || !Number.isFinite(metric)) {
      return 0;
    }
    return metric;
  }

  // --- Student subject summaries ---
  get hasSubjectSummaries(): boolean {
    return this.subjectSummaries.length > 0;
  }

  get subjectMaxPercentage(): number {
    if (!this.subjectSummaries.length) {
      return 0;
    }
    return Math.max(...this.subjectSummaries.map((item) => item.percentage ?? 0));
  }

  get subjectChartMax(): number {
    if (!this.subjectSummaries.length) {
      return 0;
    }
    return Math.max(
      ...this.subjectSummaries.map((item) =>
        Math.max(item.totalScore ?? 0, item.totalMaxScore ?? 0)
      )
    );
  }

  subjectChartHeight(value: number | undefined | null): number {
    const max = this.subjectChartMax;
    if (!max || value === null || value === undefined) {
      return 0;
    }
    return Math.min(100, (value / max) * 100);
  }

  selectStudent(student: StudentPerformance): void {
    if (this.selectedStudentId === student.studentId) {
      return;
    }
    this.selectedStudentId = student.studentId ?? null;
    this.selectedStudentName = student.studentName ?? '';
    this.selectedStudentPerformance = student;
    void this.loadStudentSubjects(false);
  }

  downloadStudentCsv(student: StudentPerformance): void {
    if (!student.studentId) {
      return;
    }
    const needsSelection = this.selectedStudentId !== student.studentId;
    if (needsSelection) {
      this.selectedStudentId = student.studentId;
      this.selectedStudentName = student.studentName ?? '';
      this.selectedStudentPerformance = student;
    } else {
      // Ensure selectedStudentPerformance is set even if student is already selected
      this.selectedStudentPerformance = student;
    }
    void this.loadStudentSubjects(true);
  }

  private ensureSelectedStudent(): void {
    if (!this.filtered.length) {
      this.selectedStudentId = null;
      this.selectedStudentName = '';
      this.subjectSummaries = [];
      this.selectedStudentPerformance = undefined;
      this.selectedStudentCourseNames = [];
      return;
    }

    // Keep current selection if still present; otherwise choose first student
    const existing = this.filtered.find((item) => item.studentId === this.selectedStudentId);
    if (existing) {
      this.selectedStudentName = existing.studentName ?? '';
      this.selectedStudentPerformance = existing;
      return;
    }

    const first = this.filtered[0];
    this.selectedStudentId = first.studentId ?? null;
    this.selectedStudentName = first.studentName ?? '';
    this.selectedStudentPerformance = first;
    this.loadStudentSubjects();
  }

  private async loadStudentSubjects(downloadImmediately = false): Promise<void> {
    if (!this.selectedStudentId) {
      this.subjectSummaries = [];
      this.selectedStudentSummaryRows = [];
      this.selectedStudentCourseNames = [];
      return;
    }

    const cached = this.marksCache.get(this.selectedStudentId);
    if (cached) {
      this.subjectSummaries = cached;
      this.selectedStudentSummaryRows = cached;
      this.selectedStudentCourseNames = this.courseNameCache.get(this.selectedStudentId) ?? [];
      if (downloadImmediately) {
        this.exportSelectedStudentCsv();
      }
      return;
    }

    this.marksLoading = true;
    this.marksError = '';
    try {
      const { student, marks } = await firstValueFrom(
        forkJoin({
          student: this.studentService.getStudentById(this.selectedStudentId),
          marks: this.studentService.getMarks(this.selectedStudentId),
        })
      );
      this.subjectSummaries = this.aggregateMarksBySubject(student, marks ?? []);
      this.marksCache.set(this.selectedStudentId!, this.subjectSummaries);
      this.courseNameCache.set(this.selectedStudentId!, student.courseNames ?? []);
      this.selectedStudentSummaryRows = this.subjectSummaries;
      this.selectedStudentCourseNames = student.courseNames ?? [];
      if (downloadImmediately) {
        this.exportSelectedStudentCsv();
      }
    } catch (error) {
      console.error('Error loading student marks:', error);
      this.marksError = 'Unable to load subject breakdown.';
      this.subjectSummaries = [];
      this.selectedStudentSummaryRows = [];
    } finally {
      this.marksLoading = false;
    }
  }

  private normalizeKey(value: string | undefined | null): string {
    return (value ?? '').trim().toLowerCase();
  }

  private aggregateMarksBySubject(student: Student, marks: StudentMark[]): StudentSubjectSummary[] {
    const map = new Map<string, StudentSubjectSummary>();
    const courseIds = student.courseIds ?? [];
    const courseNames = student.courseNames ?? [];

    courseNames.forEach((name, index) => {
      const displayName = name || `Course ${courseIds[index] ?? index + 1}`;
      const key = this.normalizeKey(displayName);
      if (!map.has(key)) {
        map.set(key, {
          courseId: courseIds[index],
          subject: displayName,
          totalScore: 0,
          totalMaxScore: 0,
          percentage: undefined,
          assessments: 0,
        });
      }
    });

    marks.forEach((mark) => {
      const rawSubject = mark.subject ?? 'Unknown';
      const normalized = this.normalizeKey(rawSubject);

      let entry = map.get(normalized);
      if (!entry) {
        // Attempt fuzzy match by ignoring punctuation/extra spaces
        entry = Array.from(map.entries())
          .find(([key]) => key.replace(/\s+/g, '') === normalized.replace(/\s+/g, ''))
          ?.[1];
      }

      if (!entry) {
        entry = {
          subject: rawSubject,
          totalScore: 0,
          totalMaxScore: 0,
          percentage: undefined,
          assessments: 0,
        };
        map.set(normalized || rawSubject, entry);
      }

      const score = mark.score ?? 0;
      const max = mark.maxScore ?? 0;
      entry.totalScore += score;
      entry.totalMaxScore += max;
      entry.assessments += 1;
      entry.percentage =
        entry.totalMaxScore > 0 ? (entry.totalScore / entry.totalMaxScore) * 100 : undefined;
    });

    return Array.from(map.values()).sort((a, b) => (b.percentage ?? 0) - (a.percentage ?? 0));
  }
  private exportSelectedStudentCsv(): void {
    if (
      !this.selectedStudentId ||
      !this.selectedStudentSummaryRows.length ||
      !this.selectedStudentPerformance
    ) {
      return;
    }

    const summaryHeaders = [
      'Student Name',
      'Branch',
      'Total Assessments',
      'Average Score',
      'Overall Percentage',
      'Last Assessment Date',
    ];
    const summaryRow = [
      this.selectedStudentPerformance.studentName ?? '',
      this.selectedStudentPerformance.branch ?? '',
      String(this.selectedStudentPerformance.totalAssessments ?? 0),
      this.formatNumber(this.selectedStudentPerformance.averageScore),
      this.formatNumber(this.selectedStudentPerformance.percentage),
      this.selectedStudentPerformance.lastAssessedOn ?? '',
    ];

    const rows: string[][] = [summaryHeaders, summaryRow, []];

    if (this.selectedStudentCourseNames.length) {
      rows.push(['Courses']);
      this.selectedStudentCourseNames.forEach((course, index) => {
        rows.push([`${index + 1}`, course]);
      });
      rows.push([]);
    }

    rows.push(['Subjects']);
    rows.push(['Subject', 'Assessments', 'Total Score', 'Total Max Score', 'Average %']);
    this.selectedStudentSummaryRows.forEach((summary) => {
      rows.push([
        summary.subject,
        String(summary.assessments ?? 0),
        this.formatNumber(summary.totalScore),
        this.formatNumber(summary.totalMaxScore),
        this.formatNumber(summary.percentage),
      ]);
    });

    const csv = this.buildCsv(rows);
    const safeName = (this.selectedStudentName || 'student')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    this.downloadCsv(csv, `${safeName || 'student'}-subject-breakdown.csv`);
  }


  // --- Progress analytics report ---
  generateProgressReport(): void {
    if (!this.isAdmin) {
      return;
    }
    this.reportLoading = true;
    this.reportError = '';
    this.reportSuccessMessage = '';
    this.reportRequested = true;
    this.progressReport = [];
    this.reportGeneratedAt = null;
    this.reportTotals = { students: 0, assessments: 0 };
    this.reportProgress = 0;
    this.reportStartTime = Date.now();
    this.pendingReportResponse = null;
    this.progressCompleted = false;
    this.startProgressTimer();
    this.studentService.getProgressReport().subscribe({
      next: (response) => {
        this.pendingReportResponse = response;
        this.finishIfReady();
      },
      error: (error) => {
        console.error('Error generating progress report:', error);
        this.reportError = 'Unable to generate the analytics report. Please try again.';
        this.stopProgressTimer();
        this.reportProgress = 0;
        this.reportLoading = false;
      },
    });
  }

  reportPercentage(value?: number | null): string {
    if (value === null || value === undefined || !Number.isFinite(value)) {
      return '—';
    }
    return `${value.toFixed(1)}%`;
  }

  reportScore(value?: number | null): string {
    if (value === null || value === undefined || !Number.isFinite(value)) {
      return '—';
    }
    return value.toFixed(1);
  }

  private startProgressTimer(): void {
    this.stopProgressTimer();
    this.reportTimer = setInterval(() => {
      const elapsed = Date.now() - this.reportStartTime;
      const progress = Math.min(100, (elapsed / this.reportDurationMs) * 100);
      this.reportProgress = Math.floor(progress);
      if (progress >= 100) {
        this.finishProgress();
      }
    }, 200);
  }

  private finishProgress(): void {
    this.reportProgress = 100;
    this.progressCompleted = true;
    this.stopProgressTimer();
    this.finishIfReady();
  }

  private stopProgressTimer(): void {
    if (this.reportTimer) {
      clearInterval(this.reportTimer);
      this.reportTimer = undefined;
    }
  }

  private finishIfReady(): void {
    if (!this.progressCompleted || !this.pendingReportResponse) {
      return;
    }
    const response = this.pendingReportResponse;
    this.pendingReportResponse = null;
    const students = response?.students ?? [];
    this.progressReport = students;
    this.reportGeneratedAt = response?.generatedAt ?? null;
    this.reportTotals = {
      students: response?.totalStudents ?? students.length,
      assessments:
        response?.totalAssessments ??
        students.reduce((sum, item) => sum + (item.totalAssessments ?? 0), 0),
    };
    this.exportReportAsCsv(response);
    
    // Email the report to admin
    this.studentService.emailProgressReport(response).subscribe({
      next: (message) => {
        this.reportSuccessMessage = `Student progress report downloaded and emailed to admin. ${this.reportTotals.students} students.`;
      },
      error: (error) => {
        console.error('Error emailing report:', error);
        this.reportSuccessMessage = `Student progress report downloaded for ${this.reportTotals.students} students. (Email failed: ${error.error || error.message || 'Unknown error'})`;
      },
    });
    
    this.progressReport = [];
    this.reportLoading = false;
  }

  private resetReport(): void {
    this.stopProgressTimer();
    this.reportLoading = false;
    this.reportRequested = false;
    this.reportError = '';
    this.reportSuccessMessage = '';
    this.progressReport = [];
    this.reportGeneratedAt = null;
    this.reportTotals = { students: 0, assessments: 0 };
    this.reportProgress = 0;
    this.pendingReportResponse = null;
    this.progressCompleted = false;
  }

  private exportReportAsCsv(response: StudentProgressReportResponse): void {
    const students = response?.students ?? [];
    if (!students.length) {
      return;
    }
    const headers = [
      'Student Name',
      'Branch',
      'Total Assessments',
      'Average Score',
      'Overall Percentage',
      'Last Assessment Date',
    ];
    const rows = students.map((student) => {
      return [
        student.studentName ?? '',
        student.branch ?? '',
        String(student.totalAssessments ?? 0),
        this.formatNumber(student.overallAverageScore),
        this.formatNumber(student.overallPercentage),
        student.lastAssessmentDate ?? '',
      ];
    });
    const csv = this.buildCsv([headers, ...rows]);
    const timestamp = new Date().toISOString().replace(/[:]/g, '-');
    this.downloadCsv(csv, `student-progress-report-${timestamp}.csv`);
  }

  private buildCsv(rows: string[][]): string {
    return rows.map((row) => row.map((value) => this.escapeCsvValue(value ?? '')).join(',')).join('\r\n');
  }

  private escapeCsvValue(value: string): string {
    const needsQuotes = /[",\r\n]/.test(value);
    const escaped = value.replace(/"/g, '""');
    return needsQuotes ? `"${escaped}"` : escaped;
  }

  private downloadCsv(content: string, filename: string): void {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  private formatNumber(value?: number | null): string {
    if (value === null || value === undefined || !Number.isFinite(value)) {
      return '';
    }
    return value.toFixed(2);
  }
}


