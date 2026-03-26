import { CommonModule } from '@angular/common';
import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { HttpErrorResponse } from '@angular/common/http';
import { forkJoin, map, switchMap, EMPTY } from 'rxjs';
import { loadStripe, Stripe, StripeElements } from '@stripe/stripe-js';
import { environment } from '../../../../environments/environment';

import { ApiResponse } from '../../../core/models/auth-api.model';
import { CourseDetails } from '../../../core/models/course.model';
import { AuthService } from '../../../core/services/auth.service';
import { CourseService } from '../../../core/services/course.service';
import { LessonService } from '../../../core/services/lesson.service';
import { NotificationService } from '../../../core/services/notification.service';
import { ConfirmDialogComponent } from '../../../shared/ui/confirm-dialog/confirm-dialog.component';
import { CourseEnrollmentFacade } from '../../../core/services/course-enrollment.facade';
import { ChildDto } from '../../../core/models/parent.model';

import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-course-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslateModule, ConfirmDialogComponent, FormsModule],
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
  private readonly courseEnrollmentFacade = inject(CourseEnrollmentFacade);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly course = signal<CourseDetails | null>(null);
  readonly deleting = signal(false);
  readonly deleteDialogOpen = signal(false);

  readonly deletingLessonId = signal<number | null>(null);
  readonly deleteLessonDialogOpen = signal(false);
  readonly deletingLesson = signal(false);

  // Enrollment State
  readonly enrollModalOpen = signal(false);
  readonly loadingChildren = signal(false);
  readonly enrollChildren = signal<ChildDto[]>([]);
  readonly enrolledChildIds = signal<number[]>([]);
  readonly selectedChildId = signal<number | null>(null);
  readonly enrolling = signal(false);
  readonly enrollError = signal<string | null>(null);

  // Stripe Payment State
  readonly isPaymentStep = signal(false);
  readonly clientSecret = signal<string | null>(null);
  readonly paymentId = signal<number | null>(null);
  private stripePromise = loadStripe(environment.stripePublishableKey);
  private stripe: Stripe | null = null;
  private elements: StripeElements | null = null;

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

  // --- Enrollment Flow ---
  get isParent(): boolean {
    return this.authService.getCurrentRole()?.toLowerCase() === 'parent';
  }

  openEnrollModal(): void {
    if (!this.isParent) return;
    this.enrollModalOpen.set(true);
    this.selectedChildId.set(null);
    this.enrollError.set(null);

    this.loadingChildren.set(true);

    const cid = this.course()?.id;
    if (!cid) return;

    this.courseEnrollmentFacade.getEnrollmentData(cid)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ children, enrolledChildIds }) => {
          this.loadingChildren.set(false);
          this.enrollChildren.set(children);
          this.enrolledChildIds.set(enrolledChildIds);
        },
        error: () => this.loadingChildren.set(false)
      });
  }

  closeEnrollModal(): void {
    this.enrollModalOpen.set(false);
    this.isPaymentStep.set(false);
    this.clientSecret.set(null);
    this.paymentId.set(null);
    if (this.elements) {
      const paymentElement = this.elements.getElement('payment');
      if (paymentElement) paymentElement.destroy();
      this.elements = null;
    }
  }

  async submitEnrollment(): Promise<void> {
    const cId = this.selectedChildId();
    const c = this.course();
    if (!cId || !c) return;

    this.enrolling.set(true);
    this.enrollError.set(null);

    // If we are in the payment step, process with Stripe
    if (this.isPaymentStep() && this.stripe && this.elements) {
      this.processStripePayment();
      return;
    }

    if (c.price > 0) {
      // Paid Flow - step 1: get client secret
      this.courseEnrollmentFacade.initiatePaidEnrollment(c.id)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: async (res) => {
            if (!res.success || !res.data) {
              this.enrolling.set(false);
              this.enrollError.set(res.message);
              return;
            }

            this.clientSecret.set(res.data.clientSecret);
            this.paymentId.set(res.data.paymentId);
            this.isPaymentStep.set(true);
            this.enrolling.set(false);

            // Initialize Stripe Elements
            this.stripe = await this.stripePromise;
            if (!this.stripe) {
              this.enrollError.set('Failed to load Stripe.');
              return;
            }
            this.elements = this.stripe.elements({
              clientSecret: res.data.clientSecret,
              appearance: { theme: 'stripe' }
            });

            // Need small timeout to ensure DOM is ready for mount
            setTimeout(() => {
              const paymentElement = this.elements!.create('payment');
              paymentElement.mount('#payment-element');
            }, 100);
          },
          error: (err: HttpErrorResponse) => {
            this.enrolling.set(false);
            const msg = err.error?.message || err.message;
            this.enrollError.set(msg);
          }
        });
    } else {
      // Free Flow
      this.courseEnrollmentFacade.processFreeEnrollment(cId, c.id)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (res) => {
            this.enrolling.set(false);
            if (!res.success) {
              this.enrollError.set(res.errors?.[0] ?? res.message);
              return;
            }
            this.closeEnrollModal();
            this.notificationService.show('NOTIFICATIONS.ENROLL_SUCCESS', 'success');
          },
          error: (err: HttpErrorResponse) => {
            this.enrolling.set(false);
            const api = err.error as any;
            this.enrollError.set(api?.errors?.[0] ?? api?.message ?? err.message);
          }
        });
    }
  }

  private async processStripePayment(): Promise<void> {
    if (!this.stripe || !this.elements) return;

    // confirm payment with stripe
    const { error, paymentIntent } = await this.stripe.confirmPayment({
      elements: this.elements,
      redirect: 'if_required'
    });

    if (error) {
      this.enrolling.set(false);
      this.enrollError.set(error.message || 'Payment failed');
      return;
    }

    if (paymentIntent && paymentIntent.status === 'succeeded') {
      // now confirm with our backend
      const pId = this.paymentId();
      const cId = this.selectedChildId();
      if (!pId || !cId) return;

      this.courseEnrollmentFacade.confirmPaidEnrollment(pId, cId)
        .subscribe({
        next: () => {
          this.enrolling.set(false);
          this.closeEnrollModal();
          this.notificationService.show('NOTIFICATIONS.ENROLL_SUCCESS', 'success');
        },
        error: (err: HttpErrorResponse) => {
          this.enrolling.set(false);
          const msg = err.error?.message || err.message;
          this.enrollError.set(msg);
        }
      });
    } else {
      this.enrolling.set(false);
      this.enrollError.set('Payment was not successful. Status: ' + paymentIntent?.status);
    }
  }
}
