import express from 'express';
import { protect, restrictTo } from '../middlewares/auth';
import { inviteMember, getTeamMembers, generateVerificationToken, verifyDomain, getVerifiedAssets, updateAssetStatus, deleteVerifiedAsset, updateAssetScope, createProgram, getCompanyPrograms, getProgramById, deleteProgram, getReportDetails, getCompanyReports, updateReportSeverity, addCompanyComment, suggestBounty, updateReportStatus, awardBounty, generateReportMessage, createTopUpIntent, confirmTopUp, getWalletTransactions, createSetupIntent, getPaymentMethods, detachPaymentMethod, getCompanyAnalytics, requestPaymentMethodOtp, verifyPaymentMethodOtp } from '../controllers/companyController';
import multer from 'multer';

const upload = multer({ storage: multer.memoryStorage() });

const router = express.Router();

// Protect all routes
router.use(protect);
router.use(restrictTo('company'));

router.get('/analytics', getCompanyAnalytics);

router.post('/invite', inviteMember);
router.get('/team', getTeamMembers);

router.post('/generate-token', generateVerificationToken);
router.post('/verify-domain', verifyDomain);
router.get('/assets', getVerifiedAssets);
router.patch('/assets/:id/status', updateAssetStatus);
router.delete('/assets/:id', deleteVerifiedAsset);
router.patch('/assets/:id/scope', updateAssetScope);

router.post('/programs', createProgram);
router.get('/programs', getCompanyPrograms);
router.get('/programs/:id', getProgramById);
router.delete('/programs/:id', deleteProgram);
router.get('/reports', getCompanyReports);
router.get('/reports/:id', getReportDetails);
router.patch('/reports/:id/severity', updateReportSeverity);
router.post('/reports/:id/comments', upload.array('files', 5), addCompanyComment);
router.patch('/reports/:id/status', updateReportStatus);
router.post('/reports/:id/bounty', awardBounty);
router.post('/reports/:id/suggest-bounty', suggestBounty);
router.post('/reports/:id/generate-message', generateReportMessage);

// Wallet & Top-ups
router.post('/wallet/topup/intent', createTopUpIntent);
router.post('/wallet/topup/confirm', confirmTopUp);
router.get('/wallet/transactions', getWalletTransactions);
router.post('/wallet/setup-intent', createSetupIntent);
router.get('/wallet/payment-methods', getPaymentMethods);
router.post('/wallet/payment-methods/otp', requestPaymentMethodOtp);
router.post('/wallet/payment-methods/verify-otp', verifyPaymentMethodOtp);
router.delete('/wallet/payment-methods/:paymentMethodId', detachPaymentMethod);

export default router;
