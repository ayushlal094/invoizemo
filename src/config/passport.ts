import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { env, isGoogleOAuthEnabled } from './env.js';
import { User } from '../modules/users/user.model.js';

if (isGoogleOAuthEnabled) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: env.GOOGLE_CLIENT_ID!,
        clientSecret: env.GOOGLE_CLIENT_SECRET!,
        callbackURL:
          env.GOOGLE_CALLBACK_URL ??
          `http://localhost:${env.PORT}/api/v1/auth/google/callback`,
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value?.toLowerCase();
          if (!email) return done(new Error('No email returned from Google'));

          let user = await User.findOne({
            $or: [{ googleId: profile.id }, { email }],
            isDeleted: false,
          });

          if (user) {
            if (!user.googleId) {
              user.googleId = profile.id;
              await user.save();
            }
          } else {
            user = await User.create({
              email,
              name: profile.displayName ?? email.split('@')[0],
              googleId: profile.id,
              role: 'owner',
            });
          }

          return done(null, user);
        } catch (err) {
          return done(err as Error);
        }
      }
    )
  );
}

// Named export so auth.controller can do: import { passportInstance } from './passport.js'
export { passport as passportInstance };
export default passport;
