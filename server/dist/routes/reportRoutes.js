"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const multer_1 = __importDefault(require("multer"));
const auth_1 = require("../middlewares/auth");
const reportController_1 = require("../controllers/reportController");
const router = express_1.default.Router();
const upload = (0, multer_1.default)({ storage: multer_1.default.memoryStorage() });
// Protect all routes
router.use(auth_1.protect);
router
    .route('/')
    .post(upload.array('files', 5), reportController_1.createReport)
    .get(reportController_1.getMyReports);
router.post('/submit', upload.array('files', 5), reportController_1.createReport);
router.post('/check-duplicates/:id', reportController_1.checkReportDuplicates);
router.post('/reindex-all', reportController_1.reindexAllReports);
router.get('/program/:programId', reportController_1.getReportsByProgram);
router
    .route('/:id')
    .get(reportController_1.getReport);
router.patch('/:id/mark-duplicate', reportController_1.markReportAsDuplicate);
router.patch('/:id/duplicate-review/clear', reportController_1.clearDuplicateReview);
router
    .route('/:id/comments')
    .post(upload.array('files', 5), reportController_1.addComment);
exports.default = router;
