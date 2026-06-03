import { acceptInvitation, addMemberToOrganization, deleteOrg, getMyOrganizations, getOrganization, getTeamMembers, switchOrganizations, verifyInvitation } from "../controllers/organization";
import express from 'express';

import { authMiddleware } from '../middleware/auth.js';
import { getOverview } from "../controllers/overview";

const router = express.Router();

router.get("/", authMiddleware, getOrganization)
router.delete("/", authMiddleware,deleteOrg)
router.get("/overview", authMiddleware, getOverview)
router.get("/my", authMiddleware, getMyOrganizations)
router.post("/switch", authMiddleware, switchOrganizations)
router.post("/invitations/:token/accept", authMiddleware, acceptInvitation)
router.get("/invitations/:token/verify", verifyInvitation)

router.get("/members", authMiddleware, getTeamMembers)
router.post("/members", authMiddleware, addMemberToOrganization)

export default router;
