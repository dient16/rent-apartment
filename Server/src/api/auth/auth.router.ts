import { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { Router } from 'express';
import passport from 'passport';
import type { Profile as FacebookProfile } from 'passport-facebook';
import type { Profile as GoogleProfile } from 'passport-google-oauth20';
import { z } from 'zod';

import * as controller from '@/api/auth/auth.controller';
import { userLoginSchema, userSignUpSchema } from '@/api/auth/auth.model';
import { UserSchema } from '@/api/user/user.dto';
import { createApiResponse } from '@/api-docs/openAPIResponseBuilders';

export const authRegistry = new OpenAPIRegistry();

authRegistry.register('User', UserSchema);

const router = Router();

authRegistry.registerPath({
  method: 'post',
  path: '/api/auth/register',
  tags: ['Auth'],
  request: {
    body: {
      content: {
        'application/json': {
          schema: userSignUpSchema,
        },
      },
    },
  },
  responses: createApiResponse(UserSchema, 'Success'),
});

router.post('/register', controller.register);

authRegistry.registerPath({
  method: 'post',
  path: '/api/auth/login',
  tags: ['Auth'],
  request: {
    body: {
      content: {
        'application/json': {
          schema: userLoginSchema,
        },
      },
    },
  },
  responses: createApiResponse(UserSchema, 'Success'),
});

router.post('/login', controller.login);

authRegistry.registerPath({
  method: 'get',
  path: '/api/auth/logout',
  tags: ['Auth'],
  security: [{ bearerauth: [] }],
  responses: createApiResponse(UserSchema, 'Success'),
});

router.get('/logout', controller.logout);

authRegistry.registerPath({
  method: 'post',
  path: '/api/auth/refresh-token',
  tags: ['Auth'],
  responses: createApiResponse(UserSchema, 'Success'),
});

router.post('/refresh-token', controller.refreshAccessToken);

authRegistry.registerPath({
  method: 'get',
  path: '/api/auth/confirm-email',
  tags: ['Auth'],
  request: {
    query: z.object({
      token: z.string(),
    }),
  },
  responses: createApiResponse(UserSchema, 'Success'),
});

router.get('/confirm-email', controller.confirmEmail);

authRegistry.registerPath({
  method: 'post',
  path: '/api/auth/set-password',
  tags: ['Auth'],
  request: {
    body: {
      content: {
        'application/json': {
          schema: z.object({
            userId: z.string(),
            password: z.string(),
          }),
        },
      },
    },
  },
  responses: createApiResponse(UserSchema, 'Success'),
});

router.post('/set-password', controller.setPassword);

authRegistry.registerPath({
  method: 'get',
  path: '/api/auth/google',
  tags: ['Auth'],
  security: [{ bearerauth: [] }],
  responses: createApiResponse(UserSchema, 'Success'),
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
  security: [{ bearerauth: [] }],
  responses: createApiResponse(UserSchema, 'Success'),
});

router.get(
  '/google/callback',
  (req, res, next) => {
    passport.authenticate('google', (__err: Error, profile: GoogleProfile) => {
      req.user = profile;
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
  security: [{ bearerauth: [] }],
  responses: createApiResponse(UserSchema, 'Success'),
});

router.get('/facebook', passport.authenticate('facebook', { session: false, scope: ['email'] }));

authRegistry.registerPath({
  method: 'get',
  path: '/api/auth/facebook/callback',
  tags: ['Auth'],
  security: [{ bearerauth: [] }],
  responses: createApiResponse(UserSchema, 'Success'),
});

router.get(
  '/facebook/callback',
  (req, res, next) => {
    passport.authenticate('facebook', (_err: Error, profile: FacebookProfile) => {
      req.user = profile;
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
  request: {
    params: z.object({
      userId: z.string(),
    }),
  },
  responses: createApiResponse(UserSchema, 'Success'),
});

router.get('/signin-success/:userId', controller.googleLoginSuccess);

export const authRouter = router;
