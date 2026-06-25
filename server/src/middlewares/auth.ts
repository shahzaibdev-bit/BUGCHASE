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
  let bearerToken: string | undefined;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    bearerToken = req.headers.authorization.split(' ')[1];
    if (bearerToken === 'null' || bearerToken === 'undefined') bearerToken = undefined;
  }

  const cookieToken =
    req.cookies?.jwt && req.cookies.jwt !== 'loggedout' ? req.cookies.jwt : undefined;

  const tokenCandidates = [...new Set([bearerToken, cookieToken].filter(Boolean))] as string[];

  if (!tokenCandidates.length) {
    return next(new AppError('You are not logged in! Please log in to get access.', 401));
  }

  for (const token of tokenCandidates) {
    try {
      const decoded = await (promisify(jwt.verify) as any)(
        token,
        process.env.JWT_SECRET as string,
      ) as DecodedToken;
      const currentUser = await User.findById(decoded.id);
      if (currentUser) {
        req.user = currentUser;
        return next();
      }
    } catch {
      // Try the next token source (e.g. cookie when Bearer is stale).
    }
  }

  return next(new AppError('Invalid token. Please log in again.', 401));
});

/** Sets req.user when a valid JWT is present; continues anonymously otherwise. */
export const optionalProtect = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  let bearerToken: string | undefined;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    bearerToken = req.headers.authorization.split(' ')[1];
    if (bearerToken === 'null' || bearerToken === 'undefined') bearerToken = undefined;
  }

  const cookieToken =
    req.cookies?.jwt && req.cookies.jwt !== 'loggedout' ? req.cookies.jwt : undefined;

  const tokenCandidates = [...new Set([bearerToken, cookieToken].filter(Boolean))] as string[];

  for (const token of tokenCandidates) {
    try {
      const decoded = await (promisify(jwt.verify) as any)(
        token,
        process.env.JWT_SECRET as string,
      ) as DecodedToken;
      const currentUser = await User.findById(decoded.id);
      if (currentUser) {
        req.user = currentUser;
        break;
      }
    } catch {
      // Invalid or expired token — try the next source.
    }
  }

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
