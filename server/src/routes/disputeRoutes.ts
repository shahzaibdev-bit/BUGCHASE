import express from 'express';
import { protect, restrictTo } from '../middlewares/authMiddleware';
import {
  listDisputes,
  getDisputeStats,
  getMyDisputeStats,
  getDispute,
  getLinkedReportForSupport,
  listMyDisputes,
  getMyDispute,
  replyToMyDispute,
  addDisputeMessage,
  updateDispute,
  createDispute,
  getActiveDisputeForReport,
} from '../controllers/disputeController';
import {
  getTriagerCandidatesForDispute,
  sendTriagerReassignmentInvite,
} from '../controllers/triagerInviteController';

const router = express.Router();

// All dispute routes require a valid session.
router.use(protect);

// Any authenticated platform user can raise a dispute and manage their own tickets.
router.post('/', createDispute);
router.get('/mine', listMyDisputes);
router.get('/mine/active-for-report/:reportRef', getActiveDisputeForReport);
router.get('/mine/:id', getMyDispute);
router.post('/mine/:id/messages', replyToMyDispute);

// Everything else is support-staff (and admin) only.
router.use(restrictTo('support', 'admin'));

router.get('/', listDisputes);
router.get('/stats', getDisputeStats);
router.get('/stats/me', getMyDisputeStats);
router.get('/reports/:reportId', getLinkedReportForSupport);
router.get('/:id/triager-candidates', getTriagerCandidatesForDispute);
router.post('/:id/triager-invites', sendTriagerReassignmentInvite);
router.get('/:id', getDispute);
router.post('/:id/messages', addDisputeMessage);
router.patch('/:id', updateDispute);

export default router;
