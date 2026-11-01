import { useEffect, useState } from "react";
import * as React from "react";
import { useAuth } from "@/contexts/auth-context";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { ChevronDown, Inbox, Loader2, LogOut } from "lucide-react";

interface UserProfileProps {
  variant?: "dark" | "light";
}

export function UserProfile({ variant = "dark" }: UserProfileProps) {
  const { user, loading, authenticated, checkAuth, logout } = useAuth();
  const isLight = variant === "light";

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
      <div
        className={`flex items-center gap-2 ${
          isLight ? "text-slate-700" : "text-slate-100"
        }`}
      >
        <div
          className={`h-8 w-8 rounded-full flex items-center justify-center ${
            isLight ? "bg-slate-100" : "bg-slate-700"
          }`}
        >
          <Loader2
            className={`h-4 w-4 animate-spin ${
              isLight ? "text-epcPrimary" : "text-slate-200"
            }`}
          />
        </div>
      </div>
    );
  }

  // Show user info if available
  if (user) {
    const [, setIsHovered] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const hoverTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

    const handleMouseEnter = () => {
      setIsHovered(true);
      setShowMenu(true);
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
        hoverTimeoutRef.current = null;
      }
    };

    const handleMouseLeave = () => {
      setIsHovered(false);
      hoverTimeoutRef.current = setTimeout(() => {
        setShowMenu(false);
      }, 2000);
    };

    const handleMenuMouseEnter = () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
        hoverTimeoutRef.current = null;
      }
      setShowMenu(true);
    };

    const handleMenuMouseLeave = () => {
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

    const firstName = user.name ? user.name.split(" ")[0] : "User";

    return (
      <div
        className="relative shrink-0"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <button
          type="button"
          className={`flex items-center gap-2 rounded-full transition-all cursor-pointer focus:outline-none ${
            isLight
              ? "pl-1 pr-2.5 py-1 bg-slate-50 hover:bg-slate-100 border border-slate-200/90 text-ink"
              : "hover:opacity-80 text-slate-100"
          }`}
        >
          <Avatar
            className={`h-7 w-7 ${
              isLight
                ? "border border-epcPrimary/20"
                : "h-8 w-8 border-2 border-slate-200"
            }`}
          >
            {user.picture ? (
              <AvatarImage
                src={user.picture}
                alt={user.name}
                className="object-cover"
              />
            ) : null}
            <AvatarFallback className="bg-epcPrimary text-white text-xs font-semibold">
              {getInitials(user.name)}
            </AvatarFallback>
          </Avatar>
          <span
            className={`text-[13px] font-medium whitespace-nowrap hidden sm:block ${
              isLight ? "text-slate-700" : "text-slate-100"
            }`}
          >
            {isLight ? firstName : user.name}
          </span>
          {isLight && (
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          )}
        </button>

        {/* Hover Menu */}
        {showMenu && (
          <div
            className="absolute right-0 top-full mt-2 w-52 bg-white rounded-lg shadow-xl border border-slate-200 py-1.5 z-50"
            onMouseEnter={handleMenuMouseEnter}
            onMouseLeave={handleMenuMouseLeave}
          >
            <div className="px-4 py-2 border-b border-slate-100">
              <p className="text-xs font-semibold text-slate-800 truncate">
                {user.name}
              </p>
              {user.email && (
                <p className="text-[11px] text-slate-500 truncate">
                  {user.email}
                </p>
              )}
            </div>
            {(user.role === "admin" || user.role === "demorequest-admin") && (
              <a
                href="/admin/demo-requests"
                className="w-full text-left px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors"
              >
                <Inbox className="h-3.5 w-3.5 text-epcPrimary" />
                Demo Requests
              </a>
            )}
            <button
              type="button"
              onClick={() => {
                setShowMenu(false);
                logout();
              }}
              className="w-full text-left px-4 py-2 text-xs font-medium text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign Out
            </button>
          </div>
        )}
      </div>
    );
  }

  // Fallback if no user
  return (
    <div
      className={`flex items-center gap-2 ${
        isLight ? "text-slate-700" : "text-slate-100"
      }`}
    >
      <div
        className={`h-7 w-7 rounded-full flex items-center justify-center ${
          isLight ? "bg-slate-200" : "bg-slate-700"
        }`}
      >
        <span
          className={`text-xs ${
            isLight ? "text-slate-600" : "text-slate-200"
          }`}
        >
          ?
        </span>
      </div>
      <span
        className={`text-xs font-medium hidden md:block ${
          isLight ? "text-slate-600" : "text-slate-200"
        }`}
      >
        Guest
      </span>
    </div>
  );
}
