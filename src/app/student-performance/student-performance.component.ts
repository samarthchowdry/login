import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin, Subscription } from 'rxjs';
import { StudentPerformance, StudentService, StudentMark, Student } from '../services/student.service';

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

  constructor(private studentService: StudentService) {}

  ngOnInit(): void {
    this.loadPerformance();
  }

  ngOnDestroy(): void {
    this.dataSub?.unsubscribe();
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
    this.loadStudentSubjects();
  }

  private ensureSelectedStudent(): void {
    if (!this.filtered.length) {
      this.selectedStudentId = null;
      this.selectedStudentName = '';
      this.subjectSummaries = [];
      return;
    }

    // Keep current selection if still present; otherwise choose first student
    const existing = this.filtered.find((item) => item.studentId === this.selectedStudentId);
    if (existing) {
      this.selectedStudentName = existing.studentName ?? '';
      return;
    }

    const first = this.filtered[0];
    this.selectedStudentId = first.studentId ?? null;
    this.selectedStudentName = first.studentName ?? '';
    this.loadStudentSubjects();
  }

  private loadStudentSubjects(): void {
    if (!this.selectedStudentId) {
      this.subjectSummaries = [];
      return;
    }

    const cached = this.marksCache.get(this.selectedStudentId);
    if (cached) {
      this.subjectSummaries = cached;
      return;
    }

    this.marksLoading = true;
    this.marksError = '';
    forkJoin({
      student: this.studentService.getStudentById(this.selectedStudentId),
      marks: this.studentService.getMarks(this.selectedStudentId),
    }).subscribe({
      next: ({ student, marks }) => {
        this.subjectSummaries = this.aggregateMarksBySubject(student, marks ?? []);
        this.marksCache.set(this.selectedStudentId!, this.subjectSummaries);
        this.marksLoading = false;
      },
      error: (error) => {
        console.error('Error loading student marks:', error);
        this.marksError = 'Unable to load subject breakdown.';
        this.subjectSummaries = [];
        this.marksLoading = false;
      },
    });
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
}


