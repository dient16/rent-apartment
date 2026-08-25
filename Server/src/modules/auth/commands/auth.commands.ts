import fs from 'node:fs/promises';

import to from 'await-to-js';
import bcrypt from 'bcrypt';
import { StatusCodes } from 'http-status-codes';
import jwt, { JwtPayload } from 'jsonwebtoken';

import type { User } from '@/modules/user/user.dto';
import { authRepository } from '../auth.repository';
import { ResponseStatus, ServiceResponse } from '@/utils/serviceResponse';
import { env } from '@/config/env.config';
import { sendMail } from '@/services/mail.service';
import { generateAccessToken, generateRefreshToken, generateToken } from '@/utils/jwt';

const hashPassword = (password: string) => bcrypt.hashSync(password, bcrypt.genSaltSync(12));
const { JWT_REFRESH_KEY, SERVER_URL, CLIENT_URL } = env;

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

/** Minted after login, set-password and reset-password alike. */
interface LoginResult {
  accessToken: string;
  refreshToken?: string;
  user: any;
}

/** Strip everything the client must not see from a user document. */
const toPublicUser = (user: any) => {
  const { isAdmin, ...userData } = user.toObject ? user.toObject() : { ...user };
  [
    'confirmationToken',
    'password',
    'createApartments',
    'emailConfirmed',
    'provider',
    'refreshToken',
    'resetPasswordToken',
    'resetPasswordExpires',
  ].forEach((field) => delete userData[field]);
  return { isAdmin: Boolean(isAdmin), userData };
};

const failed = <T = null>(message: string, statusCode: number) =>
  new ServiceResponse<T>(ResponseStatus.Failed, message, null as T, statusCode);

const serverError = <T = null>(message: string) => failed<T>(message, StatusCodes.INTERNAL_SERVER_ERROR);

/** Auth use-cases are all writes (they mint/rotate tokens) - modeled as commands. */
export const authCommands = {
  async register(email: string): Promise<ServiceResponse<User | null>> {
    const [errExistingUser, existingUser] = await to(authRepository.findByEmail(email));
    if (errExistingUser) {
      return serverError('Error checking existing user');
    }

    if (existingUser) {
      return failed('Email already in use', StatusCodes.BAD_REQUEST);
    }

    const confirmationToken = generateToken();

    const [errCreateUser, newUser] = await to(authRepository.create({ email, confirmationToken }));
    if (errCreateUser) {
      return serverError('Error registering user');
    }

    const [readError, htmlTemplate] = await to(fs.readFile('templates/confirmMailTemplate.html', 'utf-8'));
    if (readError) {
      return serverError('Error reading email template');
    }

    const emailHtml = htmlTemplate.replaceAll(
      '{{confirmationUrl}}',
      `${SERVER_URL}/api/auth/confirm-email?token=${confirmationToken}`
    );
    const [mailError] = await to(sendMail({ email, html: emailHtml, subject: 'Confirm email' }));
    if (mailError) {
      return serverError('Error sending email');
    }

    return new ServiceResponse(
      ResponseStatus.Success,
      'Registration successful. Please check your email to confirm',
      newUser,
      StatusCodes.CREATED
    );
  },

  async confirmEmail(token: string): Promise<ServiceResponse<User | null>> {
    if (!token) {
      return failed('Invalid or expired token', StatusCodes.BAD_REQUEST);
    }
    const [errFindUser, user] = await to(authRepository.findByConfirmationToken(token));
    if (errFindUser || !user) {
      return failed('Invalid or expired token', StatusCodes.BAD_REQUEST);
    }

    if (!user.emailConfirmed) {
      user.emailConfirmed = true;
      const [errSaveUser] = await to(user.save());
      if (errSaveUser) {
        return serverError('Internal server error');
      }
    }

    return new ServiceResponse(ResponseStatus.Success, 'Email confirmed', user, StatusCodes.OK);
  },

  /** Lets the set-password page show who it is for (and an invalid state) before the form. */
  async verifySetPasswordToken(token: string): Promise<ServiceResponse<{ email: string } | null>> {
    const [errFindUser, user] = await to(authRepository.findByConfirmationToken(token));
    if (errFindUser || !user || !user.emailConfirmed) {
      return failed('This link is invalid or has already been used', StatusCodes.BAD_REQUEST);
    }
    if (user.password) {
      return failed('A password has already been set for this account', StatusCodes.BAD_REQUEST);
    }
    return new ServiceResponse(ResponseStatus.Success, 'Token is valid', { email: user.email }, StatusCodes.OK);
  },

  /**
   * First password after confirming the email. Keyed by the confirmation token (not the
   * user id) so only the person holding the email link can claim the account.
   */
  async setPassword(token: string, password: string): Promise<ServiceResponse<LoginResult | null>> {
    const [errFindUser, user] = await to(authRepository.findByConfirmationToken(token));
    if (errFindUser || !user) {
      return failed('This link is invalid or has already been used', StatusCodes.BAD_REQUEST);
    }

    if (!user.emailConfirmed) {
      return failed('Email has not been confirmed', StatusCodes.BAD_REQUEST);
    }

    if (user.password) {
      return failed('A password has already been set for this account', StatusCodes.BAD_REQUEST);
    }

    const passwordHash = hashPassword(password);
    const newRefreshToken = generateRefreshToken(user._id);

    const [errUpdateUser, updatedUser] = await to(
      authRepository.setCredentials(user._id, newRefreshToken, passwordHash)
    );

    if (errUpdateUser || !updatedUser) {
      return serverError('Error updating user');
    }

    const { isAdmin, userData } = toPublicUser(updatedUser);
    const accessToken = generateAccessToken(user._id, isAdmin);

    return new ServiceResponse(
      ResponseStatus.Success,
      'Password has been set successfully',
      { accessToken, refreshToken: newRefreshToken, user: userData },
      StatusCodes.OK
    );
  },

  /**
   * Always answers with the same success message so the endpoint cannot be used to
   * find out which emails have an account.
   */
  async forgotPassword(email: string): Promise<ServiceResponse<null>> {
    const genericResponse = new ServiceResponse(
      ResponseStatus.Success,
      'If an account exists for this email, a reset link has been sent',
      null,
      StatusCodes.OK
    );

    const [errFindUser, user] = await to(authRepository.findByEmail(email));
    if (errFindUser) {
      return serverError('Error checking existing user');
    }
    // Unconfirmed accounts have no password to reset yet — they should finish sign-up instead.
    if (!user || !user.emailConfirmed) {
      return genericResponse;
    }

    const resetToken = generateToken();
    const expires = new Date(Date.now() + RESET_TOKEN_TTL_MS);
    const [errSaveToken] = await to(authRepository.setResetToken(user._id, resetToken, expires));
    if (errSaveToken) {
      return serverError('Error creating reset token');
    }

    const [readError, htmlTemplate] = await to(fs.readFile('templates/resetPasswordTemplate.html', 'utf-8'));
    if (readError) {
      return serverError('Error reading email template');
    }

    const emailHtml = htmlTemplate
      .replaceAll('{{resetUrl}}', `${CLIENT_URL}/reset-password/${resetToken}`)
      .replaceAll('{{email}}', user.email);
    const [mailError] = await to(sendMail({ email: user.email, html: emailHtml, subject: 'Reset your password' }));
    if (mailError) {
      return serverError('Error sending email');
    }

    return genericResponse;
  },

  async verifyResetToken(token: string): Promise<ServiceResponse<{ email: string } | null>> {
    const [errFindUser, user] = await to(authRepository.findByResetToken(token));
    if (errFindUser || !user) {
      return failed('This reset link is invalid or has expired', StatusCodes.BAD_REQUEST);
    }
    return new ServiceResponse(ResponseStatus.Success, 'Token is valid', { email: user.email }, StatusCodes.OK);
  },

  /** Replaces the password, revokes other sessions and signs the user in on this one. */
  async resetPassword(token: string, password: string): Promise<ServiceResponse<LoginResult | null>> {
    const [errFindUser, user] = await to(authRepository.findByResetToken(token));
    if (errFindUser || !user) {
      return failed('This reset link is invalid or has expired', StatusCodes.BAD_REQUEST);
    }

    const passwordHash = hashPassword(password);
    const newRefreshToken = generateRefreshToken(user._id);

    const [errUpdateUser, updatedUser] = await to(
      authRepository.resetPassword(user._id, passwordHash, newRefreshToken)
    );
    if (errUpdateUser || !updatedUser) {
      return serverError('Error updating password');
    }

    const { isAdmin, userData } = toPublicUser(updatedUser);
    const accessToken = generateAccessToken(user._id, isAdmin);

    return new ServiceResponse(
      ResponseStatus.Success,
      'Your password has been reset',
      { accessToken, refreshToken: newRefreshToken, user: userData },
      StatusCodes.OK
    );
  },

  /**
   * Signed-in password change. Accounts created through Google/Facebook have no password
   * yet, so they may set one without a current password.
   */
  async changePassword(
    userId: string,
    currentPassword: string | undefined,
    newPassword: string
  ): Promise<ServiceResponse<null>> {
    const [errFindUser, user] = await to(authRepository.findById(userId));
    if (errFindUser || !user) {
      return failed('User not found', StatusCodes.NOT_FOUND);
    }

    if (user.password) {
      if (!currentPassword) {
        return failed('Current password is required', StatusCodes.BAD_REQUEST);
      }
      const [errCompare, isMatch] = await to(bcrypt.compare(currentPassword, user.password));
      if (errCompare || !isMatch) {
        return failed('Current password is incorrect', StatusCodes.BAD_REQUEST);
      }
      if (currentPassword === newPassword) {
        return failed('New password must be different from the current one', StatusCodes.BAD_REQUEST);
      }
    }

    const [errUpdate] = await to(authRepository.updatePassword(user._id, hashPassword(newPassword)));
    if (errUpdate) {
      return serverError('Error updating password');
    }

    return new ServiceResponse(ResponseStatus.Success, 'Password updated successfully', null, StatusCodes.OK);
  },

  async login(email: string, password: string): Promise<ServiceResponse<LoginResult | null>> {
    try {
      const [errFindUser, user] = await to(authRepository.findByEmail(email));
      if (errFindUser || !user) {
        return failed('User not found', StatusCodes.NOT_FOUND);
      }

      const userPassword = user.password;
      if (!userPassword) {
        return failed('Password not set for this user', StatusCodes.UNAUTHORIZED);
      }

      const [errPassword, isPasswordCorrect] = await to(bcrypt.compare(password, userPassword));
      if (errPassword || !isPasswordCorrect) {
        return failed('Incorrect password', StatusCodes.UNAUTHORIZED);
      }
      const { isAdmin, userData } = toPublicUser(user);

      const accessToken = generateAccessToken(user._id, isAdmin);
      const newRefreshToken = generateRefreshToken(user._id);

      const [errUpdate] = await to(authRepository.setRefreshToken(user._id, newRefreshToken));
      if (errUpdate) {
        return serverError('Error updating user');
      }

      return new ServiceResponse(
        ResponseStatus.Success,
        'Login successful',
        { accessToken, refreshToken: newRefreshToken, user: userData },
        StatusCodes.OK
      );
    } catch (error) {
      return serverError('An unexpected error occurred');
    }
  },

  async logout(refreshToken: string): Promise<ServiceResponse<null>> {
    if (!refreshToken) {
      return new ServiceResponse(ResponseStatus.Success, 'Logout is done', null, StatusCodes.OK);
    }

    const [errUpdateUser] = await to(authRepository.clearRefreshToken(refreshToken));
    if (errUpdateUser) {
      return serverError('Internal server error');
    }

    return new ServiceResponse(ResponseStatus.Success, 'Logout is done', null, StatusCodes.OK);
  },

  async refreshAccessToken(refreshToken: string): Promise<ServiceResponse<{ accessToken: string } | null>> {
    if (!refreshToken) {
      return failed('No refresh token provided', StatusCodes.UNAUTHORIZED);
    }

    try {
      const jwtToken = jwt.verify(refreshToken, JWT_REFRESH_KEY) as JwtPayload;

      if (!jwtToken?._id) {
        return failed('Unauthorized request!!!', StatusCodes.UNAUTHORIZED);
      }

      const [errFindUser, user] = await to(authRepository.findByIdAndRefreshToken(jwtToken._id, refreshToken));

      if (errFindUser || !user) {
        return failed('User not found or invalid refresh token', StatusCodes.UNAUTHORIZED);
      }

      const newAccessToken = generateAccessToken(user._id, user.isAdmin);
      return new ServiceResponse(
        ResponseStatus.Success,
        'Access token refreshed',
        { accessToken: newAccessToken },
        StatusCodes.OK
      );
    } catch (err) {
      return failed('Session has expired, please login again!!!', StatusCodes.UNAUTHORIZED);
    }
  },

  async googleLoginSuccess(userId: string): Promise<ServiceResponse<LoginResult | null>> {
    const [errFindUser, user] = await to(authRepository.findById(userId));
    if (errFindUser || !user) {
      return failed('User not found', StatusCodes.NOT_FOUND);
    }

    const { isAdmin, userData } = toPublicUser(user);

    const accessToken = generateAccessToken(user._id, isAdmin);
    const newRefreshToken = generateRefreshToken(user._id);

    const [errUpdate] = await to(authRepository.setRefreshToken(user._id, newRefreshToken));

    if (errUpdate) {
      return serverError('Error updating user');
    }

    return new ServiceResponse(
      ResponseStatus.Success,
      'Login successful',
      { accessToken, refreshToken: newRefreshToken, user: userData },
      StatusCodes.OK
    );
  },
};
