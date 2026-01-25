import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import User from '../models/User';
import AppError from '../utils/AppError';
import catchAsync from '../utils/catchAsync';
import redisClient from '../config/redis';
import { sendEmail, otpTemplate } from '../services/emailService';
import { signToken, signRefreshToken } from '../services/tokenService';
import { rateLimiter, resetRateLimit } from '../middlewares/rateLimit';

export const signup = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { name, email, password, role } = req.body;

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return next(new AppError('Email already in use', 400));
  }

  const username = email.split('@')[0];

  // Create User but NOT verified
  await User.create({
    name,
    email,
    username,
    password,
    role: role || 'researcher',
    isVerified: false,
    isEmailVerified: false,
  });

  // Generate 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  // Store in Redis with 10 min expiry
  await redisClient.set(`otp:${email}`, otp, 'EX', 600);

  // Send Email
  try {
    await sendEmail(email, 'Verify your BugChase Account', otpTemplate(otp));
  } catch (error) {
    console.error('Email Send Error:', error);
    // If email fails, we should probably rollback user creation or just let them retry
    return next(new AppError('There was an error sending the email. Try again later!', 500));
  }

  // Reset Rate Limit on Successful Signup Attempt
  await resetRateLimit(req);

  res.status(201).json({
    status: 'success',
    message: 'OTP sent to email',
  });
});

export const verifyEmail = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { email, otp } = req.body;

  const storedOtp = await redisClient.get(`otp:${email}`);

  if (!storedOtp || storedOtp !== otp) {
    return next(new AppError('Invalid or expired OTP', 400));
  }

  const user = await User.findOne({ email });
  if (!user) {
    return next(new AppError('User not found', 404));
  }

  user.isEmailVerified = true;
  await user.save({ validateBeforeSave: false });

  // Clear OTP
  await redisClient.del(`otp:${email}`);

  // Generate Token (Single Session Token)
  const token = signToken(user._id.toString());

  // Set Token Cookie
  res.cookie('jwt', token, {
    expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days (match with JWT_EXPIRES_IN if possible, covering simplified case)
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  });

  // Remove password from output
  const userObj = user.toObject();
  delete (userObj as any).password;

  // Reset Rate Limit on Success
  await resetRateLimit(req);

  res.status(200).json({
    status: 'success',
    token,
    user: userObj,
  });
});

export const login = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { email, password } = req.body;

  // Check if email & password exist
  console.log("Login attempt:", email, password ? "***" : "MISSING");
  if (!email || !password) {
    return next(new AppError('Please provide email and password', 400));
  }

  // Check if user exists && password is correct
  // Allow login with email or username
  const user = await User.findOne({ 
      $or: [{ email: email }, { username: email }] 
  }).select('+password');

  if (!user || !(await user.correctPassword(password, user.password as string))) {
    return next(new AppError('Incorrect email or password', 401));
  }

  if (!user.isEmailVerified) {
    return next(new AppError('Please verify your email first', 401));
  }

  // Generate Token
  const token = signToken(user._id.toString());

  // Set Token Cookie
  res.cookie('jwt', token, {
    expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  });

  const userObj = user.toObject();
  delete userObj.password;

  // Reset Rate Limit on Success
  await resetRateLimit(req);

  res.status(200).json({
    status: 'success',
    token,
    user: userObj,
  });
});

export const logout = (req: Request, res: Response) => {
  res.cookie('jwt', 'loggedout', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });
  res.status(200).json({ status: 'success' });
};

export const getMe = (req: Request, res: Response, next: NextFunction) => {
  // User is already attached to req by protect middleware
  res.status(200).json({
    status: 'success',
    user: req.user,
  });
};

const filterObj = (obj: any, ...allowedFields: string[]) => {
  const newObj: any = {};
  Object.keys(obj).forEach((el) => {
    if (allowedFields.includes(el)) newObj[el] = obj[el];
  });
  return newObj;
};

export const updateMe = async (req: Request, res: Response, next: NextFunction) => {
  // 1) Create error if user POSTs password data
  if (req.body.password || req.body.passwordConfirm) {
    return next(new AppError('This route is not for password updates. Please use /updateMyPassword.', 400));
  }

  // Check for Username Uniqueness (if username is being updated)
  if (req.body.username) {
      const existingUser = await User.findOne({ 
          username: { $regex: new RegExp(`^${req.body.username}$`, 'i') },
          _id: { $ne: req.user!.id } // Exclude current user
      });

      if (existingUser) {
          return next(new AppError('Nickname already taken. Please choose another one.', 400));
      }
  }

  // 2) Filtered out unwanted fields names that are not allowed to be updated
  const filteredBody = filterObj(req.body, 'name', 'username', 'email', 'country', 'bio', 'linkedAccounts', 'skills', 'hireable', 'showPayouts', 'isPrivate', 'notifications');

  // 3) Update user document
  const updatedUser = await User.findByIdAndUpdate(req.user!.id, filteredBody, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({
    status: 'success',
    user: updatedUser,
  });
};

export const updatePassword = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { currentPassword, newPassword } = req.body;

  // 1) Check if current and new passwords are provided
  if (!currentPassword || !newPassword) {
    return next(new AppError('Please provide both your current and new password.', 400));
  }

  // 2) Get user from Collection (getUser middleware only gives us user without password)
  const user = await User.findById(req.user!.id).select('+password');

  if (!user) {
    return next(new AppError('User not found.', 404));
  }

  // 3) Check if current password is correct
  if (!(await user.correctPassword(currentPassword, user.password as string))) {
    return next(new AppError('Your current password is wrong.', 401));
  }

  // 4) Update Password
  user.password = newPassword;
  await user.save();

  // 5) Log user in again using new Token
  const token = signToken(user._id.toString());

  // Set Token Cookie
  res.cookie('jwt', token, {
    expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  });

  // Reset Rate Limit (Optional, but good since they successfully authenticated again)
  await resetRateLimit(req);

  res.status(200).json({
    status: 'success',
    token, // Send token to client just in case they need it immediately
    message: 'Password updated successfully!',
  });
});
