import { ApiResponse } from './auth-api.model';

export interface EnrollRequestDto {
  childId: number;
  courseId: number;
}

export interface EnrollResponseDto {
  enrollmentId: number;
  childId: number;
  courseId: number;
  enrolledAt: string;
}

export type EnrollResponse = ApiResponse<EnrollResponseDto>;
