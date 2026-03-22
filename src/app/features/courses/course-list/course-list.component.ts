import { CommonModule } from '@angular/common';
import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { HttpErrorResponse } from '@angular/common/http';

import { ApiResponse } from '../../../core/models/auth-api.model';
import { CourseSummary, PaginatedCourses } from '../../../core/models/course.model';
import { AuthService } from '../../../core/services/auth.service';
import { CourseService } from '../../../core/services/course.service';
import { NotificationService } from '../../../core/services/notification.service';
import { ConfirmDialogComponent } from '../../../shared/ui/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-course-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, TranslateModule, ConfirmDialogComponent],
  templateUrl: './course-list.component.html',
})
export class CourseListComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly courseService = inject(CourseService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly notificationService = inject(NotificationService);
  readonly authService = inject(AuthService);

  readonly deletingId = signal<number | null>(null);
  readonly coursePendingDelete = signal<CourseSummary | null>(null);

  readonly loading = signal(false);
  readonly loadError = signal<string | null>(null);
  readonly courses = signal<CourseSummary[]>([]);
  readonly pageNumber = signal(1);
  readonly totalPages = signal(0);
  readonly totalItems = signal(0);
  readonly pageSize = 9;

  readonly isTeacher = computed(
    () => this.authService.getCurrentRole()?.toLowerCase() === 'teacher',
  );

  readonly filterForm = this.formBuilder.nonNullable.group({
    searchTerm: [''],
    sortBy: ['createdAt' as 'title' | 'price' | 'createdAt'],
    sortDirection: ['desc' as 'asc' | 'desc'],
    minPrice: ['' as string | number],
    maxPrice: ['' as string | number],
  });

  constructor() {
    this.loadPage(1);
  }

  loadPage(page: number): void {
    this.loading.set(true);
    this.loadError.set(null);

    const raw = this.filterForm.getRawValue();
    const min = raw.minPrice === '' || raw.minPrice === null ? undefined : Number(raw.minPrice);
    const max = raw.maxPrice === '' || raw.maxPrice === null ? undefined : Number(raw.maxPrice);

    this.courseService
      .searchCourses({
        searchTerm: raw.searchTerm.trim() || undefined,
        sortBy: raw.sortBy,
        sortDirection: raw.sortDirection,
        minPrice: min != null && !Number.isNaN(min) ? min : undefined,
        maxPrice: max != null && !Number.isNaN(max) ? max : undefined,
        pageNumber: page,
        pageSize: this.pageSize,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response: ApiResponse<PaginatedCourses>) => {
          if (!response.success || !response.data) {
            this.loadError.set(response.errors[0] ?? response.message);
            this.loading.set(false);
            return;
          }

          this.courses.set(response.data.items);
          this.pageNumber.set(response.data.pageNumber);
          this.totalPages.set(response.data.totalPages);
          this.totalItems.set(response.data.totalItems);
          this.loading.set(false);
        },
        error: (error: HttpErrorResponse) => {
          const api = error.error as Partial<ApiResponse<unknown>> | undefined;
          this.loadError.set(api?.errors?.[0] ?? api?.message ?? error.message);
          this.loading.set(false);
        },
      });
  }

  applyFilters(): void {
    this.loadPage(1);
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages()) {
      return;
    }
    this.loadPage(page);
  }

  clearFilters(): void {
    this.filterForm.reset({
      searchTerm: '',
      sortBy: 'createdAt',
      sortDirection: 'desc',
      minPrice: '',
      maxPrice: '',
    });
    this.loadPage(1);
  }

  isCourseOwner(course: CourseSummary): boolean {
    if (this.authService.getCurrentRole()?.toLowerCase() !== 'teacher') {
      return false;
    }
    const uid = this.authService.getCurrentUserId();
    return Boolean(uid && course.teacherId === uid);
  }

  openDeleteDialog(course: CourseSummary, event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    if (!this.isCourseOwner(course)) {
      return;
    }
    this.coursePendingDelete.set(course);
  }

  onDeleteDialogCancelled(): void {
    this.coursePendingDelete.set(null);
  }

  executePendingDelete(): void {
    const course = this.coursePendingDelete();
    if (!course) {
      return;
    }

    this.deletingId.set(course.id);

    this.courseService
      .deleteCourse(course.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response: ApiResponse<unknown>) => {
          this.deletingId.set(null);
          this.coursePendingDelete.set(null);
          if (!response.success) {
            this.loadError.set(response.errors[0] ?? response.message);
            return;
          }
          this.notificationService.show('NOTIFICATIONS.COURSE_DELETED', 'success');
          this.loadPage(this.pageNumber());
        },
        error: (error: HttpErrorResponse) => {
          this.deletingId.set(null);
          this.coursePendingDelete.set(null);
          const api = error.error as Partial<ApiResponse<unknown>> | undefined;
          this.loadError.set(api?.errors?.[0] ?? api?.message ?? error.message);
        },
      });
  }
}
