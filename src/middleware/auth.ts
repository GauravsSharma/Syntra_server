import { AuthRequest } from "../types/express.js";
import { Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export const authMiddleware = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const token =
      req.cookies.user_session ||
      req.headers.authorization?.replace(
        "Bearer ",
        ""
      );

    if (!token) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }

    const JWT_SECRET = process.env.JWT_SECRET;

    if (!JWT_SECRET) {
      throw new Error(
        "JWT_SECRET is missing"
      );
    }

    const decoded = jwt.verify(
      token,
      JWT_SECRET
    ) as {
      role: string;
      email: string;
      organizationId?: string;
    };

    req.user = {
      role: decoded.role,
      email: decoded.email,
      organizationId:decoded.organizationId || null,
    };

    next();
  } catch (error) {
    return res.status(401).json({
      message: "Invalid token",
    });
  }
};