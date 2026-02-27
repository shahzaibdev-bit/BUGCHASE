import express from 'express';
import { protect, restrictTo } from '../middlewares/authMiddleware';
import {
    getDashboardStats,
    getTriagerProfile,
    updateTriagerPreferences,
    getMyQueue,
    getAssignedReports,
    getGlobalPool,
    claimReport,
    updateReportSeverity,
    submitDecision,
    getReportDetails,
    postComment,
    updateReportStatus,
    updateReportValidation,
    reopenReport,
    generateSummary
} from '../controllers/triagerController';
import multer from 'multer';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Apply protection and role restriction to all routes
router.use(protect);
router.use(restrictTo('triager', 'admin'));

router.get('/profile', getTriagerProfile);
router.patch('/preferences', updateTriagerPreferences);
router.get('/stats', getDashboardStats);
router.get('/queue', getMyQueue);
router.get('/assigned', getAssignedReports);
router.get('/pool', getGlobalPool);
router.get('/reports/:id', getReportDetails); // Details
router.post('/reports/:id/chat', upload.array('files', 5), postComment); // Chat
router.post('/claim/:id', claimReport);
router.patch('/reports/:id/severity', updateReportSeverity);
router.patch('/reports/:id/status', updateReportStatus);
router.patch('/reports/:id/validation', updateReportValidation);
router.post('/reports/:id/decision', submitDecision);
router.post('/reports/:id/reopen', reopenReport);
router.post('/reports/:id/generate-summary', generateSummary);

export default router;