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

passport.use(
  new GoogleStrategy(
    {
      clientID: GOOGLE_CLIENT_ID,
      clientSecret: GOOGLE_CLIENT_SECRET,
      callbackURL: oauthCallback('google'),
    },
    async (_accessToken, _refreshToken, profile: GoogleProfile, cb) => {
      try {
        if (profile) {
          const email = profile.emails?.[0]?.value;
          const familyName = profile.name?.familyName;
          const givenName = profile.name?.givenName;
          const photo = profile.photos?.[0]?.value;

          if (!email || !familyName || !givenName || !photo) {
            return cb(new Error('Profile information is incomplete'), false);
          }

          let user = await UserModel.findOne({ email });

          if (!user) {
            user = await UserModel.create({
              email,
              provider: 'Google',
              firstname: familyName,
              lastname: givenName,
              avatar: photo,
            });
          }

          return cb(null, user);
        }
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
        if (profile) {
          const email = profile.emails?.[0]?.value;
          const familyName = profile.name?.familyName;
          const givenName = profile.name?.givenName;
          const gender = profile.gender;
          const photo = profile.photos?.[0]?.value;

          if (!email || !familyName || !givenName || !gender || !photo) {
            return cb(new Error('Profile information is incomplete'), false);
          }

          let user = await UserModel.findOne({ email });

          if (!user) {
            user = await UserModel.create({
              email,
              provider: 'Facebook',
              firstname: familyName,
              lastname: givenName,
              gender,
              avatar: photo,
            });
          }

          return cb(null, user);
        }
      } catch (error) {
        return cb(error, false);
      }
    }
  )
);

export default passport;
