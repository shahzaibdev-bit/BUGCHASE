import express from 'express';
import { signup, verifyEmail, login, logout, getMe, updateMe, updatePassword } from '../controllers/authController';
import { protect } from '../middlewares/auth';
import { validate } from '../middlewares/validate';
import { rateLimiter } from '../middlewares/rateLimit';
import { signupSchema, verifySchema, loginSchema } from '../schemas/zodAuth';

const router = express.Router();

// Rate Limit: 10 requests per 10 minutes for auth routes
const authLimiter = rateLimiter(10, 600, 'auth');

router.post('/signup', authLimiter, validate(signupSchema), signup);
router.post('/verify-email', authLimiter, validate(verifySchema), verifyEmail);
router.post('/login', authLimiter, validate(loginSchema), login);
router.get('/logout', logout);
router.get('/me', protect, getMe);
router.patch('/update-me', protect, updateMe);
router.patch('/update-password', authLimiter, protect, updatePassword);

export default router;
