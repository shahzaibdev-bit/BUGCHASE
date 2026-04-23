"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const programController_1 = require("../controllers/programController");
const router = express_1.default.Router();
// Public routes (Researchers can view without specific permissions beyond login)
// Note: We might want transparency even for non-logged in users?
// If so, remove `protect` middleware from server.ts mounting if applied globally there, 
// OR apply it specifically here if needed.
// Based on task, we likely want researchers logged in.
router.get('/', programController_1.getPublicPrograms);
router.get('/:id', programController_1.getPublicProgramById);
exports.default = router;
