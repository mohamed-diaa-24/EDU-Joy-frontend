import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, Observable, throwError } from 'rxjs';

import {
  LessonCreateRequest,
  LessonCreateResponse,
  LessonDeleteResponse,
  LessonDetailsResponse,
  LessonUpdateRequest,
  LessonUpdateResponse,
} from '../models/lesson.model';

@Injectable({ providedIn: 'root' })
export class LessonService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'https://localhost:5001/api/lessons';

  getLessonById(lessonId: number): Observable<LessonDetailsResponse> {
    return this.http.get<LessonDetailsResponse>(`${this.baseUrl}/${lessonId}`).pipe(
      catchError((error: HttpErrorResponse) => throwError(() => error)),
    );
  }

  createLesson(payload: LessonCreateRequest): Observable<LessonCreateResponse> {
    return this.http.post<LessonCreateResponse>(this.baseUrl, payload).pipe(
      catchError((error: HttpErrorResponse) => throwError(() => error)),
    );
  }

  updateLesson(lessonId: number, payload: LessonUpdateRequest): Observable<LessonUpdateResponse> {
    return this.http.put<LessonUpdateResponse>(`${this.baseUrl}/${lessonId}`, payload).pipe(
      catchError((error: HttpErrorResponse) => throwError(() => error)),
    );
  }

  deleteLesson(lessonId: number): Observable<LessonDeleteResponse> {
    return this.http.delete<LessonDeleteResponse>(`${this.baseUrl}/${lessonId}`).pipe(
      catchError((error: HttpErrorResponse) => throwError(() => error)),
    );
  }
}
