import express from 'express';
import { addMetadata, getMetadata, getUserInfo, generateRedirectUrl, googleCallback} from '../controllers/user.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// Example route for getting user information
router.get("/login",generateRedirectUrl)
router.get("/google/callback",googleCallback)

router.get("/",authMiddleware,getUserInfo)

router.get("/metadata",authMiddleware,getMetadata)

router.post("/metadata",authMiddleware,addMetadata)

export default router;
