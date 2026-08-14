import { Request, Response, NextFunction } from "express";

declare module "express-session" {
  interface SessionData {
    linkedInOAuthState?: string;
  }
}

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface User {
      id: number;
      email: string;
      name: string;
      picture?: string | null;
      provider: string;
      providerId: string;
      role?: "admin" | "user";
    }
  }
}

// Middleware to check if user is authenticated
export const isAuthenticated = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Unauthorized" });
};

// Optional: Middleware to check if user is not authenticated (for login/register pages)
export const isNotAuthenticated = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!req.isAuthenticated()) {
    return next();
  }
  res.redirect("/");
};



