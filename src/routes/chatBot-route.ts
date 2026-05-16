import express from 'express';

const router = express.Router();

import { upload } from '../config/multer.js';
import { authMiddleware } from '../middleware/auth.js';
import { getMetaData, saveChanges, testChatBot } from '../controllers/chatBot.js';

router.get("/metadata", authMiddleware,getMetaData)
router.put("/metadata", authMiddleware ,upload.single("file"),saveChanges)
router.post("/test", authMiddleware ,testChatBot)


export default router;