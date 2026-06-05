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

          let dbUser = await User.findOne({
            $or: [{ googleId: profile.id }, { email }],
            isDeleted: false,
          });

          if (dbUser) {
            if (!dbUser.googleId) {
              dbUser.googleId = profile.id;
              await dbUser.save();
            }
          } else {
            dbUser = await User.create({
              email,
              name: profile.displayName ?? email.split('@')[0],
              googleId: profile.id,
              role: 'owner',
            });
          }

          // Cast to Express.User shape — only pass what the type requires
          const expressUser: Express.User = {
            id: dbUser._id.toString(),
            email: dbUser.email,
            role: dbUser.role,
          };

          return done(null, expressUser);
        } catch (err) {
          return done(err as Error);
        }
      }
    )
  );
}

// Named export so any import style works
export function configurePassport() { /* strategies registered above at module load */ }
export default passport;
