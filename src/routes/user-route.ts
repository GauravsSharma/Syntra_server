import express from 'express';
import { addMetadata, generateRedirectUrl, getMetadata, getUserInfo, validateScalekitCallback } from '../controllers/user.js';
import { authMiddleware } from '../middleware/auth.js';



const router = express.Router();

// Example route for getting user information
router.get("/login",generateRedirectUrl)
router.get("/callback",validateScalekitCallback)

router.get("/",authMiddleware,getUserInfo)

router.get("/metadata",authMiddleware,getMetadata)

router.post("/metadata",authMiddleware,addMetadata)

router.get("/test", (req, res) => {
    return res.status(200).json({ message: "User route is working!" });
})


export default router;