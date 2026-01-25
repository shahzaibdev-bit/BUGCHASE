import express from 'express';
import { protect, restrictTo } from '../middlewares/authMiddleware';
import { broadcastAnnouncement, getAllUsers, updateUserStatus, createTriager, getTriagers, getAllPrograms, updateProgramStatus } from '../controllers/adminController';

const router = express.Router();

// Protect all routes
router.use(protect);
router.use(restrictTo('admin'));

router.post('/announcements/broadcast', broadcastAnnouncement);
router.get('/users', getAllUsers);
router.patch('/users/:id/status', updateUserStatus);

router.post('/triagers', createTriager);
router.get('/triagers', getTriagers);

// Programs
router.get('/programs', getAllPrograms);
router.patch('/programs/:id/status', updateProgramStatus);

export default router;
