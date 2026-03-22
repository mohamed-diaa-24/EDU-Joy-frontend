import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { HttpErrorResponse } from '@angular/common/http';
import { map } from 'rxjs';

import { ApiResponse } from '../../../core/models/auth-api.model';
import { LessonService } from '../../../core/services/lesson.service';
import { NotificationService } from '../../../core/services/notification.service';

@Component({
  selector: 'app-lesson-create',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, TranslateModule],
  templateUrl: './lesson-create.component.html',
})
export class LessonCreateComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly lessonService = inject(LessonService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly notificationService = inject(NotificationService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly translate = inject(TranslateService);

  readonly submitting = signal(false);
  readonly submitError = signal<string | null>(null);
  readonly courseId = signal<number | null>(null);

  readonly form = this.formBuilder.nonNullable.group({
    title: ['', [Validators.required, Validators.maxLength(200)]],
    description: ['', [Validators.maxLength(2000)]],
    videoUrl: ['', [Validators.required, Validators.pattern(/https?:\/\/.+/)]],
    order: [1, [Validators.required, Validators.min(1)]],
  });

  constructor() {
    this.route.paramMap
      .pipe(
        map((params) => params.get('id')),
        map((raw) => (raw ? Number.parseInt(raw, 10) : NaN)),
      )
      .subscribe((id) => {
        if (!Number.isNaN(id) && id > 0) {
          this.courseId.set(id);
        } else {
          this.submitError.set(this.translate.instant('COURSES.INVALID_ID'));
        }
      });
  }

  onSubmit(): void {
    const cId = this.courseId();
    if (!cId || this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.submitError.set(null);

    const v = this.form.getRawValue();

    this.lessonService
      .createLesson({
        title: v.title.trim(),
        description: v.description.trim(),
        videoUrl: v.videoUrl.trim(),
        order: Number(v.order),
        courseId: cId,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response: ApiResponse<number>) => {
          this.submitting.set(false);
          if (!response.success) {
            this.submitError.set(response.errors?.[0] ?? response.message);
            return;
          }

          this.notificationService.show('NOTIFICATIONS.LESSON_CREATED', 'success');
          this.router.navigate(['/courses', cId]);
        },
        error: (error: HttpErrorResponse) => {
          this.submitting.set(false);
          const api = error.error as Partial<ApiResponse<unknown>> | undefined;
          this.submitError.set(api?.errors?.[0] ?? api?.message ?? error.message);
        },
      });
  }
}
