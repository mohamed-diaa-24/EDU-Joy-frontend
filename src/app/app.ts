import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';

import { AuthService } from './core/services/auth.service';
import { LanguageService } from './core/services/language.service';
import { NotificationService } from './core/services/notification.service';

@Component({
  selector: 'app-root',
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, TranslatePipe],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  private readonly languageService = inject(LanguageService);
  private readonly router = inject(Router);
  readonly authService = inject(AuthService);
  readonly notificationService = inject(NotificationService);
  protected readonly title = signal('edu-joy-frontend');
  readonly currentLanguage = this.languageService.currentLanguage;
  readonly isAuthenticated = this.authService.isAuthenticated;

  constructor() {
    this.languageService.initializeLanguage();

    this.initializeSessionProfile();
  }

  switchLanguage(lang: 'en' | 'ar'): void {
    this.languageService.switchLanguage(lang);
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/auth/login']);
  }

  private initializeSessionProfile(): void {
    if (!this.authService.getAccessToken()) {
      return;
    }

    const role = this.authService.getCurrentRole()?.toLowerCase();
    if (role === 'child') {
      this.authService.getChildProfile().subscribe({
        error: () => {
          this.authService.logout();
        },
      });
      return;
    }

    this.authService.getProfile().subscribe({
      error: () => {
        this.authService.logout();
      },
    });
  }
}
