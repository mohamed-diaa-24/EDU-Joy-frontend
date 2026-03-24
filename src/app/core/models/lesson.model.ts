import { ApiResponse } from './auth-api.model';

export interface QuizQuestionDto {
  id?: number;
  questionText: string;
  option1: string;
  option2: string;
  option3: string;
  correctOptionIndex: number;
}

export interface LessonCreateRequest {
  title: string;
  description: string;
  videoUrl: string;
  cloudinaryPublicId?: string;
  order: number;
  courseId: number;
  quizQuestions?: QuizQuestionDto[];
}

export type LessonUpdateRequest = LessonCreateRequest;

export interface LessonDetails {
  id: number;
  title: string;
  description: string;
  videoUrl: string;
  cloudinaryPublicId?: string;
  order: number;
  courseId: number;
  createdAt: string;
  quizQuestions?: QuizQuestionDto[];
}

export type LessonDetailsResponse = ApiResponse<LessonDetails>;
export type LessonCreateResponse = ApiResponse<number>;
export type LessonUpdateResponse = ApiResponse<unknown>;
export type LessonDeleteResponse = ApiResponse<unknown>;
