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
- `createdAt` - Account creation timestamp
- `updatedAt` - Last update timestamp



