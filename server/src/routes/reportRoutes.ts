import express from 'express';
import multer from 'multer';
import { protect } from '../middlewares/auth';
import { createReport, getMyReports, getReport, addComment, getReportsByProgram } from '../controllers/reportController';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Protect all routes
router.use(protect);

router
  .route('/')
  .post(upload.array('files', 5), createReport)
  .get(getMyReports);

router.get('/program/:programId', getReportsByProgram);

router
  .route('/:id')
  .get(getReport);

router
  .route('/:id/comments')
  .post(upload.array('files', 5), addComment);

export default router;
