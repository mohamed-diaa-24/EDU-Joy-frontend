import { DOCUMENT } from '@angular/common';
import { Injectable, inject, signal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

type AppLanguage = 'en' | 'ar';

@Injectable({ providedIn: 'root' })
export class LanguageService {
  private readonly storageKey = 'app.language';
  private readonly document = inject(DOCUMENT);
  private readonly translateService = inject(TranslateService);

  readonly currentLanguage = signal<AppLanguage>('en');

  initializeLanguage(): void {
    this.translateService.addLangs(['en', 'ar']);
    this.translateService.setDefaultLang('en');

    const stored = localStorage.getItem(this.storageKey);
    const initialLanguage: AppLanguage = stored === 'ar' ? 'ar' : 'en';
    this.switchLanguage(initialLanguage);
  }

  switchLanguage(lang: string): void {
    const nextLanguage: AppLanguage = lang === 'ar' ? 'ar' : 'en';
    this.currentLanguage.set(nextLanguage);
    this.translateService.use(nextLanguage);

    const dir = nextLanguage === 'ar' ? 'rtl' : 'ltr';
    this.document.documentElement.lang = nextLanguage;
    this.document.documentElement.dir = dir;

    localStorage.setItem(this.storageKey, nextLanguage);
  }
}
