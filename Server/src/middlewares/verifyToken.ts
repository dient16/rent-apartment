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
