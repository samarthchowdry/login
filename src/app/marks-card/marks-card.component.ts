import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { MarksCard, StudentService } from '../services/student.service';

@Component({
  selector: 'app-marks-card',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './marks-card.component.html',
  styleUrls: ['./marks-card.component.css'],
})
export class MarksCardComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private studentService = inject(StudentService);

  marksCard: MarksCard | null = null;
  performanceData: Array<{ label: string; percent: number }> = [];
  performanceVariants: Map<string, number> = new Map();
  percentAxisTicks: number[] = [100, 80, 60, 40, 20, 0];
  maxPercentValue = 100;
  baselineOffset = 0;
  isLoading = false;
  errorMessage = '';
  private subscription?: Subscription;

  ngOnInit(): void {
    const studentId = Number(this.route.snapshot.paramMap.get('id'));
    if (!studentId) {
      this.errorMessage = 'Invalid student identifier.';
      return;
    }
    this.fetchMarksCard(studentId);
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  private fetchMarksCard(studentId: number): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.subscription = this.studentService.getMarksCard(studentId).subscribe({
      next: (card) => {
        this.marksCard = card;
        this.performanceData = (card.marks || [])
          .filter((mark) => mark.maxScore && mark.maxScore > 0)
          .map((mark) => ({
            label: mark.subject,
            percent: Math.min(100, Math.max(0, (mark.score / (mark.maxScore ?? 1)) * 100)),
          }))
          .sort((a, b) => {
            if (b.percent !== a.percent) {
              return b.percent - a.percent;
            }
            return a.label.localeCompare(b.label);
          });
        this.assignPerformanceVariants();
        this.refreshPerformanceChartView();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading marks card:', error);
        this.errorMessage =
          typeof error?.error === 'string'
            ? error.error
            : error?.error?.message || 'Unable to load marks card.';
        this.isLoading = false;
      },
    });
  }

  get totalSubjects(): number {
    return this.marksCard?.marks?.length ?? 0;
  }

  get formattedPercentage(): string {
    if (this.marksCard?.percentage === undefined || this.marksCard?.percentage === null) {
      return '-';
    }
    return `${this.marksCard.percentage.toFixed(2)}%`;
  }

  getBarHeight(percent: number): number {
    if (!this.maxPercentValue) {
      return 0;
    }
    if (percent <= 0) {
      return 0;
    }
    const scaled = (percent / this.maxPercentValue) * 100;
    return Math.min(100, Math.max(0, scaled));
  }

  isHighlightSubject(label?: string | null): boolean {
    if (!label) {
      return false;
    }
    return label.trim().toLowerCase() === 'python fullstack';
  }

  getVariantClass(label?: string | null): string {
    if (!label) {
      return 'variant-0';
    }
    const variantIndex = this.performanceVariants.get(label) ?? 0;
    return `variant-${variantIndex}`;
  }

  printCard(): void {
    window.print();
  }

  get percentStep(): number {
    if (this.percentAxisTicks.length >= 2) {
      return Math.abs(this.percentAxisTicks[0] - this.percentAxisTicks[1]) || 10;
    }
    return 10;
  }

  private refreshPerformanceChartView(): void {
    if (!this.performanceData.length) {
      this.percentAxisTicks = [100, 80, 60, 40, 20, 0];
      this.maxPercentValue = 100;
      return;
    }

    this.maxPercentValue = 100;
    this.percentAxisTicks = [100, 80, 60, 40, 20, 0];
    const zeroIndex = this.percentAxisTicks.findIndex((tick) => tick === 0);
    this.baselineOffset =
      zeroIndex >= 0 && this.percentAxisTicks.length > 1
        ? (zeroIndex / (this.percentAxisTicks.length - 1)) * 100
        : 100;
  }

  private assignPerformanceVariants(): void {
    this.performanceVariants.clear();
    if (!this.performanceData.length) {
      return;
    }

    const paletteSize = 10;
    let variant = 0;
    for (const item of this.performanceData) {
      const key = item.label;
      if (!this.performanceVariants.has(key)) {
        this.performanceVariants.set(key, variant);
        variant = (variant + 1) % paletteSize;
      }
    }
  }
}

