import { addMemberToOrganization, getOrganization, getTeamMembers } from "../controllers/organization";
import express from 'express';

import { authMiddleware } from '../middleware/auth.js';
import { expireConversation, getClientConversation, getConversation, getConversationById, getEscalatedConversationCount, sendMessageToAgent, sendMessageToUser, updateConversationStatus } from "../controllers/conversation";


const router = express.Router();
// ✅ specific first
router.patch("/update", expireConversation)
router.post("/chat/agent", sendMessageToAgent)

router.post("/chat/:id", authMiddleware, sendMessageToUser)

router.get("/escalated/count/:id", authMiddleware, getEscalatedConversationCount)

router.get("/client", getClientConversation)
// dynamic after
router.get("/:id", authMiddleware, getConversation)

router.get("/:id/chatbot", authMiddleware, getConversationById)

router.patch("/:id/chatbot", authMiddleware, updateConversationStatus)

export default router