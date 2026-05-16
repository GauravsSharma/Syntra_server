import express from 'express';

const router = express.Router();

import { upload } from '../config/multer.js';
import { authMiddleware } from '../middleware/auth.js';
import { addSection, deleteSection, getSections, toggleSectionStatus } from '../controllers/sections.js';

router.get("/", authMiddleware,getSections)
router.post("/", authMiddleware ,upload.single("file"),addSection)
router.patch("/:sectionId", authMiddleware, toggleSectionStatus)
router.delete("/:id", authMiddleware, deleteSection)

export default router;