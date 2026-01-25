import express from 'express';
import { protect } from '../middlewares/auth';
import { createReport, getMyReports, getReport, addComment, getReportsByProgram } from '../controllers/reportController';

const router = express.Router();

// Protect all routes
router.use(protect);

router
  .route('/')
  .post(createReport)
  .get(getMyReports);

router.get('/program/:programId', getReportsByProgram);

router
  .route('/:id')
  .get(getReport);

router
  .route('/:id/comments')
  .post(addComment);

export default router;
