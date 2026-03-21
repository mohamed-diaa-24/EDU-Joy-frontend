import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';

@Component({
  selector: 'app-child-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslateModule, RouterLink],
  templateUrl: './child-login.component.html',
})
export class ChildLoginComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);
  private readonly notificationService = inject(NotificationService);
  readonly authService = inject(AuthService);

  readonly submitError = signal<string | null>(null);
  readonly showCode = signal(false);

  readonly childLoginForm = this.formBuilder.nonNullable.group({
    code: ['', [Validators.required, Validators.minLength(4)]],
  });

  onSubmit(): void {
    if (this.childLoginForm.invalid) {
      this.childLoginForm.markAllAsTouched();
      return;
    }

    // Ensure any previous session is cleared before child login.
    this.authService.logout();
    this.submitError.set(null);

    this.authService
      .childLogin({ code: this.childLoginForm.controls.code.value.trim() })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          if (!response.success) {
            this.submitError.set(response.errors[0] ?? response.message);
            return;
          }

          this.notificationService.show('NOTIFICATIONS.LOGIN_SUCCESS', 'success');
          this.router.navigate(['/home']);
        },
        error: () => {
          this.submitError.set(this.authService.error());
        },
      });
  }

  toggleCodeVisibility(): void {
    this.showCode.update((value) => !value);
  }
}
