"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middlewares/auth");
const reportController_1 = require("../controllers/reportController");
const router = express_1.default.Router();
// Protect all routes
router.use(auth_1.protect);
router
    .route('/')
    .post(reportController_1.createReport)
    .get(reportController_1.getMyReports);
router.get('/program/:programId', reportController_1.getReportsByProgram);
router
    .route('/:id')
    .get(reportController_1.getReport);
router
    .route('/:id/comments')
    .post(reportController_1.addComment);
exports.default = router;
