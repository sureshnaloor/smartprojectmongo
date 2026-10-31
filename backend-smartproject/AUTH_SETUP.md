# Authentication Setup Guide

This project supports Google and LinkedIn OAuth authentication. Email/password authentication will be added later.

## Environment Variables

Add the following environment variables to your `.env` file:

```env
# Session Configuration
SESSION_SECRET=your-secret-key-change-in-production

# Base URL (for OAuth callbacks)
BASE_URL=http://localhost:8080

# Frontend URL (where Vite dev server runs)
FRONTEND_URL=http://localhost:8080

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:8080/api/auth/google/callback

# LinkedIn OAuth
LINKEDIN_CLIENT_ID=your-linkedin-client-id
LINKEDIN_CLIENT_SECRET=your-linkedin-client-secret
LINKEDIN_CALLBACK_URL=http://localhost:8080/api/auth/linkedin/callback

# Admin roles (comma-separated emails; roles re-sync on every login)
# Full app admins — can amend projects + everything below
ADMIN_EMAILS=owner@yourcompany.com
# Demo-request admins — access to /admin/demo-requests and its API only
DEMO_REQUEST_ADMIN_EMAILS=sales@yourcompany.com
```

## Setting up Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google+ API
4. Go to "Credentials" → "Create Credentials" → "OAuth client ID"
5. Choose "Web application"
6. Add authorized redirect URIs:
   - `http://localhost:8080/api/auth/google/callback` (for development)
   - `https://yourdomain.com/api/auth/google/callback` (for production)
7. Copy the Client ID and Client Secret to your `.env` file

## Setting up LinkedIn OAuth

1. Go to [LinkedIn Developers](https://www.linkedin.com/developers/)
2. Create a new app
3. **Enable OpenID Connect Product:**
   - Go to your app's "Products" tab
   - Find "Sign In with LinkedIn using OpenID Connect"
   - Click "Request access" or "Add product"
   - This enables the new scopes: `openid`, `profile`, `email`
4. In the "Auth" tab, add redirect URLs:
   - `http://localhost:8080/api/auth/linkedin/callback` (for development)
   - `https://yourdomain.com/api/auth/linkedin/callback` (for production)
5. Copy the Client ID and Client Secret to your `.env` file

**Note:** LinkedIn deprecated the old `r_emailaddress` and `r_liteprofile` scopes. The app now uses OpenID Connect scopes: `openid`, `profile`, `email`.

## User Roles

Every account gets a `role` stored on its `users` document. Roles are resolved from the email env vars above and **re-synced on every login**, so adding or removing an email takes effect the next time that user signs in. Sessions re-read the role from the database on each request, so changes apply without waiting for sessions to expire.

| Role | How it's assigned | Access |
| --- | --- | --- |
| `admin` | `ADMIN_EMAILS` env var, or the local bypass account (`dev@example.com`) | Everything, including project amendments and the demo-requests admin panel |
| `demorequest-admin` | `DEMO_REQUEST_ADMIN_EMAILS` env var | Demo-requests admin panel (`/admin/demo-requests`) and `GET/PATCH/DELETE /api/demo-requests` only — no project amendment or other admin powers |
| `user` | Default for everyone else | Standard app features |

Notes:

- Full `admin` users implicitly have demo-request access (the API accepts either `admin` or `demorequest-admin`).
- The local dev bypass (`GET /api/auth/bypass`, email `dev@example.com`) is always `admin` so amendments can be tested without env setup.
- Demo requests from the landing page are captured by the public endpoint `POST /api/demo-requests` (no auth required) into the `demoRequests` MongoDB collection, tagged with `interest: demo \| trial \| sales`.

## API Endpoints

- `GET /api/auth/google` - Initiate Google OAuth
- `GET /api/auth/google/callback` - Google OAuth callback
- `GET /api/auth/linkedin` - Initiate LinkedIn OAuth
- `GET /api/auth/linkedin/callback` - LinkedIn OAuth callback
- `GET /api/auth/me` - Get current user (requires authentication)
- `GET /api/auth/status` - Check authentication status
- `POST /api/auth/logout` - Logout user

## Frontend Usage

The frontend includes:
- `AuthProvider` - Context provider for authentication state
- `useAuth()` - Hook to access auth state and methods
- `ProtectedRoute` - Component to protect routes
- `/login` - Login page with Google and LinkedIn buttons

Example usage:

```tsx
import { useAuth } from "@/contexts/auth-context";
import { ProtectedRoute } from "@/components/auth/protected-route";

function MyComponent() {
  const { user, authenticated, login, logout } = useAuth();
  
  return (
    <ProtectedRoute>
      <div>Welcome, {user?.name}!</div>
    </ProtectedRoute>
  );
}
```

## Database

The `users` table is automatically created when you run `npm run db:push`. It stores:
- `id` - Primary key
- `email` - User email (unique)
- `name` - User display name
- `picture` - Profile picture URL
- `provider` - OAuth provider (google, linkedin, email)
- `providerId` - Provider-specific user ID
- `role` - `admin` | `demorequest-admin` | `user` (see User Roles above)
- `createdAt` - Account creation timestamp
- `updatedAt` - Last update timestamp



