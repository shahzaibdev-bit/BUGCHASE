import express from 'express';
import multer from 'multer';
import { protect } from '../middlewares/authMiddleware';
import { 
    getPublicProfile, 
    updateKYCStatus, 
    updateMe, 
    uploadAvatar, 
    getMe, 
    getWalletData,
    setupPayoutMethod,
    getPayoutMethods,
    requestPayout,
    requestPayoutMethodOtp,
    verifyPayoutMethodOtp,
    removePayoutMethod
} from '../controllers/userController';
import { rateLimiter } from '../middlewares/rateLimit';

const router = express.Router();
const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 2 * 1024 * 1024, // 2MB limit
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/png' || file.mimetype === 'image/jpg') {
            cb(null, true);
        } else {
            cb(new Error('Not an image! Please upload only images.'));
        }
    }
});

// Allow public access mostly, but rate limit it to prevent scraping abuse
// 20 requests per minute per IP
const publicProfileLimiter = rateLimiter(20, 60, 'profile');
const uploadLimiter = rateLimiter(5, 60, 'upload'); // 5 uploads per minute

router.get('/p/:username', publicProfileLimiter, getPublicProfile);

// Protected Routes
router.patch('/verify-kyc-status', protect, updateKYCStatus);
router.patch('/updateMe', protect, updateMe);
router.post('/upload-avatar', protect, uploadLimiter, upload.single('avatar'), uploadAvatar);
router.get('/me', protect, getMe);
router.get('/wallet', protect, getWalletData);

// Payout Routes
router.post('/payout-setup', protect, setupPayoutMethod);
router.get('/payout-methods', protect, getPayoutMethods);
router.post('/withdraw', protect, requestPayout);
router.post('/payout-methods/otp', protect, requestPayoutMethodOtp);
router.post('/payout-methods/verify-otp', protect, verifyPayoutMethodOtp);
router.delete('/payout-methods/:id', protect, removePayoutMethod);

export default router;
