import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import User from '../models/User';
import AppError from '../utils/AppError';
import catchAsync from '../utils/catchAsync';
import redisClient from '../config/redis';
import { sendEmail, otpTemplate } from '../services/emailService';
import { signToken, signTwoFactorLoginPendingToken, verifyTwoFactorLoginPendingToken } from '../services/tokenService';
import { generateSecret, verifySync } from 'otplib';
import QRCode from 'qrcode';
import LoginEvent from '../models/LoginEvent';
import { recordSuccessfulLoginAndNotify, pruneLoginEvents } from '../services/loginAuditService';
import { getClientIp } from '../utils/requestMeta';
import { rateLimiter, resetRateLimit } from '../middlewares/rateLimit';
import { getProfileCompletionReputationScore } from '../utils/profileCompletionReputation';

/** Cookie + JWT + profile payload + login audit (new IP / browser email). */
async function issueSessionAndRespond(req: Request, res: Response, user: any) {
  const token = signToken(user._id.toString());

  res.cookie('jwt', token, {
    expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  });

  const userObj = user.toObject ? user.toObject() : { ...user };
  delete userObj.password;
  delete (userObj as any).twoFactorSecret;
  (userObj as any).profileCompletionScore = getProfileCompletionReputationScore(userObj);

  await resetRateLimit(req, 'auth');

  const ip = getClientIp(req);
  const rawUa = req.get('user-agent') || '';
  void recordSuccessfulLoginAndNotify({
    userId: user._id,
    email: user.email,
    name: user.name,
    ip,
    rawUa,
  }).then(() => pruneLoginEvents(user._id).catch(() => {}));

  res.status(200).json({
    status: 'success',
    token,
    user: userObj,
  });
}

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
    // bio will default to "This researcher prefers..."
    bioUpdated: false
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
  await resetRateLimit(req, 'auth');

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

  await issueSessionAndRespond(req, res, user);
});

export const login = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { email, password, totp } = req.body;

  console.log('Login attempt:', email, password ? '***' : 'MISSING');
  if (!email || !password) {
    return next(new AppError('Please provide email and password', 400));
  }

  const user = await User.findOne({
    $or: [{ email: email }, { username: email }],
  }).select('+password +twoFactorSecret');

  if (!user || !(await user.correctPassword(password, user.password as string))) {
    return next(new AppError('Incorrect email or password', 401));
  }

  if (!user.isEmailVerified) {
    return next(new AppError('Please verify your email first', 401));
  }

  if (user.twoFactorEnabled) {
    const code = totp != null && String(totp).trim() !== '' ? String(totp).replace(/\s/g, '') : '';
    if (!code) {
      const twoFactorToken = signTwoFactorLoginPendingToken(user._id.toString());
      return res.status(200).json({
        status: 'success',
        requiresTwoFactor: true,
        twoFactorToken,
      });
    }
    if (!user.twoFactorSecret) {
      return next(new AppError('Two-factor authentication is misconfigured. Contact support.', 500));
    }
    const check = verifySync({ secret: user.twoFactorSecret, token: code });
    if (!check.valid) {
      return next(new AppError('Invalid two-factor code', 401));
    }
  }

  await issueSessionAndRespond(req, res, user);
});

export const completeLoginWithTwoFactor = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { twoFactorToken, totp } = req.body;
  if (!twoFactorToken || totp == null || String(totp).trim() === '') {
    return next(new AppError('Missing two-factor authentication fields', 400));
  }
  let userId: string;
  try {
    userId = verifyTwoFactorLoginPendingToken(String(twoFactorToken)).id;
  } catch {
    return next(new AppError('Session expired. Please log in again with your password.', 401));
  }

  const user = await User.findById(userId).select('+twoFactorSecret');
  if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
    return next(new AppError('Invalid session', 401));
  }

  const code = String(totp).replace(/\s/g, '');
  const check = verifySync({ secret: user.twoFactorSecret, token: code });
  if (!check.valid) {
    return next(new AppError('Invalid two-factor code', 401));
  }

  await issueSessionAndRespond(req, res, user);
});

export const setupTwoFactor = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const userId = (req.user as any)._id.toString();
  const secret = generateSecret();
  await redisClient.set(`2fa_setup:${userId}`, secret, 'EX', 600);

  const issuer = encodeURIComponent('BugChase');
  const label = encodeURIComponent(String((req.user as any).email || (req.user as any).username || 'account'));
  const otpauth = `otpauth://totp/${issuer}:${label}?secret=${secret}&issuer=${issuer}`;
  const qrDataUrl = await QRCode.toDataURL(otpauth);

  res.status(200).json({
    status: 'success',
    data: { secret, qrDataUrl },
  });
});

export const enableTwoFactor = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { totp } = req.body;
  const userId = (req.user as any)._id.toString();
  const secret = await redisClient.get(`2fa_setup:${userId}`);
  if (!secret) {
    return next(new AppError('Setup expired or not started. Open “Set up 2FA” again.', 400));
  }
  const code = String(totp || '').replace(/\s/g, '');
  const check = verifySync({ secret, token: code });
  if (!check.valid) {
    return next(new AppError('Invalid authenticator code', 400));
  }

  await User.findByIdAndUpdate(userId, { twoFactorEnabled: true, twoFactorSecret: secret });
  await redisClient.del(`2fa_setup:${userId}`);

  const updated = await User.findById(userId);
  const userObj = updated!.toObject();
  delete (userObj as any).password;
  (userObj as any).profileCompletionScore = getProfileCompletionReputationScore(userObj);

  res.status(200).json({ status: 'success', user: userObj });
});

export const disableTwoFactor = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { password, totp } = req.body;
  if (!password || totp == null || String(totp).trim() === '') {
    return next(new AppError('Password and authenticator code are required', 400));
  }

  const user = await User.findById((req.user as any)._id).select('+password +twoFactorSecret');
  if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
    return next(new AppError('Two-factor authentication is not enabled', 400));
  }

  if (!(await user.correctPassword(password, user.password as string))) {
    return next(new AppError('Incorrect password', 401));
  }

  const check = verifySync({ secret: user.twoFactorSecret, token: String(totp).replace(/\s/g, '') });
  if (!check.valid) {
    return next(new AppError('Invalid authenticator code', 401));
  }

  user.twoFactorEnabled = false;
  user.set('twoFactorSecret', undefined);
  await user.save({ validateBeforeSave: false });

  const userObj = user.toObject();
  delete userObj.password;
  delete (userObj as any).twoFactorSecret;
  (userObj as any).profileCompletionScore = getProfileCompletionReputationScore(userObj);

  res.status(200).json({ status: 'success', user: userObj });
});

export const getLoginHistory = catchAsync(async (req: Request, res: Response) => {
  const items = await LoginEvent.find({
    userId: (req.user as any)._id,
    success: true,
  })
    .sort({ createdAt: -1 })
    .limit(50)
    .select('ip browserSummary userAgent createdAt')
    .lean();

  const mapped = items.map((row: any, idx: number) => ({
    id: String(row._id),
    ip: row.ip || '—',
    browserSummary: row.browserSummary || 'Unknown',
    createdAt: row.createdAt,
    isCurrent: idx === 0,
  }));

  res.status(200).json({ status: 'success', data: { items: mapped } });
});

export const logout = (req: Request, res: Response) => {
  res.cookie('jwt', 'loggedout', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
  });
  res.status(200).json({ status: 'success' });
};

import Report from '../models/Report';

export const getMe = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  // User is already attached to req by protect middleware
  const userObj = (req.user as any).toObject ? (req.user as any).toObject() : req.user;

  (userObj as any).profileCompletionScore = getProfileCompletionReputationScore(userObj);

  // Inject Reports Count
  const reportsCount = await Report.countDocuments({ researcherId: (req.user as any)._id });
  (userObj as any).reportsCount = reportsCount;

  res.status(200).json({
    status: 'success',
    user: userObj,
  });
});

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

  // Check if bio is being updated
  if (filteredBody.bio) {
      filteredBody.bioUpdated = true;
  }

  // 3) Update user document
  const updatedUser = await User.findByIdAndUpdate(req.user!.id, filteredBody, {
    new: true,
    runValidators: true,
  });

  const userObj = updatedUser!.toObject();
  (userObj as any).profileCompletionScore = getProfileCompletionReputationScore(userObj);

  res.status(200).json({
    status: 'success',
    user: userObj,
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
  await resetRateLimit(req, 'auth');

  res.status(200).json({
    status: 'success',
    token, // Send token to client just in case they need it immediately
    message: 'Password updated successfully!',
  });
});

