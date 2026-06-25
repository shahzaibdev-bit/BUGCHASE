import express from 'express';
import { runPrivateInviteCron } from '../controllers/privateProgramInviteController';

const router = express.Router();

router.get('/private-invite-scaling', runPrivateInviteCron);
router.post('/private-invite-scaling', runPrivateInviteCron);

export default router;
