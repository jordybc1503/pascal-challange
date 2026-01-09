import { Response } from 'express';

interface SuccessResponse<T = any> {
  status: 'success';
  data: T;
}

interface ErrorResponse {
  status: 'error';
  error: {
    message: string;
    code?: string;
    details?: any;
  };
}

export const sendSuccess = <T = any>(res: Response, data: T, statusCode = 200): Response => {
  const response: SuccessResponse<T> = {
    status: 'success',
    data,
  };
  return res.status(statusCode).json(response);
};

export const sendError = (
  res: Response,
  message: string,
  statusCode = 500,
  code?: string,
  details?: any
): Response => {
  const response: ErrorResponse = {
    status: 'error',
    error: {
      message,
      ...(code && { code }),
      ...(details && { details }),
    },
  };
  return res.status(statusCode).json(response);
};
