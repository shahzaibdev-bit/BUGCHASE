"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const authMiddleware_1 = require("../middlewares/authMiddleware");
const adminController_1 = require("../controllers/adminController");
const router = express_1.default.Router();
// Protect all routes
router.use(authMiddleware_1.protect);
router.use((0, authMiddleware_1.restrictTo)('admin'));
router.post('/announcements/broadcast', adminController_1.broadcastAnnouncement);
router.get('/dashboard/analytics', adminController_1.getDashboardAnalytics);
router.get('/finance/analytics', adminController_1.getFinanceAnalytics);
router.get('/users', adminController_1.getAllUsers);
router.get('/users/check-username', adminController_1.checkUsernameAvailability);
router.get('/users/:id', adminController_1.getUserDetails);
router.patch('/users/:id', adminController_1.updateUserDetails);
router.delete('/users/:id', adminController_1.deleteUserByAdmin);
router.patch('/users/:id/status', adminController_1.updateUserStatus);
router.post('/users/:id/email', adminController_1.sendUserEmailByAdmin);
router.patch('/users/:id/points', adminController_1.adjustUserPoints);
router.patch('/users/:id/wallet-hold', adminController_1.setWalletHold);
router.post('/triagers', adminController_1.createTriager);
router.get('/triagers', adminController_1.getTriagers);
// Programs
router.get('/programs', adminController_1.getAllPrograms);
router.get('/programs/:id', adminController_1.getProgramDetails);
router.patch('/programs/:id/status', adminController_1.updateProgramStatus);
router.patch('/programs/:id', adminController_1.updateProgramByAdmin);
router.get('/reports/:id', adminController_1.getReportDetailsForAdmin);
router.patch('/reports/:id', adminController_1.updateReportByAdmin);
router.patch('/reports/:id/status', adminController_1.updateReportStatusByAdmin);
router.patch('/reports/:id/severity', adminController_1.updateReportSeverityByAdmin);
router.post('/reports/:id/comments', adminController_1.addAdminComment);
exports.default = router;
