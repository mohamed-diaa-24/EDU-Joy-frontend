import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { HttpErrorResponse } from '@angular/common/http';

import { CourseSummary } from '../../../core/models/course.model';
import { ChildService } from '../../../core/services/child.service';

@Component({
  selector: 'app-child-my-courses',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslateModule],
  templateUrl: './my-courses.component.html',
})
export class ChildMyCoursesComponent {
  private readonly childService = inject(ChildService);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly courses = signal<CourseSummary[]>([]);

  constructor() {
    this.childService
      .getMyCourses()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.loading.set(false);
          if (!response.success || !response.data) {
            this.error.set(response.errors?.[0] ?? response.message);
            return;
          }
          this.courses.set(response.data);
        },
        error: (err: HttpErrorResponse) => {
          this.loading.set(false);
          this.error.set(err.message);
        },
      });
  }
}
