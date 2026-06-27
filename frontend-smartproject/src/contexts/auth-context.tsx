import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export interface User {
  id: number;
  email: string;
  name: string;
  picture?: string | null;
  provider: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  authenticated: boolean;
  login: (provider: "google" | "linkedin" | "bypass") => void;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  const checkAuth = async () => {
    try {
      const response = await fetch("/api/auth/status", {
        credentials: "include",
      });
      
      if (!response.ok) {
        console.error("Auth status check failed:", response.status, response.statusText);
        setUser(null);
        setAuthenticated(false);
        setLoading(false);
        return;
      }
      
      const data = await response.json();
      
      if (data.authenticated && data.user) {
        setUser(data.user);
        setAuthenticated(true);
      } else {
        setUser(null);
        setAuthenticated(false);
      }
    } catch (error) {
      console.error("Auth check failed:", error);
      setUser(null);
      setAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  const login = (provider: "google" | "linkedin" | "bypass") => {
    // OAuth callback runs on the backend (8080). Start the flow there so the session
    // cookie is set on the same host; after auth the backend redirects to FRONTEND_URL.
    const backendOrigin =
      import.meta.env.VITE_BACKEND_URL ||
      (import.meta.env.DEV ? "http://localhost:8080" : window.location.origin);
    window.location.href = `${backendOrigin}/api/auth/${provider}`;
  };

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
      setUser(null);
      setAuthenticated(false);
      window.location.href = "/login";
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  useEffect(() => {
    // Initial auth check
    checkAuth();
    
    // Also check auth when the page becomes visible (in case of tab switching)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkAuth();
      }
    };
    
    // Check auth on focus (user switches back to tab)
    const handleFocus = () => {
      checkAuth();
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        authenticated,
        login,
        logout,
        checkAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}



