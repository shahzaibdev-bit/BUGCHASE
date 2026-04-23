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
router.get('/users', adminController_1.getAllUsers);
router.patch('/users/:id/status', adminController_1.updateUserStatus);
router.post('/triagers', adminController_1.createTriager);
router.get('/triagers', adminController_1.getTriagers);
// Programs
router.get('/programs', adminController_1.getAllPrograms);
router.patch('/programs/:id/status', adminController_1.updateProgramStatus);
exports.default = router;
