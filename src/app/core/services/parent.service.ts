import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, Observable, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';

import {
  AddChildRequestDto,
  AddChildResponse,
  ChildProgressResponse,
  GetChildrenResponse,
  ParentCoursesResponse,
} from '../models/parent.model';

@Injectable({ providedIn: 'root' })
export class ParentService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/parent`;

  getChildren(): Observable<GetChildrenResponse> {
    return this.http.get<GetChildrenResponse>(`${this.baseUrl}/children`).pipe(
      catchError((error: HttpErrorResponse) => throwError(() => error)),
    );
  }

  getChildProgress(childId: number): Observable<ChildProgressResponse> {
    return this.http.get<ChildProgressResponse>(`${this.baseUrl}/child-progress/${childId}`).pipe(
      catchError((error: HttpErrorResponse) => throwError(() => error)),
    );
  }

  addChild(payload: AddChildRequestDto): Observable<AddChildResponse> {
    return this.http.post<AddChildResponse>(`${this.baseUrl}/add-child`, payload).pipe(
      catchError((error: HttpErrorResponse) => throwError(() => error)),
    );
  }

  getMyCourses(): Observable<ParentCoursesResponse> {
    return this.http.get<ParentCoursesResponse>(`${this.baseUrl}/my-courses`).pipe(
      catchError((error: HttpErrorResponse) => throwError(() => error)),
    );
  }
}
