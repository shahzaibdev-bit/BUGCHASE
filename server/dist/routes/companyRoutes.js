"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middlewares/auth");
const companyController_1 = require("../controllers/companyController");
const router = express_1.default.Router();
// Protect all routes
router.use(auth_1.protect);
router.use((0, auth_1.restrictTo)('company'));
router.post('/invite', companyController_1.inviteMember);
router.get('/team', companyController_1.getTeamMembers);
router.post('/generate-token', companyController_1.generateVerificationToken);
router.post('/verify-domain', companyController_1.verifyDomain);
router.get('/assets', companyController_1.getVerifiedAssets);
router.patch('/assets/:id/status', companyController_1.updateAssetStatus);
router.delete('/assets/:id', companyController_1.deleteVerifiedAsset);
router.post('/programs', companyController_1.createProgram);
router.get('/programs', companyController_1.getCompanyPrograms);
router.get('/programs/:id', companyController_1.getProgramById);
router.delete('/programs/:id', companyController_1.deleteProgram);
router.get('/reports', companyController_1.getCompanyReports);
router.get('/reports/:id', companyController_1.getReportDetails);
router.patch('/reports/:id/severity', companyController_1.updateReportSeverity);
router.post('/reports/:id/comments', companyController_1.addCompanyComment);
exports.default = router;
