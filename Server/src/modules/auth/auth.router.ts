import { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { Router } from 'express';
import { StatusCodes } from 'http-status-codes';
import passport from 'passport';
import type { Profile as FacebookProfile } from 'passport-facebook';
import type { Profile as GoogleProfile } from 'passport-google-oauth20';
import { z } from 'zod';

import * as controller from '@/modules/auth/auth.controller';
import { userLoginSchema, userSignUpSchema } from '@/modules/auth/auth.model';
import { UserSchema } from '@/modules/user/user.dto';
import { createApiResponses, errorResponses, objectId, PUBLIC } from '@/api-docs/openAPIResponseBuilders';

export const authRegistry = new OpenAPIRegistry();

const PublicUserSchema = UserSchema.omit({ password: true, refreshToken: true, confirmationToken: true }).openapi(
  'PublicUser'
);

const LoginResultSchema = z
  .object({
    accessToken: z.string().openapi({ description: 'Short-lived JWT for the `Authorization: Bearer` header' }),
    user: PublicUserSchema,
  })
  .openapi('LoginResult', {
    description: 'The refresh token is not in the body; it is set as an `httpOnly` cookie named `refreshToken`.',
  });

const REFRESH_COOKIE_DOC = 'Requires the `refreshToken` httpOnly cookie set by login.';

const router = Router();

authRegistry.registerPath({
  method: 'post',
  path: '/api/auth/register',
  tags: ['Auth'],
  summary: 'Register with email',
  description:
    'Creates an unconfirmed account and emails a confirmation link. The user sets a password after confirming (see `confirm-email` and `set-password`).',
  security: PUBLIC,
  request: {
    body: { content: { 'application/json': { schema: userSignUpSchema.openapi('RegisterBody') } } },
  },
  responses: createApiResponses(PublicUserSchema, 'Registration successful, confirmation email sent', {
    status: StatusCodes.CREATED,
    errors: [StatusCodes.BAD_REQUEST, StatusCodes.CONFLICT],
  }),
});

router.post('/register', controller.register);

authRegistry.registerPath({
  method: 'post',
  path: '/api/auth/login',
  tags: ['Auth'],
  summary: 'Login with email and password',
  security: PUBLIC,
  request: {
    body: { content: { 'application/json': { schema: userLoginSchema.openapi('LoginBody') } } },
  },
  responses: createApiResponses(LoginResultSchema, 'Login successful', {
    errors: [StatusCodes.BAD_REQUEST, StatusCodes.UNAUTHORIZED, StatusCodes.NOT_FOUND],
  }),
});

router.post('/login', controller.login);

authRegistry.registerPath({
  method: 'get',
  path: '/api/auth/logout',
  tags: ['Auth'],
  summary: 'Logout',
  description: `Revokes the refresh token and clears its cookie. ${REFRESH_COOKIE_DOC}`,
  security: PUBLIC,
  responses: createApiResponses(z.null(), 'Logout is done'),
});

router.get('/logout', controller.logout);

authRegistry.registerPath({
  method: 'post',
  path: '/api/auth/refresh-token',
  tags: ['Auth'],
  summary: 'Refresh the access token',
  description: `Issues a new access token. ${REFRESH_COOKIE_DOC}`,
  security: PUBLIC,
  responses: createApiResponses(
    z.object({ accessToken: z.string() }).openapi('RefreshResult'),
    'Access token refreshed',
    {
      errors: [StatusCodes.UNAUTHORIZED, StatusCodes.FORBIDDEN],
    }
  ),
});

router.post('/refresh-token', controller.refreshAccessToken);

authRegistry.registerPath({
  method: 'get',
  path: '/api/auth/confirm-email',
  tags: ['Auth'],
  summary: 'Confirm email address',
  description: 'Opened from the link in the registration email.',
  security: PUBLIC,
  request: {
    query: z.object({
      token: z.string().openapi({ description: 'Confirmation token from the email link' }),
    }),
  },
  responses: createApiResponses(PublicUserSchema, 'Email confirmed', {
    errors: [StatusCodes.BAD_REQUEST, StatusCodes.NOT_FOUND],
  }),
});

router.get('/confirm-email', controller.confirmEmail);

authRegistry.registerPath({
  method: 'post',
  path: '/api/auth/set-password',
  tags: ['Auth'],
  summary: 'Set password after email confirmation',
  security: PUBLIC,
  request: {
    body: {
      content: {
        'application/json': {
          schema: z
            .object({
              userId: objectId('User id returned by `confirm-email`'),
              password: z.string().min(6),
            })
            .openapi('SetPasswordBody'),
        },
      },
    },
  },
  responses: createApiResponses(PublicUserSchema, 'Password has been set successfully', {
    errors: [StatusCodes.BAD_REQUEST, StatusCodes.NOT_FOUND],
  }),
});

router.post('/set-password', controller.setPassword);

const OAUTH_REDIRECT = {
  [StatusCodes.MOVED_TEMPORARILY]: { description: 'Redirect to the provider consent screen' },
};

authRegistry.registerPath({
  method: 'get',
  path: '/api/auth/google',
  tags: ['Auth'],
  summary: 'Start Google OAuth login',
  description: 'Browser redirect flow, not an XHR endpoint. Open it in a new window.',
  security: PUBLIC,
  responses: OAUTH_REDIRECT,
});

router.get(
  '/google',
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    session: false,
  })
);

authRegistry.registerPath({
  method: 'get',
  path: '/api/auth/google/callback',
  tags: ['Auth'],
  summary: 'Google OAuth callback',
  description: 'Called by Google. Redirects to `{CLIENT_URL}/signin-success/{userId}` on the client.',
  security: PUBLIC,
  responses: {
    [StatusCodes.MOVED_TEMPORARILY]: { description: 'Redirect to the client `signin-success` page' },
  },
});

router.get(
  '/google/callback',
  (req, res, next) => {
    passport.authenticate('google', (__err: Error, profile: GoogleProfile) => {
      req.user = profile as unknown as Express.User;
      next();
    })(req, res, next);
  },
  (req, res) => {
    res.redirect(`${process.env.CLIENT_URL}/signin-success/${(req?.user as UserDecode)._id}`);
  }
);

authRegistry.registerPath({
  method: 'get',
  path: '/api/auth/facebook',
  tags: ['Auth'],
  summary: 'Start Facebook OAuth login',
  description: 'Browser redirect flow, not an XHR endpoint. Open it in a new window.',
  security: PUBLIC,
  responses: OAUTH_REDIRECT,
});

router.get('/facebook', passport.authenticate('facebook', { session: false, scope: ['email'] }));

authRegistry.registerPath({
  method: 'get',
  path: '/api/auth/facebook/callback',
  tags: ['Auth'],
  summary: 'Facebook OAuth callback',
  description: 'Called by Facebook. Redirects to `{CLIENT_URL}/signin-success/{userId}` on the client.',
  security: PUBLIC,
  responses: {
    [StatusCodes.MOVED_TEMPORARILY]: { description: 'Redirect to the client `signin-success` page' },
  },
});

router.get(
  '/facebook/callback',
  (req, res, next) => {
    passport.authenticate('facebook', (_err: Error, profile: FacebookProfile) => {
      req.user = profile as unknown as Express.User;
      next();
    })(req, res, next);
  },
  (req, res) => {
    res.redirect(`${process.env.CLIENT_URL}/signin-success/${(req?.user as UserDecode)._id}`);
  }
);

authRegistry.registerPath({
  method: 'get',
  path: '/api/auth/signin-success/{userId}',
  tags: ['Auth'],
  summary: 'Finish OAuth login',
  description: 'Called by the client after the OAuth redirect to exchange the user id for tokens.',
  security: PUBLIC,
  request: {
    params: z.object({ userId: objectId('User id from the OAuth redirect URL') }),
  },
  responses: {
    ...createApiResponses(LoginResultSchema, 'Login successful'),
    ...errorResponses(StatusCodes.NOT_FOUND),
  },
});

router.get('/signin-success/:userId', controller.googleLoginSuccess);

export const authRouter = router;
