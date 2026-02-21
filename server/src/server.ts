import express from 'express';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import mongoSanitize from 'express-mongo-sanitize';
import connectDB from './config/db';
import globalErrorHandler from './middlewares/error';
import AppError from './utils/AppError';
import authRoutes from './routes/authRoutes';
import userRoutes from './routes/userRoutes';
import reportRoutes from './routes/reportRoutes';
import companyRoutes from './routes/companyRoutes';
import adminRoutes from './routes/adminRoutes';
import triagerRoutes from './routes/triagerRoutes';
import programRoutes from './routes/programRoutes';
import { rateLimiter } from './middlewares/rateLimit';

// Load env vars
dotenv.config(); // Reload env

// Connect to Database
connectDB();

const app = express();

// Trust Proxy for Vercel
app.set('trust proxy', 1);

// Set security HTTP headers
app.use(helmet());

// Cross-Origin Resource Sharing
app.use(cors({
  origin: process.env.CLIENT_URL,
  credentials: true,
}));

// Body parser, reading data from body into req.body
app.use(express.json({ limit: '10kb' }));
app.use(cookieParser());

// Rate Limiting (Global API) - 100 requests per 15 minutes
const apiLimiter = rateLimiter(100, 15 * 60);
app.use('/api', apiLimiter);

// Health Check Root Route
app.get('/', (req, res) => {
  res.status(200).json({ status: 'success', message: 'BugChase API is running', env: process.env.NODE_ENV });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/company', companyRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/triager', triagerRoutes);
app.use('/api/programs', programRoutes);

// Handle Unhandled Routes
app.all(/(.*)/, (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

// Global Error Handler
app.use(globalErrorHandler);

const PORT = process.env.PORT || 5000;

// Export app for Vercel Serverless
export default app;

// Only listen if not running in Vercel (Vercel handles binding automatically)
if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
  const server = app.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
  });

  // Initialize WebSockets
  import('./services/socketService').then(({ initSocket }) => {
      initSocket(server);
  });

  // Handle Unhandled Rejections
  process.on('unhandledRejection', (err: any) => {
    console.log('UNHANDLED REJECTION! 💥');
    console.log(err.name, err.message);
    server.close(() => {
      process.exit(1);
    });
  });
}

