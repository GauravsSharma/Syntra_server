import express from 'express';
const router = express.Router();

import { authMiddleware } from '../middleware/auth.js';
import { getOrgCurrentPlan, upgradePlan, verifyPlanPayment } from '../controllers/plan.js';

router.get("/current", authMiddleware,getOrgCurrentPlan)
router.post("/upgrade", authMiddleware,upgradePlan)
router.post("/verify", authMiddleware,verifyPlanPayment)


export default router;