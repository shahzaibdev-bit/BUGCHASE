import express from 'express';
import { getPublicPrograms, getPublicProgramById } from '../controllers/programController';
import { optionalProtect } from '../middlewares/auth';

const router = express.Router();

router.use(optionalProtect);
router.get('/', getPublicPrograms);
router.get('/:id', getPublicProgramById);

export default router;
