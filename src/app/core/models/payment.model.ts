import { ApiResponse } from './auth-api.model';

export interface CreatePaymentRequestDto {
  courseId: number;
}

export interface CreatePaymentResponseDto {
  paymentId: number;
  paymentUrl: string;
}

export interface ConfirmPaymentRequestDto {
  paymentId: number;
  childId: number;
}

export type CreatePaymentResponse = ApiResponse<CreatePaymentResponseDto>;
export type ConfirmPaymentResponse = ApiResponse<unknown>;
