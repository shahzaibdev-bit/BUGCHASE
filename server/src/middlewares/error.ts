import { Request, Response, NextFunction } from 'express';
import AppError from '../utils/AppError';

const globalErrorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  console.error('ERROR 💥', err); // Keep console log for server terminal

  // Force expose error details for debugging purposes
  res.status(err.statusCode).json({
    status: err.status,
    message: err.message,
    stack: err.stack
  });
};

export default globalErrorHandler;
