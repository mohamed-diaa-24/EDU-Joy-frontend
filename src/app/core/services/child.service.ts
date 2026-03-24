import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, Observable, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/auth-api.model';

import {
  ChildCoursesResponse,
  ChildLessonsResponse,
  CompleteLessonDto,
  ProgressResponse,
} from '../models/child.model';

@Injectable({ providedIn: 'root' })
export class ChildService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/child`;

  getMyCourses(): Observable<ChildCoursesResponse> {
    return this.http.get<ChildCoursesResponse>(`${this.baseUrl}/my-courses`).pipe(
      catchError((error: HttpErrorResponse) => throwError(() => error)),
    );
  }

  getCourseLessons(courseId: number): Observable<ChildLessonsResponse> {
    return this.http.get<ChildLessonsResponse>(`${this.baseUrl}/course/${courseId}/lessons`).pipe(
      catchError((error: HttpErrorResponse) => throwError(() => error)),
    );
  }

  completeLesson(dto: CompleteLessonDto): Observable<ProgressResponse> {
    return this.http.post<ProgressResponse>(`${environment.apiUrl}/progress/complete`, dto).pipe(
      catchError((error: HttpErrorResponse) => throwError(() => error)),
    );
  }

  getMyProgress(courseId: number): Observable<ApiResponse<{ lessonId: number; completed: boolean }[]>> {
    return this.http.get<ApiResponse<{ lessonId: number; completed: boolean }[]>>(`${environment.apiUrl}/progress/my-progress?courseId=${courseId}`).pipe(
      catchError((error: HttpErrorResponse) => throwError(() => error)),
    );
  }
}
