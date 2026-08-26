import passport from 'passport';
import type { Profile as FacebookProfile } from 'passport-facebook';
import { Strategy as FacebookStrategy } from 'passport-facebook';
import type { Profile as GoogleProfile } from 'passport-google-oauth20';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';

import UserModel from '@/modules/user/user.model';
import { env } from '@/config/env.config';

const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, FACEBOOK_APP_ID, FACEBOOK_APP_SECRET, SERVER_URL } = env;

// Absolute callback URLs. A relative path is resolved from the request's Host/protocol,
// so behind a reverse proxy (Render) it becomes `http://...` and Google answers
// `redirect_uri_mismatch`. Register these exact URLs in the Google / Facebook consoles.
const oauthCallback = (provider: 'google' | 'facebook') =>
  `${SERVER_URL.replace(/\/$/, '')}/api/auth/${provider}/callback`;

/**
 * Providers do not guarantee both name parts (single-name Google accounts have no
 * familyName). Keep the app's "firstname = family name" display order when both
 * exist, otherwise put whatever we have in firstname so the user is never nameless.
 */
const splitName = (
  profile: { name?: { familyName?: string; givenName?: string }; displayName?: string },
  email: string
): { firstname: string; lastname: string } => {
  const familyName = profile.name?.familyName?.trim();
  const givenName = profile.name?.givenName?.trim();
  if (familyName && givenName) return { firstname: familyName, lastname: givenName };
  const fallback = familyName || givenName || profile.displayName?.trim() || email.split('@')[0];
  return { firstname: fallback, lastname: '' };
};

passport.use(
  new GoogleStrategy(
    {
      clientID: GOOGLE_CLIENT_ID,
      clientSecret: GOOGLE_CLIENT_SECRET,
      callbackURL: oauthCallback('google'),
    },
    async (_accessToken, _refreshToken, profile: GoogleProfile, cb) => {
      try {
        const email = profile?.emails?.[0]?.value;
        if (!email) {
          return cb(new Error('Google account has no email address'), false);
        }

        let user = await UserModel.findOne({ email });

        if (!user) {
          const photo = profile.photos?.[0]?.value;
          user = await UserModel.create({
            email,
            provider: 'Google',
            ...splitName(profile, email),
            ...(photo ? { avatar: photo } : {}),
            // Google already verified this address
            emailConfirmed: true,
          });
        }

        return cb(null, user);
      } catch (error) {
        return cb(error, false);
      }
    }
  )
);

passport.use(
  new FacebookStrategy(
    {
      clientID: FACEBOOK_APP_ID,
      clientSecret: FACEBOOK_APP_SECRET,
      callbackURL: oauthCallback('facebook'),
      profileFields: ['email', 'photos', 'id', 'displayName', 'name', 'gender'],
    },
    async (_accessToken, _refreshToken, profile: FacebookProfile, cb) => {
      try {
        const email = profile?.emails?.[0]?.value;
        if (!email) {
          return cb(new Error('Facebook account has no email address'), false);
        }

        let user = await UserModel.findOne({ email });

        if (!user) {
          const photo = profile.photos?.[0]?.value;
          user = await UserModel.create({
            email,
            provider: 'Facebook',
            ...splitName(profile, email),
            ...(profile.gender ? { gender: profile.gender } : {}),
            ...(photo ? { avatar: photo } : {}),
            emailConfirmed: true,
          });
        }

        return cb(null, user);
      } catch (error) {
        return cb(error, false);
      }
    }
  )
);

export default passport;
