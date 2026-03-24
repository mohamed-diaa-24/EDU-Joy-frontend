import { ApiResponse } from './auth-api.model';
import { CourseSummary } from './course.model';

export type ChildCoursesResponse = ApiResponse<CourseSummary[]>;

export interface QuizQuestionDto {
  id: number;
  questionText: string;
  option1: string;
  option2: string;
  option3: string;
  correctOptionIndex: number;
}

export interface ChildLessonDto {
  id: number;
  title: string;
  description: string;
  videoUrl: string;
  order: number;
  quizQuestions?: QuizQuestionDto[];
}

export type ChildLessonsResponse = ApiResponse<ChildLessonDto[]>;

export interface CompleteLessonDto {
  lessonId: number;
  score: number;
  timeSpent: number;
  attempts: number;
}

export interface ProgressResponseDto {
  lessonId: number;
  completed: boolean;
  score: number;
  timeSpent: number;
  attempts: number;
}

export type ProgressResponse = ApiResponse<ProgressResponseDto>;
