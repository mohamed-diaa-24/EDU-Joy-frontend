import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { teacherGuard } from './core/guards/teacher.guard';
import { childGuard } from './core/guards/child.guard';
import { parentGuard } from './core/guards/parent.guard';

export const appRoutes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'home' },
  {
    path: 'auth/login',
    loadComponent: () =>
      import('./features/auth/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'auth/register',
    loadComponent: () =>
      import('./features/auth/register/register.component').then((m) => m.RegisterComponent),
  },
  {
    path: 'auth/child-login',
    loadComponent: () =>
      import('./features/auth/child-login/child-login.component').then((m) => m.ChildLoginComponent),
  },
  {
    path: 'home',
    loadComponent: () =>
      import('./features/home/home.component').then((m) => m.HomeComponent),
  },
  {
    path: 'parent-dashboard',
    canActivate: [authGuard, parentGuard],
    loadComponent: () =>
      import('./features/parent/parent-dashboard/parent-dashboard.component').then((m) => m.ParentDashboardComponent),
  },
  {
    path: 'my-courses',
    canActivate: [authGuard, childGuard],
    loadComponent: () =>
      import('./features/child/my-courses/my-courses.component').then((m) => m.ChildMyCoursesComponent),
  },
  {
    path: 'my-courses/:courseId/lessons',
    canActivate: [authGuard, childGuard],
    loadComponent: () =>
      import('./features/child/child-lessons/child-lessons.component').then((m) => m.ChildLessonsComponent),
  },
  {
    path: 'profile',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/profile/profile.component').then((m) => m.ProfileComponent),
  },
  {
    path: 'courses/new',
    canActivate: [authGuard, teacherGuard],
    loadComponent: () =>
      import('./features/courses/course-create/course-create.component').then(
        (m) => m.CourseCreateComponent,
      ),
  },
  {
    path: 'courses/:id/edit',
    canActivate: [authGuard, teacherGuard],
    loadComponent: () =>
      import('./features/courses/course-edit/course-edit.component').then((m) => m.CourseEditComponent),
  },
  {
    path: 'courses/:id/lessons/new',
    canActivate: [authGuard, teacherGuard],
    loadComponent: () =>
      import('./features/courses/lesson-create/lesson-create.component').then((m) => m.LessonCreateComponent),
  },
  {
    path: 'courses/:id/lessons/:lessonId/edit',
    canActivate: [authGuard, teacherGuard],
    loadComponent: () =>
      import('./features/courses/lesson-edit/lesson-edit.component').then((m) => m.LessonEditComponent),
  },
  {
    path: 'courses/:id',
    loadComponent: () =>
      import('./features/courses/course-detail/course-detail.component').then(
        (m) => m.CourseDetailComponent,
      ),
  },
  {
    path: 'courses',
    loadComponent: () =>
      import('./features/courses/course-list/course-list.component').then(
        (m) => m.CourseListComponent,
      ),
  },
  { path: '**', redirectTo: 'home' },
];
