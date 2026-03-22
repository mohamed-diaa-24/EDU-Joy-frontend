import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';


import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { HttpErrorResponse } from '@angular/common/http';
import { EMPTY, map, switchMap } from 'rxjs';

import { ApiResponse } from '../../../core/models/auth-api.model';
import { CourseDetails } from '../../../core/models/course.model';
import { AuthService } from '../../../core/services/auth.service';
import { CourseService } from '../../../core/services/course.service';
import { NotificationService } from '../../../core/services/notification.service';

@Component({
  selector: 'app-course-edit',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, TranslateModule],
  templateUrl: './course-edit.component.html',
})
export class CourseEditComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly courseService = inject(CourseService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly notificationService = inject(NotificationService);
  private readonly authService = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly translate = inject(TranslateService);

  readonly loading = signal(true);
  readonly loadError = signal<string | null>(null);
  readonly submitting = signal(false);
  readonly submitError = signal<string | null>(null);
  readonly courseId = signal<number | null>(null);

  readonly form = this.formBuilder.nonNullable.group({
    title: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(200)]],
    description: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(4000)]],
    price: [0, [Validators.required, Validators.min(0)]],
  });

  readonly selectedFile = signal<File | null>(null);

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) {
      this.selectedFile.set(input.files[0]!);
    } else {
      this.selectedFile.set(null);
    }
  }

  constructor() {
    this.route.paramMap
      .pipe(
        map((params) => params.get('id')),
        map((raw) => (raw ? Number.parseInt(raw, 10) : NaN)),
        switchMap((id) => {
          if (Number.isNaN(id) || id <= 0) {
            this.loadError.set(this.translate.instant('COURSES.INVALID_ID'));
            this.loading.set(false);
            return EMPTY;
          }
          this.courseId.set(id);
          this.loading.set(true);
          this.loadError.set(null);
          return this.courseService.getCourseById(id);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (response: ApiResponse<CourseDetails>) => {
          if (!response.success || !response.data) {
            this.loadError.set(response.errors[0] ?? response.message);
            this.loading.set(false);
            return;
          }

          const uid = this.authService.getCurrentUserId();
          if (!uid || response.data.teacherId !== uid) {
            this.router.navigate(['/courses', response.data.id]);
            this.loading.set(false);
            return;
          }

          this.form.patchValue({
            title: response.data.title,
            description: response.data.description,
            price: response.data.price,
          });
          this.loading.set(false);
        },
        error: (err: HttpErrorResponse) => {
          const api = err.error as Partial<ApiResponse<unknown>> | undefined;
          this.loadError.set(api?.errors?.[0] ?? api?.message ?? err.message);
          this.loading.set(false);
        },
      });
  }

  onSubmit(): void {
    const id = this.courseId();
    if (!id || this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.submitError.set(null);

    const v = this.form.getRawValue();

    this.courseService
      .updateCourse(id, {
        title: v.title.trim(),
        description: v.description.trim(),
        price: Number(v.price),
        imageFile: this.selectedFile() ?? undefined,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response: ApiResponse<unknown>) => {
          this.submitting.set(false);
          if (!response.success) {
            this.submitError.set(response.errors[0] ?? response.message);
            return;
          }

          this.notificationService.show('NOTIFICATIONS.COURSE_UPDATED', 'success');
          this.router.navigate(['/courses', id]);
        },
        error: (error: HttpErrorResponse) => {
          this.submitting.set(false);
          const api = error.error as Partial<ApiResponse<unknown>> | undefined;
          this.submitError.set(api?.errors?.[0] ?? api?.message ?? error.message);
        },
      });
  }
}
