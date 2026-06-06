import express from 'express';
import { protect, restrictTo } from '../middlewares/authMiddleware';
import {
  listDisputes,
  getDisputeStats,
  getDispute,
  addDisputeMessage,
  updateDispute,
  createDispute,
} from '../controllers/disputeController';

const router = express.Router();

// All dispute routes require a valid session.
router.use(protect);

// Any authenticated platform user (company / researcher) can raise a dispute.
router.post('/', createDispute);

// Everything else is support-staff (and admin) only.
router.use(restrictTo('support', 'admin'));

router.get('/', listDisputes);
router.get('/stats', getDisputeStats);
router.get('/:id', getDispute);
router.post('/:id/messages', addDisputeMessage);
router.patch('/:id', updateDispute);

export default router;
