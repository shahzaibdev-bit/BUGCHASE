"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const multer_1 = __importDefault(require("multer"));
const authMiddleware_1 = require("../middlewares/authMiddleware");
const userController_1 = require("../controllers/userController");
const rateLimit_1 = require("../middlewares/rateLimit");
const router = express_1.default.Router();
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: {
        fileSize: 2 * 1024 * 1024, // 2MB limit
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/png' || file.mimetype === 'image/jpg') {
            cb(null, true);
        }
        else {
            cb(new Error('Not an image! Please upload only images.'));
        }
    }
});
// Allow public access mostly, but rate limit it to prevent scraping abuse
// 20 requests per minute per IP
const publicProfileLimiter = (0, rateLimit_1.rateLimiter)(20, 60);
const uploadLimiter = (0, rateLimit_1.rateLimiter)(5, 60); // 5 uploads per minute
router.get('/p/:username', publicProfileLimiter, userController_1.getPublicProfile);
// Protected Routes
router.patch('/verify-kyc-status', authMiddleware_1.protect, userController_1.updateKYCStatus);
router.patch('/updateMe', authMiddleware_1.protect, userController_1.updateMe);
router.post('/upload-avatar', authMiddleware_1.protect, uploadLimiter, upload.single('avatar'), userController_1.uploadAvatar);
exports.default = router;
