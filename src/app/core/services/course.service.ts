import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, Observable, throwError, Subject, tap } from 'rxjs';
import { environment } from '../../../environments/environment';

import {
  CourseDetailsResponse,
  CourseSearchParams,
  CourseSearchResponse,
  CreateCourseRequest,
  CreateCourseResponse,
  DeleteCourseResponse,
  UpdateCourseRequest,
  UpdateCourseResponse,
} from '../models/course.model';

@Injectable({ providedIn: 'root' })
export class CourseService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/courses`;

  searchCourses(params: CourseSearchParams = {}): Observable<CourseSearchResponse> {
    let httpParams = new HttpParams()
      .set('pageNumber', String(params.pageNumber ?? 1))
      .set('pageSize', String(params.pageSize ?? 9));

    if (params.searchTerm?.trim()) {
      httpParams = httpParams.set('searchTerm', params.searchTerm.trim());
    }
    if (params.minPrice != null && !Number.isNaN(params.minPrice)) {
      httpParams = httpParams.set('minPrice', String(params.minPrice));
    }
    if (params.maxPrice != null && !Number.isNaN(params.maxPrice)) {
      httpParams = httpParams.set('maxPrice', String(params.maxPrice));
    }
    if (params.sortBy) {
      httpParams = httpParams.set('sortBy', params.sortBy);
    }
    if (params.sortDirection) {
      httpParams = httpParams.set('sortDirection', params.sortDirection);
    }

    return this.http.get<CourseSearchResponse>(this.baseUrl, { params: httpParams }).pipe(
      catchError((error: HttpErrorResponse) => throwError(() => error)),
    );
  }

  getCourseById(courseId: number): Observable<CourseDetailsResponse> {
    return this.http.get<CourseDetailsResponse>(`${this.baseUrl}/${courseId}`).pipe(
      catchError((error: HttpErrorResponse) => throwError(() => error)),
    );
  }

  createCourse(payload: CreateCourseRequest): Observable<CreateCourseResponse> {
    const formData = new FormData();
    formData.append('title', payload.title);
    formData.append('description', payload.description);
    formData.append('price', String(payload.price));
    if (payload.imageFile) {
      formData.append('imageFile', payload.imageFile);
    }
    
    return this.http.post<CreateCourseResponse>(this.baseUrl, formData).pipe(
      catchError((error: HttpErrorResponse) => throwError(() => error)),
    );
  }

  updateCourse(courseId: number, payload: UpdateCourseRequest): Observable<UpdateCourseResponse> {
    const formData = new FormData();
    formData.append('title', payload.title);
    formData.append('description', payload.description);
    formData.append('price', String(payload.price));
    if (payload.imageFile) {
      formData.append('imageFile', payload.imageFile);
    }

    return this.http
      .put<UpdateCourseResponse>(`${this.baseUrl}/${courseId}`, formData)
      .pipe(catchError((error: HttpErrorResponse) => throwError(() => error)));
  }

  deleteCourse(courseId: number): Observable<DeleteCourseResponse> {
    return this.http
      .delete<DeleteCourseResponse>(`${this.baseUrl}/${courseId}`)
      .pipe(catchError((error: HttpErrorResponse) => throwError(() => error)));
  }
}
