import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';


import { Router, RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { HttpErrorResponse } from '@angular/common/http';

import { ApiResponse } from '../../../core/models/auth-api.model';
import { CourseService } from '../../../core/services/course.service';
import { NotificationService } from '../../../core/services/notification.service';

@Component({
  selector: 'app-course-create',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, TranslateModule],
  templateUrl: './course-create.component.html',
})
export class CourseCreateComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly courseService = inject(CourseService);
  private readonly router = inject(Router);
  private readonly notificationService = inject(NotificationService);
  private readonly destroyRef = inject(DestroyRef);

  readonly submitting = signal(false);
  readonly submitError = signal<string | null>(null);

  readonly selectedFile = signal<File | null>(null);

  readonly form = this.formBuilder.nonNullable.group({
    title: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(200)]],
    description: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(4000)]],
    price: [0, [Validators.required, Validators.min(0)]],
  });

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) {
      this.selectedFile.set(input.files[0]!);
    } else {
      this.selectedFile.set(null);
    }
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.submitError.set(null);

    const v = this.form.getRawValue();

    this.courseService
      .createCourse({
        title: v.title.trim(),
        description: v.description.trim(),
        price: Number(v.price),
        imageFile: this.selectedFile() ?? undefined,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response: ApiResponse<number>) => {
          this.submitting.set(false);
          if (!response.success) {
            this.submitError.set(response.errors[0] ?? response.message);
            return;
          }

          this.notificationService.show('NOTIFICATIONS.COURSE_CREATED', 'success');
          const id = response.data;
          if (typeof id === 'number') {
            this.router.navigate(['/courses', id]);
            return;
          }
          this.router.navigate(['/courses']);
        },
        error: (error: HttpErrorResponse) => {
          this.submitting.set(false);
          const api = error.error as Partial<ApiResponse<unknown>> | undefined;
          this.submitError.set(api?.errors?.[0] ?? api?.message ?? error.message);
        },
      });
  }
}
