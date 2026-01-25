import express from 'express';
import { protect, restrictTo } from '../middlewares/authMiddleware';
import {
    getDashboardStats,
    getMyQueue,
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
    reopenReport
} from '../controllers/triagerController';

const router = express.Router();

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
router.post('/reports/:id/chat', postComment); // Chat
router.post('/claim/:id', claimReport);
router.patch('/reports/:id/severity', updateReportSeverity);
router.patch('/reports/:id/status', updateReportStatus);
router.patch('/reports/:id/validation', updateReportValidation);
router.post('/reports/:id/decision', submitDecision);
router.post('/reports/:id/reopen', reopenReport);

export default router;
