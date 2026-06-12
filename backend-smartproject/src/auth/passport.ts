import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { db } from "../db";
import { findOrCreateOAuthUser } from "./oauth-helpers";

passport.serializeUser((user: Express.User, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id: number, done) => {
  try {
    const user = await db.collection("users").findOne({ id });
    done(null, user ? (user as unknown as Express.User) : null);
  } catch (error) {
    done(error, null);
  }
});

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL:
          process.env.GOOGLE_CALLBACK_URL ||
          "http://localhost:8080/api/auth/google/callback",
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value || "";
          if (!email) {
            return done(new Error("Google account has no email"), undefined);
          }
          const picture = profile.photos?.[0]?.value ?? null;
          const user = await findOrCreateOAuthUser(db, {
            email,
            name: profile.displayName || "User",
            provider: "google",
            providerId: profile.id,
            picture,
          });
          return done(null, user as unknown as Express.User);
        } catch (error) {
          return done(error as Error, undefined);
        }
      }
    )
  );
}

export default passport;
