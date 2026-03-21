import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { catchError, finalize, Observable, tap, throwError } from 'rxjs';

import {
  ApiResponse,
  AuthResponse,
  ChildProfileResponse,
  ChildLoginRequest,
  LoginRequest,
  RefreshTokenRequest,
  RegisterRequest,
  UpdateChildProfileRequest,
  UpdateProfileRequest,
  UserProfileResponse,
} from '../models/auth-api.model';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'https://localhost:5001/api/auth';
  private readonly childBaseUrl = 'https://localhost:5001/api/child';
  private static readonly tokenStorageKey = 'auth.token';
  private static readonly refreshTokenStorageKey = 'auth.refreshToken';
  private static readonly displayNameStorageKey = 'auth.displayName';

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly currentUser = signal<UserProfileResponse | null>(null);
  readonly currentChild = signal<ChildProfileResponse | null>(null);
  readonly displayName = signal(localStorage.getItem(AuthService.displayNameStorageKey) ?? '');
  readonly isAuthenticated = signal(Boolean(localStorage.getItem(AuthService.tokenStorageKey)));

  register(payload: RegisterRequest): Observable<ApiResponse<unknown>> {
    this.error.set(null);
    this.loading.set(true);

    return this.http.post<ApiResponse<unknown>>(`${this.baseUrl}/register`, payload).pipe(
      finalize(() => this.loading.set(false)),
      catchError((error: HttpErrorResponse) => this.handleHttpError(error)),
    );
  }

  login(payload: LoginRequest): Observable<ApiResponse<AuthResponse>> {
    this.error.set(null);
    this.loading.set(true);

    return this.http.post<ApiResponse<AuthResponse>>(`${this.baseUrl}/login`, payload).pipe(
      tap((response) => {
        if (response.success && response.data) {
          this.persistTokens(response.data.token, response.data.refreshToken);
        }
      }),
      finalize(() => this.loading.set(false)),
      catchError((error: HttpErrorResponse) => this.handleHttpError(error)),
    );
  }

  childLogin(payload: ChildLoginRequest): Observable<ApiResponse<AuthResponse>> {
    this.error.set(null);
    this.loading.set(true);

    return this.http.post<ApiResponse<AuthResponse>>(`${this.baseUrl}/child-login`, payload).pipe(
      tap((response) => {
        if (response.success && response.data) {
          this.persistTokens(response.data.token, response.data.refreshToken);
        }
      }),
      finalize(() => this.loading.set(false)),
      catchError((error: HttpErrorResponse) => this.handleHttpError(error)),
    );
  }

  refreshToken(payload: RefreshTokenRequest): Observable<ApiResponse<AuthResponse>> {
    this.error.set(null);
    this.loading.set(true);

    return this.http.post<ApiResponse<AuthResponse>>(`${this.baseUrl}/refresh`, payload).pipe(
      tap((response) => {
        if (response.success && response.data) {
          this.persistTokens(response.data.token, response.data.refreshToken);
        }
      }),
      finalize(() => this.loading.set(false)),
      catchError((error: HttpErrorResponse) => this.handleHttpError(error)),
    );
  }

  getProfile(): Observable<ApiResponse<UserProfileResponse>> {
    this.error.set(null);
    this.loading.set(true);

    return this.http.get<ApiResponse<UserProfileResponse>>(`${this.baseUrl}/profile`).pipe(
      tap((response) => {
        if (response.success && response.data) {
          this.currentUser.set(response.data);
          this.currentChild.set(null);
          this.setDisplayName(response.data.fullName);
        }
      }),
      finalize(() => this.loading.set(false)),
      catchError((error: HttpErrorResponse) => this.handleHttpError(error)),
    );
  }

  updateProfile(payload: UpdateProfileRequest): Observable<ApiResponse<UserProfileResponse>> {
    this.error.set(null);
    this.loading.set(true);

    return this.http.put<ApiResponse<UserProfileResponse>>(`${this.baseUrl}/profile`, payload).pipe(
      tap((response) => {
        if (response.success && response.data) {
          this.currentUser.set(response.data);
          this.setDisplayName(response.data.fullName);
        }
      }),
      finalize(() => this.loading.set(false)),
      catchError((error: HttpErrorResponse) => this.handleHttpError(error)),
    );
  }

  getChildProfile(): Observable<ApiResponse<ChildProfileResponse>> {
    this.error.set(null);
    this.loading.set(true);

    return this.http.get<ApiResponse<ChildProfileResponse>>(`${this.childBaseUrl}/profile`).pipe(
      tap((response) => {
        if (response.success && response.data) {
          this.currentChild.set(response.data);
          this.currentUser.set(null);
          this.setDisplayName(response.data.name);
        }
      }),
      finalize(() => this.loading.set(false)),
      catchError((error: HttpErrorResponse) => this.handleHttpError(error)),
    );
  }

  updateChildProfile(payload: UpdateChildProfileRequest): Observable<ApiResponse<ChildProfileResponse>> {
    this.error.set(null);
    this.loading.set(true);

    return this.http
      .put<ApiResponse<ChildProfileResponse>>(`${this.childBaseUrl}/profile`, payload)
      .pipe(
        tap((response) => {
          if (response.success && response.data) {
            this.currentChild.set(response.data);
            this.setDisplayName(response.data.name);
          }
        }),
        finalize(() => this.loading.set(false)),
        catchError((error: HttpErrorResponse) => this.handleHttpError(error)),
      );
  }

  logout(): void {
    localStorage.removeItem(AuthService.tokenStorageKey);
    localStorage.removeItem(AuthService.refreshTokenStorageKey);
    localStorage.removeItem(AuthService.displayNameStorageKey);
    this.currentUser.set(null);
    this.currentChild.set(null);
    this.displayName.set('');
    this.isAuthenticated.set(false);
  }

  getAccessToken(): string | null {
    return localStorage.getItem(AuthService.tokenStorageKey);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(AuthService.refreshTokenStorageKey);
  }

  getCurrentRole(): string | null {
    const token = this.getAccessToken();
    if (!token) {
      return null;
    }

    const payload = this.parseJwtPayload(token);
    const role =
      payload?.['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] ?? payload?.['role'];
    return typeof role === 'string' ? role : null;
  }

  private persistTokens(token: string, refreshToken: string): void {
    localStorage.setItem(AuthService.tokenStorageKey, token);
    localStorage.setItem(AuthService.refreshTokenStorageKey, refreshToken);
    this.hydrateDisplayNameFromToken(token);
    this.isAuthenticated.set(Boolean(token));
  }

  private setDisplayName(name: string): void {
    const value = name?.trim() ?? '';
    this.displayName.set(value);
    localStorage.setItem(AuthService.displayNameStorageKey, value);
  }

  private handleHttpError(error: HttpErrorResponse): Observable<never> {
    const fallbackMessage = 'Something went wrong. Please try again.';
    const apiError = error.error as Partial<ApiResponse<unknown>> | undefined;
    const message = apiError?.message ?? fallbackMessage;
    const firstError = apiError?.errors?.[0];

    this.error.set(firstError ?? message);
    return throwError(() => error);
  }

  private parseJwtPayload(token: string): Record<string, unknown> | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        return null;
      }

      const normalized = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
      const json = atob(padded);
      return JSON.parse(json) as Record<string, unknown>;
    } catch {
      return null;
    }
  }

  private hydrateDisplayNameFromToken(token: string): void {
    const payload = this.parseJwtPayload(token);
    if (!payload) {
      return;
    }

    const name =
      payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'] ?? payload['name'];
    if (typeof name === 'string' && name.trim()) {
      this.setDisplayName(name);
    }
  }
}
