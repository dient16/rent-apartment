import type { NextFunction, Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import jwt from 'jsonwebtoken';

import { env } from '@/config/env.config';
const { JWT_ACCESS_KEY } = env;
export const verifyAccessToken = (req: Request, res: Response, next: NextFunction) => {
  if (req?.headers?.authorization?.startsWith('Bearer')) {
    const token = req.headers.authorization.split(' ')[1];

    jwt.verify(token, JWT_ACCESS_KEY, (err, decode) => {
      if (err) {
        if (err.name === 'TokenExpiredError') {
          return res.status(StatusCodes.UNAUTHORIZED).json({
            success: false,
            message: 'Access token has expired!!!',
            statusCode: StatusCodes.UNAUTHORIZED,
          });
        }
        return res.status(StatusCodes.UNAUTHORIZED).json({
          success: false,
          message: 'Invalid access token!!!',
          statusCode: StatusCodes.UNAUTHORIZED,
        });
      }
      req.user = decode as UserDecode;
      next();
    });
  } else {
    return res.status(StatusCodes.UNAUTHORIZED).json({
      success: false,
      message: 'Require authentication!!!',
    });
  }
};

/**
 * Attaches `req.user` when a valid Bearer token is present, but never rejects:
 * for public routes (e.g. guest booking) that still want to know who the caller is.
 */
export const optionalAccessToken = (req: Request, _res: Response, next: NextFunction) => {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) {
    try {
      req.user = jwt.verify(header.slice('Bearer '.length), JWT_ACCESS_KEY) as UserDecode;
    } catch {
      // Invalid/expired token on a public route: treat as anonymous.
    }
  }
  next();
};

export const verifyIsAdmin = (req: Request, res: Response, next: NextFunction) => {
  const user = req.user as UserDecode;
  if (!user?.isAdmin) {
    return res.status(StatusCodes.UNAUTHORIZED).json({
      success: false,
      message: 'Required admin role!!!',
    });
  }

  next();
};
