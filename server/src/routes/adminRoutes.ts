import express from 'express';
import { protect, restrictTo } from '../middlewares/authMiddleware';
import {
  broadcastAnnouncement,
  getAllUsers,
  deleteUserByAdmin,
  updateUserStatus,
  createTriager,
  getTriagers,
  getAllPrograms,
  updateProgramStatus,
  getProgramDetails,
  updateProgramByAdmin,
  getDashboardAnalytics,
  getFinanceAnalytics,
  sendUserEmailByAdmin,
  getUserDetails,
  updateUserDetails,
  adjustUserPoints,
  setWalletHold,
  getReportDetailsForAdmin,
  updateReportByAdmin,
  addAdminComment,
  checkUsernameAvailability,
  updateReportStatusByAdmin,
  updateReportSeverityByAdmin
} from '../controllers/adminController';

const router = express.Router();

// Protect all routes
router.use(protect);
router.use(restrictTo('admin'));

router.post('/announcements/broadcast', broadcastAnnouncement);
router.get('/dashboard/analytics', getDashboardAnalytics);
router.get('/finance/analytics', getFinanceAnalytics);
router.get('/users', getAllUsers);
router.get('/users/check-username', checkUsernameAvailability);
router.get('/users/:id', getUserDetails);
router.patch('/users/:id', updateUserDetails);
router.delete('/users/:id', deleteUserByAdmin);
router.patch('/users/:id/status', updateUserStatus);
router.post('/users/:id/email', sendUserEmailByAdmin);
router.patch('/users/:id/points', adjustUserPoints);
router.patch('/users/:id/wallet-hold', setWalletHold);

router.post('/triagers', createTriager);
router.get('/triagers', getTriagers);

// Programs
router.get('/programs', getAllPrograms);
router.get('/programs/:id', getProgramDetails);
router.patch('/programs/:id/status', updateProgramStatus);
router.patch('/programs/:id', updateProgramByAdmin);
router.get('/reports/:id', getReportDetailsForAdmin);
router.patch('/reports/:id', updateReportByAdmin);
router.patch('/reports/:id/status', updateReportStatusByAdmin);
router.patch('/reports/:id/severity', updateReportSeverityByAdmin);
router.post('/reports/:id/comments', addAdminComment);

export default router;
