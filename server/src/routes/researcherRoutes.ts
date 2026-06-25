import express from 'express';
import { protect, restrictTo } from '../middlewares/auth';
import {
  listMyPrivateProgramInvites,
  acceptPrivateProgramInvite,
  declinePrivateProgramInvite,
} from '../controllers/privateProgramInviteController';

const router = express.Router();

router.use(protect);
router.use(restrictTo('researcher'));

router.get('/private-invites', listMyPrivateProgramInvites);
router.post('/private-invites/:token/accept', acceptPrivateProgramInvite);
router.post('/private-invites/:token/decline', declinePrivateProgramInvite);

export default router;
