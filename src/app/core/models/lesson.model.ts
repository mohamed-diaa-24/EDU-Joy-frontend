import { ApiResponse } from './auth-api.model';

export interface LessonCreateRequest {
  title: string;
  description: string;
  videoUrl: string;
  order: number;
  courseId: number;
}

export type LessonUpdateRequest = LessonCreateRequest;

export interface LessonDetails {
  id: number;
  title: string;
  description: string;
  videoUrl: string;
  order: number;
  courseId: number;
  createdAt: string;
}

export type LessonDetailsResponse = ApiResponse<LessonDetails>;
export type LessonCreateResponse = ApiResponse<number>;
export type LessonUpdateResponse = ApiResponse<unknown>;
export type LessonDeleteResponse = ApiResponse<unknown>;
