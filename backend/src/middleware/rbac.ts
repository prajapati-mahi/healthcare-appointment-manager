import { Request, Response, NextFunction } from 'express';

/**
 * Role-based access control middleware.
 * Reads role ONLY from req.user (set by JWT auth middleware).
 * NEVER trusts role from request body, query params, or headers.
 */
export const requireRole = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: `Access denied. Required role(s): ${roles.join(', ')}. Your role: ${req.user.role}`,
      });
      return;
    }
    next();
  };
};
