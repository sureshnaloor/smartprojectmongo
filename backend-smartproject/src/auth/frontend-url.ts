/**
 * Post-auth redirect target for OAuth / bypass.
 *
 * - `npm run start` (production): backend serves `frontend-smartproject/dist` on BASE_URL
 *   → redirect must stay on BASE_URL, not Vite (:5173).
 * - `npm run dev` + Vite: SPA on :5173, API on :8080 → FRONTEND_URL=http://localhost:5173
 */
export function resolveFrontendUrl(): string {
  const base = (process.env.BASE_URL || "http://localhost:8080").replace(/\/$/, "");
  const configured = process.env.FRONTEND_URL?.trim().replace(/\/$/, "");

  if (process.env.NODE_ENV === "production") {
    // Common misconfiguration: FRONTEND_URL still points at Vite while SPA is served from BASE_URL.
    if (!configured || /:5173(\/|$)/.test(configured)) {
      return base;
    }
    return configured;
  }

  return configured || "http://localhost:5173";
}

/** True when FRONTEND_URL is a different origin than BASE_URL (split deploy). */
export function isExternalFrontend(): boolean {
  const configured = process.env.FRONTEND_URL?.trim();
  const base = process.env.BASE_URL?.trim();
  if (!configured || !base) return false;
  try {
    return new URL(configured).origin !== new URL(base).origin;
  } catch {
    return false;
  }
}

/** Path to send the browser after login — relative when SPA is on the same server. */
export function postAuthRedirectPath(path = "/"): string {
  if (process.env.NODE_ENV === "production" && !isExternalFrontend()) {
    return path.startsWith("/") ? path : `/${path}`;
  }
  const base = resolveFrontendUrl();
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}
