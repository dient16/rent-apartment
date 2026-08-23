import fs from 'node:fs/promises';

import to from 'await-to-js';
import bcrypt from 'bcrypt';
import { StatusCodes } from 'http-status-codes';
import jwt, { JwtPayload } from 'jsonwebtoken';

import UserModel from '@/api/user/user.model';
import type { User } from '@/api/user/user.dto';
import { ResponseStatus, ServiceResponse } from '@/utils/serviceResponse';
import { env } from '@/config/env.config';
import { sendMail } from '@/services/mail.service';
import { generateAccessToken, generateRefreshToken, generateToken } from '@/utils/jwt';

const hashPassword = (password: string) => bcrypt.hashSync(password, bcrypt.genSaltSync(12));
const { JWT_REFRESH_KEY, SERVER_URL } = env;
export const authService = {
  async register(email: string): Promise<ServiceResponse<User | null>> {
    const [errExistingUser, existingUser] = await to(UserModel.findOne({ email }));
    if (errExistingUser) {
      return new ServiceResponse(
        ResponseStatus.Failed,
        'Error checking existing user',
        null,
        StatusCodes.INTERNAL_SERVER_ERROR
      );
    }

    if (existingUser) {
      return new ServiceResponse(ResponseStatus.Failed, 'Email already in use', null, StatusCodes.BAD_REQUEST);
    }

    const confirmationToken = generateToken();

    const [errCreateUser, newUser] = await to(UserModel.create({ email, confirmationToken }));
    if (errCreateUser) {
      return new ServiceResponse(
        ResponseStatus.Failed,
        'Error registering user',
        null,
        StatusCodes.INTERNAL_SERVER_ERROR
      );
    }

    const [readError, htmlTemplate] = await to(fs.readFile('templates/confirmMailTemplate.html', 'utf-8'));
    if (readError) {
      return new ServiceResponse(
        ResponseStatus.Failed,
        'Error reading email template',
        null,
        StatusCodes.INTERNAL_SERVER_ERROR
      );
    }

    // replaceAll: the template renders the link both on the button and as copyable text.
    const emailHtml = htmlTemplate.replaceAll(
      '{{confirmationUrl}}',
      `${SERVER_URL}/api/auth/confirm-email?token=${confirmationToken}`
    );
    const [mailError] = await to(sendMail({ email, html: emailHtml, subject: 'Confirm email' }));
    if (mailError) {
      return new ServiceResponse(ResponseStatus.Failed, 'Error sending email', null, StatusCodes.INTERNAL_SERVER_ERROR);
    }

    return new ServiceResponse(
      ResponseStatus.Success,
      'Registration successful. Please check your email to confirm',
      newUser,
      StatusCodes.CREATED
    );
  },

  async confirmEmail(token: string): Promise<ServiceResponse<User | null>> {
    const [errFindUser, user] = await to(UserModel.findOne({ confirmationToken: token }));
    if (errFindUser || !user) {
      return new ServiceResponse(ResponseStatus.Failed, 'Invalid or expired token', null, StatusCodes.BAD_REQUEST);
    }

    user.emailConfirmed = true;
    const [errSaveUser] = await to(user.save());
    if (errSaveUser) {
      return new ServiceResponse(
        ResponseStatus.Failed,
        'Internal server error',
        null,
        StatusCodes.INTERNAL_SERVER_ERROR
      );
    }

    return new ServiceResponse(ResponseStatus.Success, 'Email confirmed', user, StatusCodes.OK);
  },

  async setPassword(userId: string, password: string): Promise<ServiceResponse<User | null>> {
    const [errFindUser, user] = await to(UserModel.findById(userId));
    if (errFindUser || !user) {
      return new ServiceResponse(ResponseStatus.Failed, 'User not found', null, StatusCodes.NOT_FOUND);
    }

    if (!user.emailConfirmed) {
      return new ServiceResponse(ResponseStatus.Failed, 'Email has not been confirmed', null, StatusCodes.BAD_REQUEST);
    }

    const passwordHash = hashPassword(password);
    const newRefreshToken = generateRefreshToken(user._id);

    const [errUpdateUser, updatedUser] = await to(
      UserModel.findByIdAndUpdate(
        user._id,
        { refreshToken: newRefreshToken, password: passwordHash },
        { new: true }
      ).select('-password -refreshToken')
    );

    if (errUpdateUser) {
      return new ServiceResponse(ResponseStatus.Failed, 'Error updating user', null, StatusCodes.INTERNAL_SERVER_ERROR);
    }

    return new ServiceResponse(
      ResponseStatus.Success,
      'Password has been set successfully',
      updatedUser,
      StatusCodes.OK
    );
  },

  async login(
    email: string,
    password: string
  ): Promise<ServiceResponse<{ accessToken: string; refreshToken?: string; user: any } | null>> {
    try {
      const [errFindUser, user] = await to(UserModel.findOne({ email }));
      if (errFindUser || !user) {
        return new ServiceResponse(ResponseStatus.Failed, 'User not found', null, StatusCodes.NOT_FOUND);
      }

      const userPassword = user.password;
      if (!userPassword) {
        return new ServiceResponse(
          ResponseStatus.Failed,
          'Password not set for this user',
          null,
          StatusCodes.UNAUTHORIZED
        );
      }

      const [errPassword, isPasswordCorrect] = await to(bcrypt.compare(password, userPassword));
      if (errPassword || !isPasswordCorrect) {
        return new ServiceResponse(ResponseStatus.Failed, 'Incorrect password', null, StatusCodes.UNAUTHORIZED);
      }
      const { isAdmin, ...userData } = user.toObject() as any;
      ['confirmationToken', 'password', 'createApartments', 'emailConfirmed', 'provider', 'refreshToken'].forEach(
        (e) => delete userData[e]
      );

      const accessToken = generateAccessToken(user._id, isAdmin);
      const newRefreshToken = generateRefreshToken(user._id);

      const [errUpdate] = await to(
        UserModel.findByIdAndUpdate(user._id, { refreshToken: newRefreshToken }, { new: true })
      );
      if (errUpdate) {
        return new ServiceResponse(
          ResponseStatus.Failed,
          'Error updating user',
          null,
          StatusCodes.INTERNAL_SERVER_ERROR
        );
      }

      return new ServiceResponse(
        ResponseStatus.Success,
        'Login successful',
        { accessToken, refreshToken: newRefreshToken, user: userData },
        StatusCodes.OK
      );
    } catch (error) {
      return new ServiceResponse(
        ResponseStatus.Failed,
        'An unexpected error occurred',
        null,
        StatusCodes.INTERNAL_SERVER_ERROR
      );
    }
  },

  async logout(refreshToken: string): Promise<ServiceResponse<null>> {
    if (!refreshToken) {
      return new ServiceResponse(ResponseStatus.Success, 'Logout is done', null, StatusCodes.OK);
    }

    const [errUpdateUser] = await to(UserModel.findOneAndUpdate({ refreshToken }, { refreshToken: '' }, { new: true }));
    if (errUpdateUser) {
      return new ServiceResponse(
        ResponseStatus.Failed,
        'Internal server error',
        null,
        StatusCodes.INTERNAL_SERVER_ERROR
      );
    }

    return new ServiceResponse(ResponseStatus.Success, 'Logout is done', null, StatusCodes.OK);
  },

  async refreshAccessToken(refreshToken: string): Promise<ServiceResponse<{ accessToken: string } | null>> {
    if (!refreshToken) {
      return new ServiceResponse(ResponseStatus.Failed, 'No refresh token provided', null, StatusCodes.UNAUTHORIZED);
    }

    try {
      const jwtToken = jwt.verify(refreshToken, JWT_REFRESH_KEY) as JwtPayload;

      if (!jwtToken?._id) {
        return new ServiceResponse(ResponseStatus.Failed, 'Unauthorized request!!!', null, StatusCodes.UNAUTHORIZED);
      }

      const [errFindUser, user] = await to(UserModel.findOne({ _id: jwtToken._id, refreshToken }));

      if (errFindUser || !user) {
        return new ServiceResponse(
          ResponseStatus.Failed,
          'User not found or invalid refresh token',
          null,
          StatusCodes.UNAUTHORIZED
        );
      }

      const newAccessToken = generateAccessToken(user._id, user.isAdmin);
      return new ServiceResponse(
        ResponseStatus.Success,
        'Access token refreshed',
        { accessToken: newAccessToken },
        StatusCodes.OK
      );
    } catch (err) {
      return new ServiceResponse(
        ResponseStatus.Failed,
        'Session has expired, please login again!!!',
        null,
        StatusCodes.UNAUTHORIZED
      );
    }
  },
  async googleLoginSuccess(
    userId: string
  ): Promise<ServiceResponse<{ accessToken: string; refreshToken?: string; user: any } | null>> {
    const [errFindUser, user] = await to(UserModel.findById(userId));
    if (errFindUser || !user) {
      return new ServiceResponse(ResponseStatus.Failed, 'User not found', null, StatusCodes.NOT_FOUND);
    }

    const { isAdmin, ...userData } = user.toObject() as any;
    ['confirmationToken', 'password', 'createApartments', 'emailConfirmed', 'provider', 'refreshToken'].forEach(
      (e) => delete userData[e]
    );

    const accessToken = generateAccessToken(user._id, isAdmin);
    const newRefreshToken = generateRefreshToken(user._id);

    const [errUpdate] = await to(UserModel.findByIdAndUpdate(user._id, { refreshToken: newRefreshToken }));

    if (errUpdate) {
      return new ServiceResponse(ResponseStatus.Failed, 'Error updating user', null, StatusCodes.INTERNAL_SERVER_ERROR);
    }

    return new ServiceResponse(
      ResponseStatus.Success,
      'Login successful',
      { accessToken, refreshToken: newRefreshToken, user: userData },
      StatusCodes.OK
    );
  },
};
