"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const authMiddleware_1 = require("../middlewares/authMiddleware");
const triagerController_1 = require("../controllers/triagerController");
const multer_1 = __importDefault(require("multer"));
const router = express_1.default.Router();
const upload = (0, multer_1.default)({ storage: multer_1.default.memoryStorage() });
// Apply protection and role restriction to all routes
router.use(authMiddleware_1.protect);
router.use((0, authMiddleware_1.restrictTo)('triager', 'admin'));
router.get('/profile', triagerController_1.getTriagerProfile);
router.patch('/preferences', triagerController_1.updateTriagerPreferences);
router.get('/stats', triagerController_1.getDashboardStats);
router.get('/queue', triagerController_1.getMyQueue);
router.get('/assigned', triagerController_1.getAssignedReports);
router.get('/pool', triagerController_1.getGlobalPool);
router.get('/reports/:id', triagerController_1.getReportDetails); // Details
router.post('/reports/:id/chat', upload.array('files', 5), triagerController_1.postComment); // Chat
router.post('/claim/:id', triagerController_1.claimReport);
router.patch('/reports/:id/severity', triagerController_1.updateReportSeverity);
router.patch('/reports/:id/status', triagerController_1.updateReportStatus);
router.patch('/reports/:id/validation', triagerController_1.updateReportValidation);
router.post('/reports/:id/decision', triagerController_1.submitDecision);
router.post('/reports/:id/reopen', triagerController_1.reopenReport);
router.post('/reports/:id/generate-summary', triagerController_1.generateSummary);
exports.default = router;
