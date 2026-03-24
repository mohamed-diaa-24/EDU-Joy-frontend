import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { HttpErrorResponse } from '@angular/common/http';
import { EMPTY, map, switchMap } from 'rxjs';

import { ApiResponse } from '../../../core/models/auth-api.model';
import { CourseDetails } from '../../../core/models/course.model';
import { LessonDetails, LessonDetailsResponse } from '../../../core/models/lesson.model';
import { LessonService } from '../../../core/services/lesson.service';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';
import { CourseService } from '../../../core/services/course.service';

@Component({
  selector: 'app-lesson-edit',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, TranslateModule],
  templateUrl: './lesson-edit.component.html',
})
export class LessonEditComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly lessonService = inject(LessonService);
  private readonly courseService = inject(CourseService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly notificationService = inject(NotificationService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly translate = inject(TranslateService);

  readonly loading = signal(true);
  readonly loadError = signal<string | null>(null);
  readonly submitting = signal(false);
  readonly submitError = signal<string | null>(null);
  readonly courseId = signal<number | null>(null);
  readonly lessonId = signal<number | null>(null);

  readonly form = this.formBuilder.nonNullable.group({
    title: ['', [Validators.required, Validators.maxLength(200)]],
    description: ['', [Validators.maxLength(2000)]],
    videoUrl: ['', [Validators.required, Validators.pattern(/https?:\/\/.+/)]],
    order: [1, [Validators.required, Validators.min(1)]],
    quizQuestions: this.formBuilder.array([] as FormGroup[])
  });

  get quizQuestions(): FormArray {
    return this.form.get('quizQuestions') as FormArray;
  }

  addQuestion(): void {
    const questionForm = this.formBuilder.group({
      questionText: ['', Validators.required],
      option1: ['', Validators.required],
      option2: ['', Validators.required],
      option3: ['', Validators.required],
      correctOptionIndex: [0, [Validators.required, Validators.min(0), Validators.max(2)]]
    });
    this.quizQuestions.push(questionForm);
  }

  removeQuestion(index: number): void {
    this.quizQuestions.removeAt(index);
  }

  constructor() {
    this.route.paramMap
      .pipe(
        map((params) => ({
          courseId: Number.parseInt(params.get('id') ?? '', 10),
          lessonId: Number.parseInt(params.get('lessonId') ?? '', 10)
        })),
        switchMap((params) => {
          if (Number.isNaN(params.courseId) || params.courseId <= 0 || Number.isNaN(params.lessonId) || params.lessonId <= 0) {
            this.loadError.set(this.translate.instant('COURSES.INVALID_ID'));
            this.loading.set(false);
            return EMPTY;
          }
          this.courseId.set(params.courseId);
          this.lessonId.set(params.lessonId);
          this.loading.set(true);
          this.loadError.set(null);
          
          return this.lessonService.getLessonById(params.lessonId).pipe(
            switchMap((lessonResponse: LessonDetailsResponse) => {
              if (!lessonResponse.success || !lessonResponse.data) {
                this.loadError.set(lessonResponse.errors?.[0] ?? lessonResponse.message);
                this.loading.set(false);
                return EMPTY;
              }

              this.form.patchValue({
                title: lessonResponse.data.title,
                description: lessonResponse.data.description,
                videoUrl: lessonResponse.data.videoUrl,
                order: lessonResponse.data.order,
              });

              if (lessonResponse.data.quizQuestions) {
                lessonResponse.data.quizQuestions.forEach(q => {
                  this.quizQuestions.push(this.formBuilder.group({
                    questionText: [q.questionText, Validators.required],
                    option1: [q.option1, Validators.required],
                    option2: [q.option2, Validators.required],
                    option3: [q.option3, Validators.required],
                    correctOptionIndex: [q.correctOptionIndex, [Validators.required, Validators.min(0), Validators.max(2)]]
                  }));
                });
              }

              return this.courseService.getCourseById(params.courseId);
            })
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (courseResponse: ApiResponse<CourseDetails>) => {
          if (!courseResponse.success || !courseResponse.data) {
             this.loadError.set(courseResponse.errors?.[0] ?? courseResponse.message);
             this.loading.set(false);
             return;
          }
           
          const uid = this.authService.getCurrentUserId();
          if (!uid || courseResponse.data.teacherId !== uid) {
             this.router.navigate(['/courses', this.courseId()]);
             this.loading.set(false);
             return;
          }

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
    const cId = this.courseId();
    const lId = this.lessonId();
    if (!cId || !lId || this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.submitError.set(null);

    const v = this.form.getRawValue();

    this.lessonService
      .updateLesson(lId, {
        title: v.title.trim(),
        description: v.description.trim(),
        videoUrl: v.videoUrl.trim(),
        order: Number(v.order),
        courseId: cId,
        quizQuestions: (this.form.get('quizQuestions')?.value || []).map((q: any) => ({
          questionText: q.questionText,
          option1: q.option1,
          option2: q.option2,
          option3: q.option3,
          correctOptionIndex: Number(q.correctOptionIndex)
        })),
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response: ApiResponse<unknown>) => {
          this.submitting.set(false);
          if (!response.success) {
            this.submitError.set(response.errors?.[0] ?? response.message);
            return;
          }

          this.notificationService.show('NOTIFICATIONS.LESSON_UPDATED', 'success');
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
