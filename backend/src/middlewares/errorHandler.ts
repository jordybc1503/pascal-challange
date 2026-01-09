import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors.js';
import { sendError } from '../utils/response.js';
import { logger } from '../utils/logger.js';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): Response => {
  if (res.headersSent) {
    return next(err) as any;
  }

  logger.error({
    err,
    method: req.method,
    url: req.url,
    body: req.body,
  }, 'Error occurred');

  // Operational errors
  if (err instanceof AppError) {
    return sendError(res, err.message, err.statusCode);
  }

  // Zod validation errors
  if (err instanceof ZodError) {
    const errorMessages = err.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
    return sendError(res, errorMessages, 400, 'VALIDATION_ERROR');
  }

  // Prisma errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      return sendError(res, 'Unique constraint violation', 409, 'CONFLICT');
    }
    if (err.code === 'P2025') {
      return sendError(res, 'Record not found', 404, 'NOT_FOUND');
    }
    return sendError(res, 'Database error', 500, err.code);
  }

  // Default error
  return sendError(
    res,
    process.env.NODE_ENV === 'production' ? 'Internal Server Error' : err.message,
    500,
    'INTERNAL_ERROR'
  );
};
