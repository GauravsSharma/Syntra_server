import express from 'express';
import cors from 'cors';
import { chatToBot, config, createSession } from '../controllers/widget.js';

const openCors = cors({ origin: '*' });
const router = express.Router();

router.get("/config",openCors,config)
router.post("/session",openCors,createSession)
router.post("/chat",openCors,chatToBot)


export default router;
