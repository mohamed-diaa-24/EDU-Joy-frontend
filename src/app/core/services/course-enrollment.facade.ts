import { Injectable, inject } from '@angular/core';
import { forkJoin, map, Observable } from 'rxjs';
import { ParentService } from './parent.service';
import { PaymentService } from './payment.service';
import { EnrollmentService } from './enrollment.service';
import { ChildDto } from '../models/parent.model';
import { ApiResponse } from '../models/auth-api.model';
import { CreatePaymentResponseDto } from '../models/payment.model';

@Injectable({ providedIn: 'root' })
export class CourseEnrollmentFacade {
  private readonly parentService = inject(ParentService);
  private readonly paymentService = inject(PaymentService);
  private readonly enrollmentService = inject(EnrollmentService);

  getEnrollmentData(courseId: number): Observable<{ children: ChildDto[], enrolledChildIds: number[] }> {
    return forkJoin({
      children: this.parentService.getChildren().pipe(map(it => it.success && it.data ? it.data : [])),
      courses: this.parentService.getMyCourses().pipe(map(it => it.success && it.data ? it.data : []))
    }).pipe(
      map(({ children, courses }) => {
        const enrolledChildIds = courses.filter(c => c.courseId === courseId).map(c => c.childId);
        return { children, enrolledChildIds };
      })
    );
  }

  processFreeEnrollment(childId: number, courseId: number): Observable<ApiResponse<unknown>> {
    return this.enrollmentService.enroll({ childId, courseId });
  }

  initiatePaidEnrollment(courseId: number): Observable<ApiResponse<CreatePaymentResponseDto>> {
    return this.paymentService.createPayment({ courseId });
  }

  confirmPaidEnrollment(paymentId: number, childId: number): Observable<ApiResponse<unknown>> {
    return this.paymentService.confirmPayment({ paymentId, childId });
  }
}
