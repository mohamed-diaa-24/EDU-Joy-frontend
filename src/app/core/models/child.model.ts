import { ApiResponse } from './auth-api.model';
import { CourseSummary } from './course.model';

export type ChildCoursesResponse = ApiResponse<CourseSummary[]>;

export interface ChildLessonDto {
  id: number;
  title: string;
  description: string;
  videoUrl: string;
  order: number;
}

export type ChildLessonsResponse = ApiResponse<ChildLessonDto[]>;
