import { Request, Response, NextFunction } from "express";
import { verifyToken, JwtPayload } from "../utils/jwt";

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export const authenticate = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const token = req.cookies?.token || req.headers.authorization?.replace("Bearer ", "");
    if (!token) { res.status(401).json({ error: "Authentication required" }); return; }
    req.user = verifyToken(token);
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
};

export const requireAdmin = (req: Request, res: Response, next: NextFunction): void => {
  if (req.user?.role !== "ADMIN") { res.status(403).json({ error: "Admin access required" }); return; }
  next();
};

export const requireSupervisorOrAdmin = (req: Request, res: Response, next: NextFunction): void => {
  if (!["ADMIN", "SUPERVISOR"].includes(req.user?.role ?? "")) {
    res.status(403).json({ error: "Supervisor or Admin access required" });
    return;
  }
  next();
};
