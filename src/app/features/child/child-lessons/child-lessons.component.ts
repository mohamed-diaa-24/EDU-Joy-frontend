import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { HttpErrorResponse } from '@angular/common/http';
import { EMPTY, map, switchMap } from 'rxjs';

import { ChildLessonDto } from '../../../core/models/child.model';
import { ChildService } from '../../../core/services/child.service';

@Component({
  selector: 'app-child-lessons',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslateModule],
  templateUrl: './child-lessons.component.html',
})
export class ChildLessonsComponent {
  private readonly childService = inject(ChildService);
  private readonly route = inject(ActivatedRoute);
  private readonly translate = inject(TranslateService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly sanitizer = inject(DomSanitizer);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly lessons = signal<ChildLessonDto[]>([]);
  readonly activeLesson = signal<ChildLessonDto | null>(null);
  readonly safeVideoUrl = signal<SafeResourceUrl | null>(null);
  readonly isYoutube = signal<boolean>(false);

  constructor() {
    this.route.paramMap
      .pipe(
        map((params) => {
          const id = params.get('courseId');
          return id ? Number.parseInt(id, 10) : NaN;
        }),
        switchMap((id) => {
          if (Number.isNaN(id) || id <= 0) {
            this.error.set(this.translate.instant('COURSES.INVALID_ID'));
            this.loading.set(false);
            return EMPTY;
          }
          this.loading.set(true);
          this.error.set(null);
          return this.childService.getCourseLessons(id);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (response) => {
          this.loading.set(false);
          if (!response.success || !response.data) {
            this.error.set(response.errors?.[0] ?? response.message);
            return;
          }
          this.lessons.set(response.data);
          if (response.data.length > 0) {
            this.selectLesson(response.data[0]);
          }
        },
        error: (err: HttpErrorResponse) => {
          this.loading.set(false);
          this.error.set(err.message);
        },
      });
  }

  selectLesson(lesson: ChildLessonDto): void {
    this.activeLesson.set(lesson);
    const videoId = this.extractYoutubeId(lesson.videoUrl);
    if (videoId) {
      this.isYoutube.set(true);
      const embedUrl = `https://www.youtube.com/embed/${videoId}?rel=0&showinfo=0&modestbranding=1`;
      this.safeVideoUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(embedUrl));
    } else {
      this.isYoutube.set(false);
      this.safeVideoUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(lesson.videoUrl));
    }
  }

  private extractYoutubeId(url: string): string | null {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);

    if (match && match[2].length === 11) {
      return match[2];
    }
    return null;
  }
}
