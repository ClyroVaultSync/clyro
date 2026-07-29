export interface SuccessResponse<T> {
  success: true;
  data: T;
}

export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

export function successResponse<T>(data: T): SuccessResponse<T> {
  return { success: true, data };
}

export function errorResponse(code: string, message: string, details?: Record<string, unknown>): ErrorResponse {
  const error: ErrorResponse['error'] = { code, message };
  if (details !== undefined) {
    error.details = details;
  }
  return { success: false, error };
}
