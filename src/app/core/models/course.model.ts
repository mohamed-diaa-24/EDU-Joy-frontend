import { ApiResponse } from './auth-api.model';

export interface CourseSummary {
  id: number;
  title: string;
  description: string;
  price: number;
  teacherId: string;
  /** Cover image URL (https), optional. */
  imageUrl?: string | null;
}

export interface LessonSummary {
  id: number;
  title: string;
  videoUrl: string;
  order: number;
}

export interface CourseDetails extends CourseSummary {
  lessons: LessonSummary[];
}

export interface PaginatedCourses {
  items: CourseSummary[];
  pageNumber: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface CourseSearchParams {
  searchTerm?: string;
  minPrice?: number;
  maxPrice?: number;
  sortBy?: 'title' | 'price' | 'createdAt';
  sortDirection?: 'asc' | 'desc';
  pageNumber?: number;
  pageSize?: number;
}

export interface CreateCourseRequest {
  title: string;
  description: string;
  price: number;
  imageFile?: File | null;
}

export type UpdateCourseRequest = CreateCourseRequest;

export type CourseSearchResponse = ApiResponse<PaginatedCourses>;
export type CourseDetailsResponse = ApiResponse<CourseDetails>;
export type CreateCourseResponse = ApiResponse<number>;
export type UpdateCourseResponse = ApiResponse<unknown>;
export type DeleteCourseResponse = ApiResponse<unknown>;
