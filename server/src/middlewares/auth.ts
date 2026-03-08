import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { promisify } from 'util';
import User from '../models/User';
import AppError from '../utils/AppError';
import catchAsync from '../utils/catchAsync';

interface DecodedToken {
  id: string;
  iat: number;
  exp: number;
}

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

export const protect = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
    if (token === 'null' || token === 'undefined') token = undefined;
  }
  
  if (!token && req.cookies && req.cookies.jwt) {
    token = req.cookies.jwt;
  }

  if (!token) {
    return next(new AppError('You are not logged in! Please log in to get access.', 401));
  }

  // Verify token
  let decoded: DecodedToken;
  try {
    // @ts-ignore - promisify types are tricky with jwt.verify
    decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET as string) as DecodedToken;
  } catch (err) {
    return next(new AppError('Invalid token. Please log in again.', 401));
  }

  // Check if user still exists
  const currentUser = await User.findById(decoded.id);
  if (!currentUser) {
    return next(new AppError('The user belonging to this token does no longer exist.', 401));
  }

  // Grant Access
  req.user = currentUser;
  next();
});

export const restrictTo = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // role is in req.user from protect middleware
    if (!roles.includes(req.user.role)) {
      return next(new AppError('You do not have permission to perform this action', 403));
    }
    next();
  };
};
