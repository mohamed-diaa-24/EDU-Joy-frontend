import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { HttpErrorResponse } from '@angular/common/http';
import { forkJoin } from 'rxjs';

import { ParentService } from '../../../core/services/parent.service';
import { ChildDto, ParentCourseDto, ChildProgressResponseDto, AddChildResponse, ChildProgressResponse } from '../../../core/models/parent.model';
import { NotificationService } from '../../../core/services/notification.service';

@Component({
  selector: 'app-parent-dashboard',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslateModule],
  templateUrl: './parent-dashboard.component.html',
})
export class ParentDashboardComponent implements OnInit {
  private readonly parentService = inject(ParentService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly notificationService = inject(NotificationService);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  readonly children = signal<ChildDto[]>([]);
  readonly courses = signal<ParentCourseDto[]>([]);

  // Add child modal state
  readonly isAddChildModalOpen = signal(false);
  readonly addingChild = signal(false);
  readonly addChildError = signal<string | null>(null);
  
  readonly addChildForm = this.formBuilder.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(100)]]
  });

  // Progress modal state
  readonly isProgressModalOpen = signal(false);
  readonly loadingProgress = signal(false);
  readonly progressError = signal<string | null>(null);
  readonly selectedProgress = signal<ChildProgressResponseDto | null>(null);

  ngOnInit(): void {
    this.loadDashboardData();
  }

  loadDashboardData(): void {
    this.loading.set(true);
    this.error.set(null);

    forkJoin({
      children: this.parentService.getChildren(),
      courses: this.parentService.getMyCourses()
    })
    .pipe(takeUntilDestroyed(this.destroyRef))
    .subscribe({
      next: (results) => {
        this.loading.set(false);
        if (!results.children.success) {
          this.error.set(results.children.errors?.[0] ?? results.children.message);
          return;
        }
        if (!results.courses.success) {
          this.error.set(results.courses.errors?.[0] ?? results.courses.message);
          return;
        }
        
        this.children.set(results.children.data ?? []);
        this.courses.set(results.courses.data ?? []);
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        this.error.set(err.message);
      }
    });
  }

  // --- Add Child Methods ---
  openAddChildModal(): void {
    this.addChildForm.reset();
    this.addChildError.set(null);
    this.isAddChildModalOpen.set(true);
  }

  closeAddChildModal(): void {
    this.isAddChildModalOpen.set(false);
  }

  onAddChildSubmit(): void {
    if (this.addChildForm.invalid) {
      this.addChildForm.markAllAsTouched();
      return;
    }

    this.addingChild.set(true);
    this.addChildError.set(null);

    this.parentService.addChild({ name: this.addChildForm.controls.name.value.trim() })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response: AddChildResponse) => {
          this.addingChild.set(false);
          if (!response.success || !response.data) {
            this.addChildError.set(response.errors?.[0] ?? response.message);
            return;
          }
          this.notificationService.show('NOTIFICATIONS.CHILD_ADDED', 'success');
          this.closeAddChildModal();
          this.loadDashboardData(); // Refresh list to show new child
        },
        error: (err: HttpErrorResponse) => {
          this.addingChild.set(false);
          const api = err.error as any;
          this.addChildError.set(api?.errors?.[0] ?? api?.message ?? err.message);
        }
      });
  }

  // --- Progress Methods ---
  viewProgress(childId: number): void {
    this.isProgressModalOpen.set(true);
    this.loadingProgress.set(true);
    this.progressError.set(null);
    this.selectedProgress.set(null);

    this.parentService.getChildProgress(childId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response: ChildProgressResponse) => {
          this.loadingProgress.set(false);
          if (!response.success || !response.data) {
            this.progressError.set(response.errors?.[0] ?? response.message);
            return;
          }
          this.selectedProgress.set(response.data);
        },
        error: (err: HttpErrorResponse) => {
          this.loadingProgress.set(false);
          const api = err.error as any;
          this.progressError.set(api?.errors?.[0] ?? api?.message ?? err.message);
        }
      });
  }

  closeProgressModal(): void {
    this.isProgressModalOpen.set(false);
  }

  copyToClipboard(text: string | null | undefined): void {
    if (text) {
      navigator.clipboard.writeText(text);
      this.notificationService.show('NOTIFICATIONS.COPIED', 'info');
    }
  }
}
