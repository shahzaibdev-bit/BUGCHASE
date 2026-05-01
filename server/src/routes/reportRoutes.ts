import express from 'express';
import multer from 'multer';
import { protect } from '../middlewares/auth';
import {
  createReport,
  getMyReports,
  getReport,
  addComment,
  getReportsByProgram,
  checkReportDuplicates,
  markReportAsDuplicate,
  clearDuplicateReview,
  reindexAllReports,
} from '../controllers/reportController';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Protect all routes
router.use(protect);

router
  .route('/')
  .post(upload.array('files', 5), createReport)
  .get(getMyReports);

router.post('/submit', upload.array('files', 5), createReport);
router.post('/check-duplicates/:id', checkReportDuplicates);
router.post('/reindex-all', reindexAllReports);

router.get('/program/:programId', getReportsByProgram);

router
  .route('/:id')
  .get(getReport);

router.patch('/:id/mark-duplicate', markReportAsDuplicate);
router.patch('/:id/duplicate-review/clear', clearDuplicateReview);

router
  .route('/:id/comments')
  .post(upload.array('files', 5), addComment);

export default router;
