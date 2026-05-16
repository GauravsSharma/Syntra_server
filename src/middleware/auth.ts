import { Response, NextFunction } from "express";
import { AuthRequest } from "../types/express.js";

export const authMiddleware = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const session = req.cookies.user_session;
    const auth = req.headers.authorization;

    if (!session && !auth) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    let parsed = JSON.parse(session);
    req.user = {
      email: parsed.email,
      role: parsed.role || "admin",
      organizationId: parsed.organization_id || null,
    };

    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid session" });
  }
};