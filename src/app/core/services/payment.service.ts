import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, Observable, throwError } from 'rxjs';

import {
  ConfirmPaymentRequestDto,
  ConfirmPaymentResponse,
  CreatePaymentRequestDto,
  CreatePaymentResponse,
} from '../models/payment.model';

@Injectable({ providedIn: 'root' })
export class PaymentService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'https://localhost:5001/api/payments';

  createPayment(payload: CreatePaymentRequestDto): Observable<CreatePaymentResponse> {
    return this.http.post<CreatePaymentResponse>(`${this.baseUrl}/create`, payload).pipe(
      catchError((error: HttpErrorResponse) => throwError(() => error)),
    );
  }

  confirmPayment(payload: ConfirmPaymentRequestDto): Observable<ConfirmPaymentResponse> {
    return this.http.post<ConfirmPaymentResponse>(`${this.baseUrl}/confirm`, payload).pipe(
      catchError((error: HttpErrorResponse) => throwError(() => error)),
    );
  }
}
