import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { HttpErrorResponse } from '@angular/common/http';
import { EMPTY, forkJoin, map, switchMap, catchError, of } from 'rxjs';

import { ChildLessonDto, QuizQuestionDto } from '../../../core/models/child.model';
import { ChildService } from '../../../core/services/child.service';
import { NotificationService } from '../../../core/services/notification.service';

export interface ExtendedChildLessonDto extends ChildLessonDto {
  isLocked?: boolean;
  isCompleted?: boolean;
}

export interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
  correctAnswerIndex: number;
  selectedAnswerIndex: number | null;
}

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
  private readonly notificationService = inject(NotificationService);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly lessons = signal<ExtendedChildLessonDto[]>([]);
  readonly activeLesson = signal<ExtendedChildLessonDto | null>(null);
  readonly safeVideoUrl = signal<any>(null);
  readonly isYoutube = signal<boolean>(false);
  readonly isVideoLoading = signal<boolean>(false);
  
  readonly showQuiz = signal<boolean>(false);
  readonly quizQuestions = signal<QuizQuestion[]>([]);
  readonly quizSubmitted = signal<boolean>(false);
  readonly quizPassed = signal<boolean>(false);
  readonly quizScore = signal<number>(0);
  
  readonly submittingProgress = signal<boolean>(false);
  readonly progressSuccess = signal<boolean>(false);

  private player?: any;

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
          
          return forkJoin({
            lessonsRes: this.childService.getCourseLessons(id),
            progressRes: this.childService.getMyProgress(id).pipe(
              catchError(() => of({ success: true, data: [] }))
            )
          });
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: ({ lessonsRes, progressRes }) => {
          this.loading.set(false);
          if (!lessonsRes.success || !lessonsRes.data) {
            this.error.set(lessonsRes.errors?.[0] ?? lessonsRes.message);
            return;
          }

          const progressMap = new Map(progressRes.data?.map(p => [p.lessonId, p.completed]) || []);
          
          let previousCompleted = true;
          
          const mappedLessons: ExtendedChildLessonDto[] = [...lessonsRes.data]
            .sort((a, b) => a.order - b.order)
            .map((lesson) => {
              const completed = !!progressMap.get(lesson.id);
              const locked = !previousCompleted;
              previousCompleted = completed;
              
              return {
                ...lesson,
                isCompleted: completed,
                isLocked: locked
              };
            });
            
          this.lessons.set(mappedLessons);
          
          if (mappedLessons.length > 0) {
            const nextLessonToPlay = mappedLessons.find(l => !l.isCompleted && !l.isLocked) || mappedLessons[0];
            this.selectLesson(nextLessonToPlay);
          }
        },
        error: (err: HttpErrorResponse) => {
          this.loading.set(false);
          this.error.set(err.message);
        },
      });
  }

  ngOnDestroy(): void {
    this.destroyPlayer();
  }

  private destroyPlayer(): void {
    if (this.player) {
      this.player.destroy();
      this.player = undefined;
    }
  }

  selectLesson(lesson: ExtendedChildLessonDto): void {
    if (lesson.isLocked) {
      this.notificationService?.show(this.translate.instant('CHILD.LESSON_LOCKED') || 'You must complete the previous lesson first!', 'error');
      return;
    }
    
    this.activeLesson.set(lesson);
    this.isVideoLoading.set(true);
    
    this.showQuiz.set(false);
    this.quizSubmitted.set(false);
    this.quizPassed.set(false);
    this.quizScore.set(0);
    this.progressSuccess.set(lesson.isCompleted || false);
    this.submittingProgress.set(false);
    
    if (lesson.quizQuestions && lesson.quizQuestions.length > 0) {
      this.quizQuestions.set(this.mapBackendQuiz(lesson.quizQuestions));
    } else {
      this.quizQuestions.set([]);
      this.quizPassed.set(true);
    }

    
    const videoId = this.extractYoutubeId(lesson.videoUrl);
    if (videoId) {
      this.destroyPlayer();
      this.isYoutube.set(true);
      const embedUrl = `https://www.youtube.com/embed/${videoId}?rel=0&showinfo=0&modestbranding=1`;
      this.safeVideoUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(embedUrl));
      this.isVideoLoading.set(false);
    } else {
      this.destroyPlayer();
      this.isYoutube.set(false);
      // For <video src> elements we must use bypassSecurityTrustUrl, not bypassSecurityTrustResourceUrl
      this.safeVideoUrl.set(this.sanitizer.bypassSecurityTrustUrl(lesson.videoUrl));
      
      setTimeout(() => {
        // Dynamic import Plyr to avoid SSR/Angular compiler issues
        import('plyr').then((PlyrModule) => {
          const PlyrConstructor = (PlyrModule as any).default || PlyrModule;
          this.player = new PlyrConstructor('.kids-player', {
            controls: ['play-large', 'play', 'progress', 'current-time', 'mute', 'volume', 'fullscreen'],
          });
          
          this.player.source = {
            type: 'video',
            sources: [
              {
                src: lesson.videoUrl,
                type: 'video/mp4',
              }
            ]
          };

          const media = this.player.media;
          if (media && media.readyState >= 3) {
            this.isVideoLoading.set(false);
          }
          
          this.player.on('canplay', () => this.isVideoLoading.set(false));
          this.player.on('loadeddata', () => this.isVideoLoading.set(false));
          this.player.on('playing', () => this.isVideoLoading.set(false));
          this.player.on('error', () => {
             this.isVideoLoading.set(false);
             this.error.set(this.translate.instant('CHILD.VIDEO_ERROR') || 'Error loading video securely.');
          });
        });
      }, 50);
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


  private mapBackendQuiz(backendQs: QuizQuestionDto[]): QuizQuestion[] {
    return backendQs.map(q => ({
      id: q.id,
      question: q.questionText,
      options: [q.option1, q.option2, q.option3],
      correctAnswerIndex: q.correctOptionIndex,
      selectedAnswerIndex: null
    }));
  }


  startQuiz(): void {
    this.showQuiz.set(true);
    setTimeout(() => {
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    }, 100);
  }

  selectAnswer(qIndex: number, optIndex: number): void {
    if (this.quizPassed()) return;
    
    if (this.quizSubmitted()) {
      this.quizSubmitted.set(false);
    }
    
    this.quizQuestions.update(questions => {
      const updated = [...questions];
      updated[qIndex] = { ...updated[qIndex], selectedAnswerIndex: optIndex };
      return updated;
    });
  }

  submitQuiz(): void {
    const questions = this.quizQuestions();
    if (questions.some(q => q.selectedAnswerIndex === null)) {
      this.error.set(this.translate.instant('CHILD.ANSWER_ALL_QUESTIONS') || 'الرجاء الإجابة على جميع الأسئلة');
      setTimeout(() => this.error.set(null), 3000);
      return;
    }

    const correctCount = questions.filter(q => q.selectedAnswerIndex === q.correctAnswerIndex).length;
    this.quizScore.set(correctCount);
    this.quizSubmitted.set(true);
    
    if (correctCount === questions.length) {
      this.quizPassed.set(true);
      
      setTimeout(() => {
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
      }, 300);
    } else {
      const msg = this.translate.currentLang === 'ar' 
        ? 'بعض الإجابات غير صحيحة، حاول مرة أخرى!' 
        : 'Some answers are incorrect, try again!';
      this.error.set(msg);
      setTimeout(() => this.error.set(null), 3500);
    }
  }

  completeLesson(): void {
    const lesson = this.activeLesson();
    if (!lesson) return;

    this.submittingProgress.set(true);
    this.childService.completeLesson({
      lessonId: lesson.id,
      score: this.quizScore() * 50,
      timeSpent: 300,
      attempts: 1
    }).subscribe({
      next: (res) => {
        this.submittingProgress.set(false);
        if (res.success) {
          this.progressSuccess.set(true);
          
          this.lessons.update(current => {
            const index = current.findIndex(l => l.id === lesson.id);
            if (index > -1) {
              const list = [...current];
              list[index] = { ...list[index], isCompleted: true };
              
              if (index + 1 < list.length) {
                list[index + 1] = { ...list[index + 1], isLocked: false };
              }
              return list;
            }
            return current;
          });
        } else {
          this.error.set(res.errors?.[0] || 'Error saving progress');
          setTimeout(() => this.error.set(null), 3000);
        }
      },
      error: (err: HttpErrorResponse) => {
        this.submittingProgress.set(false);
        this.error.set('Failed to save progress. Please try again.');
        setTimeout(() => this.error.set(null), 3000);
      }
    });
  }
}
