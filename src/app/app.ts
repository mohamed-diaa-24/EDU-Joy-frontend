import { Component, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';

import { LanguageService } from './core/services/language.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, TranslatePipe],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  private readonly languageService = inject(LanguageService);
  protected readonly title = signal('edu-joy-frontend');

  constructor() {
    this.languageService.initializeLanguage();
  }

  switchLanguage(lang: 'en' | 'ar'): void {
    this.languageService.switchLanguage(lang);
  }
}
