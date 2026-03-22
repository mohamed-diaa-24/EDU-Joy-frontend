import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, Observable, throwError } from 'rxjs';

import { EnrollRequestDto, EnrollResponse } from '../models/enrollment.model';

@Injectable({ providedIn: 'root' })
export class EnrollmentService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'https://localhost:5001/api/enrollments';

  enroll(payload: EnrollRequestDto): Observable<EnrollResponse> {
    return this.http.post<EnrollResponse>(`${this.baseUrl}/enroll`, payload).pipe(
      catchError((error: HttpErrorResponse) => throwError(() => error)),
    );
  }
}
