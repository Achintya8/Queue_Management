import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { verifyToken } from '../utils/auth';

/**
* Middleware to authenticate JWT token
*/
export const authenticate = (
req: AuthRequest,
res: Response,
next: NextFunction
) => {
try {
const authHeader = req.headers.authorization;

if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'No token provided',
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer '
    const decoded = verifyToken(token);

    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: 'Invalid or expired token',
    });
  }
};

/**
 * Middleware to check if user is staff (admin or operator)
 */
export const isStaff = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user || req.user.type !== 'staff') {
    return res.status(403).json({
      success: false,
      error: 'Access denied. Staff only.',
    });
  }
  next();
};

/**
 * Middleware to check if user is admin
 */
export const isAdmin = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user || req.user.type !== 'staff' || req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: 'Access denied. Admin only.',
    });
  }
  next();
};

/**
 * Middleware to check if user is a regular user (not staff)
 */
export const isUser = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user || req.user.type !== 'user') {
    return res.status(403).json({
      success: false,
      error: 'Access denied. User only.',
    });
  }
  next();
};