"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const authController_1 = require("../controllers/authController");
const auth_1 = require("../middlewares/auth");
const validate_1 = require("../middlewares/validate");
const rateLimit_1 = require("../middlewares/rateLimit");
const zodAuth_1 = require("../schemas/zodAuth");
const router = express_1.default.Router();
// Rate Limit: 10 requests per 10 minutes for auth routes
const authLimiter = (0, rateLimit_1.rateLimiter)(10, 600, 'auth');
router.post('/signup', authLimiter, (0, validate_1.validate)(zodAuth_1.signupSchema), authController_1.signup);
router.post('/verify-email', authLimiter, (0, validate_1.validate)(zodAuth_1.verifySchema), authController_1.verifyEmail);
router.post('/login', authLimiter, (0, validate_1.validate)(zodAuth_1.loginSchema), authController_1.login);
router.get('/logout', authController_1.logout);
router.get('/me', auth_1.protect, authController_1.getMe);
router.patch('/update-me', auth_1.protect, authController_1.updateMe);
router.patch('/update-password', authLimiter, auth_1.protect, authController_1.updatePassword);
exports.default = router;
