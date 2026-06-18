import express from 'express';
import { verifyCertificate } from '../controllers/publicController';
import { getTriagerReassignmentInviteByToken } from '../controllers/triagerInviteController';
import { rateLimiter } from '../middlewares/rateLimit';

const router = express.Router();

/** Certificate verification — keep tight to deter abuse. */
const verifyCertLimiter = rateLimiter(10, 15 * 60, 'public-verify');

/**
 * Triager invite preview — triagers legitimately refresh while reviewing.
 * 120 views per 15 minutes per IP per token URL.
 */
const triagerInviteViewLimiter = rateLimiter(120, 15 * 60, 'public-triager-invite');

router.get('/verify-cert/:certificateId', verifyCertLimiter, verifyCertificate);
router.get('/triager-reassignment/:token', triagerInviteViewLimiter, getTriagerReassignmentInviteByToken);

export default router;
