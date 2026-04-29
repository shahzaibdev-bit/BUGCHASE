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
router.get('/program/:programId', reportController_1.getReportsByProgram);
router
    .route('/:id')
    .get(reportController_1.getReport);
router
    .route('/:id/comments')
    .post(upload.array('files', 5), reportController_1.addComment);
exports.default = router;
