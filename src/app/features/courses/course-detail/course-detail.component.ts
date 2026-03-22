import { CommonModule } from '@angular/common';
import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { HttpErrorResponse } from '@angular/common/http';
import { EMPTY, map, switchMap } from 'rxjs';

import { ApiResponse } from '../../../core/models/auth-api.model';
import { CourseDetails } from '../../../core/models/course.model';
import { AuthService } from '../../../core/services/auth.service';
import { CourseService } from '../../../core/services/course.service';
import { LessonService } from '../../../core/services/lesson.service';
import { NotificationService } from '../../../core/services/notification.service';
import { ConfirmDialogComponent } from '../../../shared/ui/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-course-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslateModule, ConfirmDialogComponent],
  templateUrl: './course-detail.component.html',
})
export class CourseDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly courseService = inject(CourseService);
  private readonly lessonService = inject(LessonService);
  private readonly translate = inject(TranslateService);
  private readonly authService = inject(AuthService);
  private readonly notificationService = inject(NotificationService);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly course = signal<CourseDetails | null>(null);
  readonly deleting = signal(false);
  readonly deleteDialogOpen = signal(false);
  
  readonly deletingLessonId = signal<number | null>(null);
  readonly deleteLessonDialogOpen = signal(false);
  readonly deletingLesson = signal(false);

  readonly canManageCourse = computed(() => {
    if (this.authService.getCurrentRole()?.toLowerCase() !== 'teacher') {
      return false;
    }
    const uid = this.authService.getCurrentUserId();
    const c = this.course();
    if (!c?.teacherId || !uid) {
      return false;
    }
    return c.teacherId === uid;
  });

  constructor() {
    this.route.paramMap
      .pipe(
        map((params) => params.get('id')),
        map((id) => (id ? Number.parseInt(id, 10) : NaN)),
        switchMap((id) => {
          if (Number.isNaN(id) || id <= 0) {
            this.error.set(this.translate.instant('COURSES.INVALID_ID'));
            this.loading.set(false);
            return EMPTY;
          }
          this.loading.set(true);
          this.error.set(null);
          return this.courseService.getCourseById(id);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (response: ApiResponse<CourseDetails>) => {
          if (!response.success || !response.data) {
            this.error.set(response.errors[0] ?? response.message);
            this.course.set(null);
            this.loading.set(false);
            return;
          }
          this.course.set(response.data);
          this.loading.set(false);
        },
        error: (err: HttpErrorResponse) => {
          const api = err.error as Partial<ApiResponse<unknown>> | undefined;
          this.error.set(api?.errors?.[0] ?? api?.message ?? err.message);
          this.course.set(null);
          this.loading.set(false);
        },
      });
  }

  openDeleteDialog(): void {
    if (!this.canManageCourse() || this.deleting()) {
      return;
    }
    this.deleteDialogOpen.set(true);
  }

  onDeleteDialogCancelled(): void {
    this.deleteDialogOpen.set(false);
  }

  onDeleteConfirmed(): void {
    const c = this.course();
    if (!c || !this.canManageCourse() || this.deleting()) {
      return;
    }

    this.deleting.set(true);

    this.courseService
      .deleteCourse(c.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response: ApiResponse<unknown>) => {
          this.deleting.set(false);
          this.deleteDialogOpen.set(false);
          if (!response.success) {
            this.error.set(response.errors[0] ?? response.message);
            return;
          }
          this.notificationService.show('NOTIFICATIONS.COURSE_DELETED', 'success');
          this.router.navigate(['/courses']);
        },
        error: (err: HttpErrorResponse) => {
          this.deleting.set(false);
          this.deleteDialogOpen.set(false);
          const api = err.error as Partial<ApiResponse<unknown>> | undefined;
          this.error.set(api?.errors?.[0] ?? api?.message ?? err.message);
        },
      });
  }

  openDeleteLessonDialog(lessonId: number): void {
    if (!this.canManageCourse() || this.deletingLessonId() != null) return;
    this.deletingLessonId.set(lessonId);
    this.deleteLessonDialogOpen.set(true);
  }

  onDeleteLessonDialogCancelled(): void {
    this.deleteLessonDialogOpen.set(false);
    this.deletingLessonId.set(null);
  }

  onDeleteLessonConfirmed(): void {
    const lId = this.deletingLessonId();
    if (!lId || !this.canManageCourse() || this.deletingLesson()) return;

    this.deletingLesson.set(true);

    this.lessonService
      .deleteLesson(lId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response: ApiResponse<unknown>) => {
          this.deletingLesson.set(false);
          this.deleteLessonDialogOpen.set(false);
          this.deletingLessonId.set(null);
          if (!response.success) {
            this.error.set(response.errors?.[0] ?? response.message);
            return;
          }
          this.notificationService.show('NOTIFICATIONS.LESSON_DELETED', 'success');
          
          const c = this.course();
          if (c) {
              this.loading.set(true);
              this.courseService.getCourseById(c.id).subscribe((res) => {
                  if (res.success && res.data) {
                      this.course.set(res.data);
                  }
                  this.loading.set(false);
              });
          }
        },
        error: (err: HttpErrorResponse) => {
          this.deletingLesson.set(false);
          this.deleteLessonDialogOpen.set(false);
          this.deletingLessonId.set(null);
          const api = err.error as Partial<ApiResponse<unknown>> | undefined;
          this.error.set(api?.errors?.[0] ?? api?.message ?? err.message);
        },
      });
  }
}
