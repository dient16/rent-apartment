import type { CookieOptions, NextFunction, Request, Response } from 'express';

import { env } from '@/config/env.config';
import { handleServiceResponse } from '@/utils/httpHandlers';

import { authService } from './auth.service';

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
    const serviceResponse = await authService.register(email);

    handleServiceResponse(serviceResponse, res);
  } catch (error) {
    next(error);
  }
};

export const confirmEmail = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token } = req.query as { token: string };
    const serviceResponse = await authService.confirmEmail(token);
    const userId = serviceResponse?.data?._id;
    if (userId) return res.redirect(`${CLIENT_URL}/set-password/${userId}`);
    handleServiceResponse(serviceResponse, res);
  } catch (error) {
    next(error);
  }
};

export const setPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, password } = req.body;
    const serviceResponse = await authService.setPassword(userId, password);
    handleServiceResponse(serviceResponse, res);
  } catch (error) {
    next(error);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;
    const serviceResponse = await authService.login(email, password);
    if (serviceResponse.success && serviceResponse.data) {
      attachRefreshCookie(res, serviceResponse.data);
    }
    handleServiceResponse(serviceResponse, res);
  } catch (error) {
    next(error);
  }
};

export const logout = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refreshToken } = req.cookies;
    const serviceResponse = await authService.logout(refreshToken);

    res.clearCookie(REFRESH_COOKIE_NAME, refreshCookieOptions);

    handleServiceResponse(serviceResponse, res);
  } catch (error) {
    next(error);
  }
};

export const refreshAccessToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refreshToken } = req.cookies;
    const serviceResponse = await authService.refreshAccessToken(refreshToken);

    // Refresh failed => clear the cookie so the client stops retrying a broken token
    if (!serviceResponse.success) {
      res.clearCookie(REFRESH_COOKIE_NAME, refreshCookieOptions);
    }

    handleServiceResponse(serviceResponse, res);
  } catch (error) {
    next(error);
  }
};

export const googleLoginSuccess = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.params;
    const serviceResponse = await authService.googleLoginSuccess(userId);
    if (serviceResponse.success && serviceResponse.data) {
      attachRefreshCookie(res, serviceResponse.data);
    }
    handleServiceResponse(serviceResponse, res);
  } catch (error) {
    next(error);
  }
};
