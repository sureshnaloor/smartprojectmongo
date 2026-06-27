import { Router, Request, Response, NextFunction } from "express";
import crypto from "crypto";
import passport from "./passport";
import { isAuthenticated } from "./middleware";
import { db } from "../db";
import { findOrCreateOAuthUser } from "./oauth-helpers";

const router = Router();
/** Where the browser lands after OAuth. In production, default to BASE_URL (single server on :8080). */
const FRONTEND =
  process.env.FRONTEND_URL ||
  (process.env.NODE_ENV === "production"
    ? process.env.BASE_URL || "http://localhost:8080"
    : "http://localhost:5173");

const backendOrigin = process.env.BASE_URL || "http://localhost:8080";

function linkedinConfigured() {
  return !!(process.env.LINKEDIN_CLIENT_ID && process.env.LINKEDIN_CLIENT_SECRET);
}

function linkedinCallbackUrl() {
  return (
    process.env.LINKEDIN_CALLBACK_URL ||
    `${backendOrigin}/api/auth/linkedin/callback`
  );
}

function googleConfigured() {
  return !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

// Developer Bypass login route for local testing/dev
router.get("/bypass", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const devUser = await findOrCreateOAuthUser(db, {
      email: "dev@example.com",
      name: "Developer Guest",
      provider: "bypass",
      providerId: "bypass-dev-user",
      picture: "https://api.dicebear.com/7.x/adventurer/svg?seed=dev"
    });

    req.login(devUser as Express.User, (err) => {
      if (err) return next(err);
      return res.redirect(`${FRONTEND}/`);
    });
  } catch (error) {
    next(error);
  }
});

// Google OAuth routes (strategy registered only when GOOGLE_* env is set).
router.get("/google", (req: Request, res: Response, next: NextFunction) => {
  if (!googleConfigured()) {
    return res.redirect(`${FRONTEND}/login?error=google_not_configured`);
  }
  passport.authenticate("google", { scope: ["profile", "email"] })(req, res, next);
});

router.get(
  "/google/callback",
  (req: Request, res: Response, next: NextFunction) => {
    if (!googleConfigured()) {
      return res.redirect(`${FRONTEND}/login?error=google_not_configured`);
    }
    passport.authenticate("google", {
      failureRedirect: `${FRONTEND}/login?error=google_failed`,
      successRedirect: `${FRONTEND}/`,
    })(req, res, next);
  }
);

// LinkedIn OAuth (OpenID Connect scopes; manual flow so tokens hit /v2/userinfo).
router.get("/linkedin", (req: Request, res: Response) => {
  if (!linkedinConfigured()) {
    return res.redirect(`${FRONTEND}/login?error=linkedin_not_configured`);
  }
  const state = crypto.randomBytes(16).toString("hex");
  req.session.linkedInOAuthState = state;

  const params = new URLSearchParams({
    response_type: "code",
    client_id: process.env.LINKEDIN_CLIENT_ID as string,
    redirect_uri: linkedinCallbackUrl(),
    scope: "openid profile email",
    state,
  });

  res.redirect(`https://www.linkedin.com/oauth/v2/authorization?${params}`);
});

router.get(
  "/linkedin/callback",
  async (req: Request, res: Response, next: NextFunction) => {
    const { code, state, error } = req.query;

    if (error || typeof code !== "string") {
      return res.redirect(`${FRONTEND}/login?error=linkedin_failed`);
    }
    const expectedState = req.session.linkedInOAuthState;
    delete req.session.linkedInOAuthState;
    if (!expectedState || state !== expectedState) {
      return res.redirect(`${FRONTEND}/login?error=linkedin_state`);
    }

    if (!linkedinConfigured()) {
      return res.redirect(`${FRONTEND}/login?error=linkedin_not_configured`);
    }

    try {
      const tokenRes = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code,
          redirect_uri: linkedinCallbackUrl(),
          client_id: process.env.LINKEDIN_CLIENT_ID as string,
          client_secret: process.env.LINKEDIN_CLIENT_SECRET as string,
        }),
      });

      const tokenPayload = await tokenRes.json();
      const accessToken = tokenPayload.access_token as string | undefined;
      if (!accessToken || !tokenRes.ok) {
        console.error("LinkedIn token error:", tokenPayload);
        return res.redirect(`${FRONTEND}/login?error=linkedin_failed`);
      }

      const profileRes = await fetch("https://api.linkedin.com/v2/userinfo", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      const profile = (await profileRes.json()) as {
        sub?: string;
        email?: string;
        name?: string;
        picture?: string;
      };

      if (!profileRes.ok || !profile.sub || !profile.email) {
        console.error("LinkedIn profile error:", profile);
        return res.redirect(`${FRONTEND}/login?error=linkedin_failed`);
      }

      const user = await findOrCreateOAuthUser(db, {
        email: profile.email,
        name: profile.name || "User",
        provider: "linkedin",
        providerId: profile.sub,
        picture: profile.picture ?? null,
      });

      req.login(user as Express.User, (err) => {
        if (err) return next(err);
        return res.redirect(`${FRONTEND}/`);
      });
    } catch (e) {
      next(e);
    }
  }
);

router.get("/status", (req: Request, res: Response) => {
  res.json({
    authenticated: req.isAuthenticated(),
    user:
      req.user ?
        {
          id: req.user.id,
          email: req.user.email,
          name: req.user.name,
          picture: req.user.picture,
        }
      : null,
  });
});

router.get("/me", isAuthenticated, (req: Request, res: Response) => {
  res.json({ user: req.user });
});

router.post("/logout", (req: Request, res: Response, next: NextFunction) => {
  req.logout((err) => {
    if (err) return next(err);
    res.json({ ok: true });
  });
});

export default router;
