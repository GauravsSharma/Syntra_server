import express from 'express';

const router = express.Router();

import { recieveInvitationConfimation } from '../controllers/webhooks.js';

router.post("/scalekit",recieveInvitationConfimation)

export default router;