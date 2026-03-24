import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { HttpErrorResponse, HttpEvent, HttpEventType } from '@angular/common/http';
import { EMPTY, map, switchMap } from 'rxjs';

import { ApiResponse } from '../../../core/models/auth-api.model';
import { LessonService } from '../../../core/services/lesson.service';
import { NotificationService } from '../../../core/services/notification.service';
import { VideoUploadService } from '../../../core/services/video-upload.service';

@Component({
  selector: 'app-lesson-create',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, TranslateModule],
  templateUrl: './lesson-create.component.html',
})
export class LessonCreateComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly lessonService = inject(LessonService);
  private readonly videoUploadService = inject(VideoUploadService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly notificationService = inject(NotificationService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly translate = inject(TranslateService);

  readonly submitting = signal(false);
  readonly submitError = signal<string | null>(null);
  readonly courseId = signal<number | null>(null);
  
  readonly isUploading = signal<boolean>(false);
  readonly uploadProgress = signal<number>(0);
  selectedVideoFile: File | null = null;

  readonly form = this.formBuilder.nonNullable.group({
    title: ['', [Validators.required, Validators.maxLength(200)]],
    description: ['', [Validators.maxLength(2000)]],
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

  onVideoFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedVideoFile = input.files[0];
    }
  }

  onSubmit(): void {
    const cId = this.courseId();
    if (!cId || this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    if (!this.selectedVideoFile) {
      this.submitError.set(this.translate.instant('LESSONS.VIDEO_REQUIRED_FILE') || 'Please select a video file.');
      return;
    }

    this.submitting.set(true);
    this.submitError.set(null);

    const v = this.form.getRawValue();

    this.videoUploadService.getSignature()
      .pipe(
        switchMap(signature => {
          this.isUploading.set(true);
          this.uploadProgress.set(0);
          return this.videoUploadService.uploadVideo(this.selectedVideoFile!, signature);
        }),
        switchMap((event: HttpEvent<any>) => {
          if (event.type === HttpEventType.UploadProgress) {
            if (event.total) {
              const progress = Math.round(100 * event.loaded / event.total);
              this.uploadProgress.set(progress);
            }
            return EMPTY;
          } else if (event.type === HttpEventType.Response) {
            this.isUploading.set(false);
            const uploadResponse = event.body;
            return this.lessonService.createLesson({
              title: v.title.trim(),
              description: v.description.trim(),
              videoUrl: uploadResponse.secure_url,
              cloudinaryPublicId: uploadResponse.public_id,
              order: Number(v.order),
              courseId: cId,
              quizQuestions: (this.form.get('quizQuestions')?.value || []).map((q: any) => ({
                questionText: q.questionText,
                option1: q.option1,
                option2: q.option2,
                option3: q.option3,
                correctOptionIndex: Number(q.correctOptionIndex)
              })),
            });
          }
          return EMPTY;
        }),
        takeUntilDestroyed(this.destroyRef)
      )
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
          this.isUploading.set(false);
          const api = error.error as Partial<ApiResponse<unknown>> | undefined;
          this.submitError.set(api?.errors?.[0] ?? api?.message ?? error.message);
        },
      });
  }
}
