import express from 'express';

const router = express.Router();

import { chatToBot, config, createSession } from '../controllers/widget.js';

router.get("/config",config)
router.post("/session",createSession)
router.post("/chat",chatToBot)


export default router;
