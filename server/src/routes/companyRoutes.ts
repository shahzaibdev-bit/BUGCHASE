import express from 'express';
import { protect, restrictTo } from '../middlewares/auth';
import { inviteMember, getTeamMembers, generateVerificationToken, verifyDomain, getVerifiedAssets, updateAssetStatus, deleteVerifiedAsset, createProgram, getCompanyPrograms, getProgramById, deleteProgram, getReportDetails, getCompanyReports, updateReportSeverity, addCompanyComment, suggestBounty, updateReportStatus, awardBounty } from '../controllers/companyController';

const router = express.Router();

// Protect all routes
router.use(protect);
router.use(restrictTo('company'));

router.post('/invite', inviteMember);
router.get('/team', getTeamMembers);

router.post('/generate-token', generateVerificationToken);
router.post('/verify-domain', verifyDomain);
router.get('/assets', getVerifiedAssets);
router.patch('/assets/:id/status', updateAssetStatus);
router.delete('/assets/:id', deleteVerifiedAsset);

router.post('/programs', createProgram);
router.get('/programs', getCompanyPrograms);
router.get('/programs/:id', getProgramById);
router.delete('/programs/:id', deleteProgram);
router.get('/reports', getCompanyReports);
router.get('/reports/:id', getReportDetails);
router.patch('/reports/:id/severity', updateReportSeverity);
router.post('/reports/:id/comments', addCompanyComment);
router.patch('/reports/:id/status', updateReportStatus);
router.post('/reports/:id/bounty', awardBounty);
router.post('/reports/:id/suggest-bounty', suggestBounty);

export default router;
