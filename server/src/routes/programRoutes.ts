import express from 'express';
import { getPublicPrograms, getPublicProgramById } from '../controllers/programController';

const router = express.Router();

// Public routes (Researchers can view without specific permissions beyond login)
// Note: We might want transparency even for non-logged in users?
// If so, remove `protect` middleware from server.ts mounting if applied globally there, 
// OR apply it specifically here if needed.
// Based on task, we likely want researchers logged in.

router.get('/', getPublicPrograms);
router.get('/:id', getPublicProgramById);

export default router;
