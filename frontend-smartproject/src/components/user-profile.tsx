import { useEffect, useState } from "react";
import * as React from "react";
import { useAuth } from "@/contexts/auth-context";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Loader2, LogOut } from "lucide-react";

export function UserProfile() {
  const { user, loading, authenticated, checkAuth, logout } = useAuth();


  // Re-check auth if we have authenticated=true but no user (edge case)
  useEffect(() => {
    if (authenticated && !user && !loading) {
      console.log("⚠️ Authenticated but no user data, re-checking auth...");
      checkAuth();
    }
  }, [authenticated, user, loading, checkAuth]);

  // Get initials from name
  const getInitials = (name: string) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  // Show loading state
  if (loading) {
    return (
      <div className="flex items-center gap-2 text-slate-100">
        <div className="h-8 w-8 rounded-full bg-slate-700 flex items-center justify-center">
          <Loader2 className="h-4 w-4 animate-spin text-slate-200" />
        </div>
        <span className="text-sm font-medium hidden md:block text-slate-200">
          Loading...
        </span>
      </div>
    );
  }

  // Show user info if available
  if (user) {
    const [isHovered, setIsHovered] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const hoverTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

    const handleMouseEnter = () => {
      setIsHovered(true);
      setShowMenu(true);
      // Clear any existing timeout
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
        hoverTimeoutRef.current = null;
      }
    };

    const handleMouseLeave = () => {
      setIsHovered(false);
      // Delay hiding the menu by 2 seconds to allow clicking
      hoverTimeoutRef.current = setTimeout(() => {
        setShowMenu(false);
      }, 2000);
    };

    const handleMenuMouseEnter = () => {
      // Keep menu visible when hovering over it
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
        hoverTimeoutRef.current = null;
      }
      setShowMenu(true);
    };

    const handleMenuMouseLeave = () => {
      // Delay hiding when leaving menu
      hoverTimeoutRef.current = setTimeout(() => {
        setShowMenu(false);
      }, 2000);
    };

    React.useEffect(() => {
      return () => {
        if (hoverTimeoutRef.current) {
          clearTimeout(hoverTimeoutRef.current);
        }
      };
    }, []);

    return (
      <div 
        className="relative"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <button className="flex items-center gap-2 hover:opacity-80 transition-opacity cursor-pointer focus:outline-none">
          <Avatar className="h-8 w-8 border-2 border-slate-200">
            {user.picture ? (
              <AvatarImage src={user.picture} alt={user.name} className="object-cover" />
            ) : null}
            <AvatarFallback className="bg-primary-600 text-white text-sm font-semibold">
              {getInitials(user.name)}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm font-medium hidden md:block text-slate-100">
            {user.name}
          </span>
        </button>
        
        {/* Hover Menu */}
        {showMenu && (
          <div 
            className="absolute right-0 top-full mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 py-1 z-50"
            onMouseEnter={handleMenuMouseEnter}
            onMouseLeave={handleMenuMouseLeave}
          >
            <button
              onClick={() => {
                setShowMenu(false);
                logout();
              }}
              className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </button>
          </div>
        )}
      </div>
    );
  }

  // Fallback if no user (shouldn't happen if authenticated, but just in case)
  return (
    <div className="flex items-center gap-2 text-slate-100">
      <div className="h-8 w-8 rounded-full bg-slate-700 flex items-center justify-center">
        <span className="text-xs text-slate-200">?</span>
      </div>
      <span className="text-sm font-medium hidden md:block text-slate-200">
        Guest
      </span>
    </div>
  );
}

