import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';

import { ApiResponse, ChildProfileResponse, UserProfileResponse } from '../../core/models/auth-api.model';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslateModule],
  templateUrl: './profile.component.html',
})
export class ProfileComponent {
  private readonly formBuilder = inject(FormBuilder);
  readonly authService = inject(AuthService);

  readonly loadingProfile = signal(false);
  readonly submitError = signal<string | null>(null);
  readonly submitSuccess = signal<string | null>(null);
  readonly childProfile = signal<{ id: number; name: string; parentId: string } | null>(null);
  readonly isChild = computed(() => this.authService.getCurrentRole()?.toLowerCase() === 'child');

  readonly profileForm = this.formBuilder.nonNullable.group({
    fullName: ['', [Validators.required, Validators.maxLength(200)]],
  });

  constructor() {
    this.loadProfile();
  }

  loadProfile(): void {
    this.loadingProfile.set(true);
    this.submitError.set(null);

    if (this.isChild()) {
      this.authService
        .getChildProfile()
        .pipe(takeUntilDestroyed())
        .subscribe({
          next: (response: ApiResponse<ChildProfileResponse>) => {
            if (!response.success || !response.data) {
              this.submitError.set(response.errors[0] ?? response.message);
              this.loadingProfile.set(false);
              return;
            }

            this.childProfile.set(response.data);
            this.profileForm.patchValue({ fullName: response.data.name });
            this.loadingProfile.set(false);
          },
          error: () => {
            this.submitError.set(this.authService.error());
            this.loadingProfile.set(false);
          },
        });
      return;
    }

    this.authService
      .getProfile()
      .pipe(takeUntilDestroyed())
      .subscribe({
        next: (response: ApiResponse<UserProfileResponse>) => {
          if (!response.success || !response.data) {
            this.submitError.set(response.errors[0] ?? response.message);
            this.loadingProfile.set(false);
            return;
          }

          this.profileForm.patchValue({ fullName: response.data.fullName });
          this.loadingProfile.set(false);
        },
        error: () => {
          this.submitError.set(this.authService.error());
          this.loadingProfile.set(false);
        },
      });
  }

  onSubmit(): void {
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      return;
    }

    this.submitError.set(null);
    this.submitSuccess.set(null);

    const payloadValue = this.profileForm.controls.fullName.value.trim();

    if (this.isChild()) {
      this.authService
        .updateChildProfile({ name: payloadValue })
        .pipe(takeUntilDestroyed())
        .subscribe({
          next: (response: ApiResponse<ChildProfileResponse>) => {
            if (!response.success) {
              this.submitError.set(response.errors[0] ?? response.message);
              return;
            }

            this.submitSuccess.set(response.message);
            if (response.data) {
              this.childProfile.set(response.data);
            }
          },
          error: () => {
            this.submitError.set(this.authService.error());
          },
        });
      return;
    }

    this.authService
      .updateProfile({ fullName: payloadValue })
      .pipe(takeUntilDestroyed())
      .subscribe({
        next: (response: ApiResponse<UserProfileResponse>) => {
          if (!response.success) {
            this.submitError.set(response.errors[0] ?? response.message);
            return;
          }

          this.submitSuccess.set(response.message);
        },
        error: () => {
          this.submitError.set(this.authService.error());
        },
      });
  }
}
