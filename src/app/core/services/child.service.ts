import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, Observable, throwError } from 'rxjs';

import { ChildCoursesResponse, ChildLessonsResponse } from '../models/child.model';

@Injectable({ providedIn: 'root' })
export class ChildService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'https://localhost:5001/api/child';

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
}
