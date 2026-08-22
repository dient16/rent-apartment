import crypto from 'node:crypto';

import jwt from 'jsonwebtoken';

import { env } from '@/config/env.config';

const { JWT_ACCESS_KEY, JWT_REFRESH_KEY, ACCESS_TOKEN_TTL, REFRESH_TOKEN_TTL } = env;

interface JwtPayload {
  _id: string;
  isAdmin?: boolean;
}

/** Random token for email verification / password reset (not a JWT). */
export const generateToken = (): string => {
  return crypto.randomBytes(20).toString('hex');
};

export const generateAccessToken = (uid: string, isAdmin: boolean): string => {
  return jwt.sign({ _id: uid, isAdmin } as JwtPayload, JWT_ACCESS_KEY, {
    expiresIn: ACCESS_TOKEN_TTL,
  });
};

export const generateRefreshToken = (uid: string): string => {
  return jwt.sign({ _id: uid } as JwtPayload, JWT_REFRESH_KEY, {
    expiresIn: REFRESH_TOKEN_TTL,
  });
};
