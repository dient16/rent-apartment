import type { CookieOptions } from 'express';
import type { NextFunction, Request, Response } from '@/types/http';

import { env } from '@/config/env.config';

import { authCommands } from './commands/auth.commands';

const { CLIENT_URL, NODE_ENV } = env;

const REFRESH_COOKIE_NAME = 'refreshToken';
// Production: FE/BE usually live on different domains, so SameSite=None (requires Secure)
// is needed for the browser to send the refresh cookie cross-site. Same-host dev can stay strict.
const refreshCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: NODE_ENV === 'production',
  sameSite: NODE_ENV === 'production' ? 'none' : 'strict',
  path: '/',
};

/** Put the refresh token in an httpOnly cookie and strip it from the response body. */
const attachRefreshCookie = (res: Response, data: { refreshToken?: string }) => {
  if (data.refreshToken) {
    res.cookie(REFRESH_COOKIE_NAME, data.refreshToken, {
      ...refreshCookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    delete data.refreshToken;
  }
};

export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email } = req.body;
    const serviceResponse = await authCommands.register(email);

    serviceResponse.send(res);
  } catch (error) {
    next(error);
  }
};

/**
 * Opened from the email link, so it answers with a redirect rather than JSON.
 * The client page verifies the token again and renders the invalid state itself.
 */
export const confirmEmail = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token } = req.query as { token?: string };
    const serviceResponse = await authCommands.confirmEmail(token ?? '');
    const target = serviceResponse.success && token ? token : 'invalid';
    return res.redirect(`${CLIENT_URL}/set-password/${encodeURIComponent(target)}`);
  } catch (error) {
    next(error);
  }
};

export const verifySetPasswordToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token } = req.params;
    const serviceResponse = await authCommands.verifySetPasswordToken(token);
    serviceResponse.send(res);
  } catch (error) {
    next(error);
  }
};

export const setPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token, password } = req.body;
    const serviceResponse = await authCommands.setPassword(token, password);
    if (serviceResponse.success && serviceResponse.data) {
      attachRefreshCookie(res, serviceResponse.data);
    }
    serviceResponse.send(res);
  } catch (error) {
    next(error);
  }
};

export const forgotPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email } = req.body;
    const serviceResponse = await authCommands.forgotPassword(email);
    serviceResponse.send(res);
  } catch (error) {
    next(error);
  }
};

export const verifyResetToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token } = req.params;
    const serviceResponse = await authCommands.verifyResetToken(token);
    serviceResponse.send(res);
  } catch (error) {
    next(error);
  }
};

export const resetPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token, password } = req.body;
    const serviceResponse = await authCommands.resetPassword(token, password);
    if (serviceResponse.success && serviceResponse.data) {
      attachRefreshCookie(res, serviceResponse.data);
    }
    serviceResponse.send(res);
  } catch (error) {
    next(error);
  }
};

export const changePassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { _id: userId } = req.user as UserDecode;
    const { currentPassword, newPassword } = req.body;
    const serviceResponse = await authCommands.changePassword(userId, currentPassword, newPassword);
    serviceResponse.send(res);
  } catch (error) {
    next(error);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;
    const serviceResponse = await authCommands.login(email, password);
    if (serviceResponse.success && serviceResponse.data) {
      attachRefreshCookie(res, serviceResponse.data);
    }
    serviceResponse.send(res);
  } catch (error) {
    next(error);
  }
};

export const logout = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refreshToken } = req.cookies;
    const serviceResponse = await authCommands.logout(refreshToken);

    res.clearCookie(REFRESH_COOKIE_NAME, refreshCookieOptions);

    serviceResponse.send(res);
  } catch (error) {
    next(error);
  }
};

export const refreshAccessToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refreshToken } = req.cookies;
    const serviceResponse = await authCommands.refreshAccessToken(refreshToken);

    // Refresh failed => clear the cookie so the client stops retrying a broken token
    if (!serviceResponse.success) {
      res.clearCookie(REFRESH_COOKIE_NAME, refreshCookieOptions);
    }

    serviceResponse.send(res);
  } catch (error) {
    next(error);
  }
};

export const googleLoginSuccess = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.params;
    const serviceResponse = await authCommands.googleLoginSuccess(userId);
    if (serviceResponse.success && serviceResponse.data) {
      attachRefreshCookie(res, serviceResponse.data);
    }
    serviceResponse.send(res);
  } catch (error) {
    next(error);
  }
};
