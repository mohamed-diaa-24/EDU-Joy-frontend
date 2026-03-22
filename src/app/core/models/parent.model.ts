import { ApiResponse } from './auth-api.model';

export interface ChildDto {
  id: number;
  name: string;
  loginCode?: string | null;
}

export interface AddChildRequestDto {
  name: string;
}

export interface AddChildResponseDto {
  childId: number;
  name: string;
  loginCode: string;
}

export interface ChildProgressResponseDto {
  childId: number;
  childName: string;
  completedLessons: number;
  totalLessons: number;
  progressPercentage: number;
  recentActivities: string[];
}

export interface ParentCourseDto {
  courseId: number;
  title: string;
  price: number;
  childId: number;
  childName: string;
}

export type GetChildrenResponse = ApiResponse<ChildDto[]>;
export type AddChildResponse = ApiResponse<AddChildResponseDto>;
export type ChildProgressResponse = ApiResponse<ChildProgressResponseDto>;
export type ParentCoursesResponse = ApiResponse<ParentCourseDto[]>;
