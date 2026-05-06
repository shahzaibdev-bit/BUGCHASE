import { z } from 'zod';

export const signupSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Name is required'),
    email: z.string().email('Invalid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    role: z.enum(['researcher', 'company', 'triager']).optional(),
  }),
});

export const verifySchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address'),
    otp: z.string().length(6, 'OTP must be 6 digits'),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    /** Email or username (same as login handler). */
    email: z.string().min(1, 'Email or username is required'),
    password: z.string().min(1, 'Password is required'),
    totp: z.string().optional(),
  }),
});
