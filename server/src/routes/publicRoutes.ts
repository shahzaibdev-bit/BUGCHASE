import express from 'express';
import { verifyCertificate } from '../controllers/publicController';

const router = express.Router();

router.get('/verify-cert/:certificateId', verifyCertificate);

export default router;
