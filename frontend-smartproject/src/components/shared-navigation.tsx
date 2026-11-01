import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/auth-context";
import { UserProfile } from "@/components/user-profile";
import { Button } from "@/components/ui/button";
import {
  ArrowUpRight,
  ArrowRight,
  Compass,
  Layers,
  Mail,
  Phone,
  Menu,
  X,
} from "lucide-react";
import {
  AppWorkbenchNav,
  AppWorkbenchNavMobile,
} from "@/components/app-workbench-nav";

interface SharedNavigationProps {
  variant?: "landing" | "app";
}

const landingNavItems = [
  { label: "Overview", href: "#overview" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "Capabilities", href: "#features" },
  { label: "Showcase", href: "#showcase" },
  { label: "Live Demo", href: "#demo" },
  { label: "ROI", href: "#roi" },
  { label: "FAQ", href: "#faq" },
];

export const SharedNavigation: React.FC<SharedNavigationProps> = ({
  variant = "app",
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [location, setLocation] = useLocation();
  const { authenticated, login } = useAuth();

  useEffect(() => {
    const handleScroll = () => {
      const compact = window.scrollY > 40;
      setIsScrolled(compact);

      const root = document.documentElement;
      if (compact) {
        root.classList.add("header-compact");
      } else {
        root.classList.remove("header-compact");
      }
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleSmoothScroll = (
    e: React.MouseEvent<HTMLAnchorElement>,
    targetId: string
  ) => {
    if (variant === "landing" && location === "/") {
      e.preventDefault();
      const targetElement = document.querySelector(targetId);
      if (targetElement) {
        const offsetTop =
          targetElement.getBoundingClientRect().top + window.scrollY - 84;
        window.scrollTo({
          top: offsetTop,
          behavior: "smooth",
        });
      }
      setMobileMenuOpen(false);
    }
  };

  const handleNavClick = (path: string) => {
    setLocation(path);
    setMobileMenuOpen(false);
  };

  const isLanding = variant === "landing";
  const testbenchHref = authenticated ? "/newlanding" : "/login";

  if (isLanding) {
    return (
      <>
        {/* EPCORA Stack TopBar */}
        <div className="bg-ink text-white/80 text-xs border-b border-white/10">
          <div className="max-w-[1380px] mx-auto px-4 sm:px-6 lg:px-8 h-9 flex items-center justify-between">
            <div className="hidden md:flex items-center gap-6">
              <span className="inline-flex items-center gap-2 text-gold font-display font-semibold tracking-wider uppercase text-[11px]">
                <Layers className="w-3.5 h-3.5" />
                EPCORA Stack Product Suite · Enterprise Project Controls
              </span>
              <a
                href="mailto:info@epcorastack.com"
                className="flex items-center gap-1.5 text-[11.5px] text-white/75 hover:text-gold transition-colors"
              >
                <Mail className="w-3.5 h-3.5 text-gold" />
                <span>info@epcorastack.com</span>
              </a>
            </div>
            <div className="flex items-center gap-4 ml-auto text-[11.5px]">
              <a
                href="tel:+18005550199"
                className="hidden sm:flex items-center gap-1.5 text-white/75 hover:text-gold transition-colors"
              >
                <Phone className="w-3.5 h-3.5 text-gold" />
                <span>+1 (800) 555-0199</span>
              </a>
              <span className="hidden sm:inline text-white/25">|</span>
              <a
                href={testbenchHref}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gold hover:underline font-medium flex items-center gap-1 whitespace-nowrap"
              >
                <span>Open Project Testbench</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>

        {/* Sticky Main Header */}
        <header
          className={`sticky top-0 z-50 transition-all duration-300 ${
            isScrolled
              ? "bg-white/95 backdrop-blur-md shadow-[0_4px_24px_-6px_rgba(7,78,132,0.12)] border-b border-slate-200/80"
              : "bg-white border-b border-slate-200/80"
          }`}
        >
          <div className="max-w-[1380px] mx-auto px-4 sm:px-6 lg:px-8 h-[76px] flex items-center justify-between gap-6">
            {/* Brand Logo Lockup */}
            <button
              type="button"
              onClick={() => {
                if (location !== "/") handleNavClick("/");
                else window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className="flex items-center gap-3 text-left group shrink-0 border-0 bg-transparent cursor-pointer focus:outline-none"
            >
              <img
                src="/smartproject-logo.svg"
                alt="SmartProject by EPCORA Stack"
                className="w-10 h-10 shrink-0 transition-transform duration-300 group-hover:scale-105"
              />
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="font-display font-extrabold text-[20px] tracking-[-0.02em] text-ink leading-none">
                    Smart<span className="text-epcPrimary">Project</span>
                  </span>
                  <span className="hidden sm:inline-block text-[9.5px] font-display font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-gold/25 text-ink border border-gold/50 leading-none">
                    v2.5
                  </span>
                </div>
                <span className="text-[10px] font-sans font-semibold uppercase tracking-[0.12em] text-slate-500 mt-1 whitespace-nowrap">
                  by <span className="text-epcSecondary">EPCORA Stack</span>
                </span>
              </div>
            </button>

            {/* Desktop Nav Links — Single-Line, Airy Spacing & Animated Underline */}
            <nav className="hidden lg:flex items-center gap-6 xl:gap-8">
              {landingNavItems.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  onClick={(e) => handleSmoothScroll(e, item.href)}
                  className="relative py-2 font-sans text-[14px] font-medium tracking-[0.01em] text-slate-700 hover:text-epcPrimary transition-colors whitespace-nowrap after:content-[''] after:absolute after:left-0 after:bottom-0 after:h-[2px] after:w-0 after:bg-gold hover:after:w-full after:transition-all after:duration-200"
                >
                  {item.label}
                </a>
              ))}
            </nav>

            {/* Desktop CTA & Auth */}
            <div className="hidden lg:flex items-center gap-3 shrink-0">
              <a
                href={testbenchHref}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-gold !py-2 !px-4 !text-[12px] shadow-sm inline-flex items-center gap-1.5 rounded-md font-display font-bold uppercase tracking-wider whitespace-nowrap"
              >
                <Compass className="w-3.5 h-3.5 shrink-0" />
                <span>Project Testbench</span>
                <ArrowUpRight className="w-3.5 h-3.5 shrink-0" />
              </a>

              {authenticated ? (
                <div className="flex items-center pl-2.5 border-l border-slate-200">
                  <UserProfile variant="light" />
                </div>
              ) : (
                <div className="flex items-center gap-2 pl-2.5 border-l border-slate-200">
                  <button
                    type="button"
                    onClick={() => handleNavClick("/login")}
                    className="btn-epc-primary !py-2 !px-3.5 !text-[12px] rounded-md whitespace-nowrap"
                  >
                    Sign In
                  </button>
                  <button
                    type="button"
                    onClick={() => login("google")}
                    className="font-display text-[12px] font-bold uppercase tracking-wider px-3.5 py-2 rounded-md border border-epcPrimary text-epcPrimary hover:bg-epcPrimary hover:text-white transition-colors whitespace-nowrap"
                  >
                    Sign Up
                  </button>
                </div>
              )}
            </div>

            {/* Mobile Hamburger Button */}
            <button
              type="button"
              className="lg:hidden p-2 text-ink hover:text-epcPrimary"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Menu"
            >
              {mobileMenuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="lg:hidden bg-white border-t border-line px-4 pt-3 pb-6 space-y-1.5 shadow-lg">
              {landingNavItems.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  onClick={(e) => handleSmoothScroll(e, item.href)}
                  className="block py-2.5 font-sans text-sm font-medium text-slate-700 hover:text-epcPrimary border-b border-slate-100"
                >
                  {item.label}
                </a>
              ))}
              <div className="pt-3 flex flex-col gap-2.5">
                <a
                  href={testbenchHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setMobileMenuOpen(false)}
                  className="btn-gold w-full justify-center !py-2.5 inline-flex items-center gap-2 rounded-md font-display uppercase tracking-wider text-xs"
                >
                  <Compass className="w-4 h-4" />
                  <span>Project Testbench</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </a>

                {authenticated ? (
                  <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                    <span className="text-xs text-slate-500">Signed in as</span>
                    <UserProfile variant="light" />
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <Button
                      variant="outline"
                      onClick={() => handleNavClick("/login")}
                      className="w-full"
                    >
                      Sign In
                    </Button>
                    <Button
                      onClick={() => login("google")}
                      variant="default"
                      className="w-full bg-epcPrimary hover:bg-epcSecondary"
                    >
                      Sign Up
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </header>
      </>
    );
  }

  // App Workbench Variant (inner application pages)
  return (
    <nav className="cp-topnav">
      <div className="mx-auto flex h-full max-w-[1600px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 flex-1 items-center gap-3 lg:gap-5">
          <button
            type="button"
            className="cp-topnav-brand flex shrink-0 cursor-pointer items-center gap-2.5 border-0 bg-transparent"
            onClick={() => handleNavClick("/")}
          >
            <img
              src="/smartproject-logo-dark.svg"
              alt="SmartProject"
              className="h-7 w-7"
            />
            <span className="font-display font-extrabold tracking-tight">
              Smart<span className="text-[#FCBC45]">Project</span>
            </span>
          </button>
          <AppWorkbenchNav className="hidden md:flex" />
        </div>

        <div className="hidden shrink-0 items-center gap-4 md:flex">
          <a
            href={testbenchHref}
            target="_blank"
            rel="noopener noreferrer"
            className="cp-topnav-link flex items-center gap-1.5 font-semibold text-[#FCBC45] hover:text-[#FFD26A]"
          >
            <span>Project testbench</span>
            <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={1.5} />
          </a>

          {authenticated ? (
            <div className="flex items-center gap-4 border-l border-[var(--border-dark)] pl-4">
              <UserProfile variant="dark" />
            </div>
          ) : (
            <div className="flex items-center gap-3 border-l border-[var(--border-dark)] pl-4">
              <Button
                variant="outline"
                onClick={() => handleNavClick("/login")}
                className="border-[var(--navy-700)] bg-transparent text-[var(--text-on-dark)] hover:bg-[var(--navy-800)]"
              >
                Sign In
              </Button>
              <Button onClick={() => login("google")} variant="default">
                Sign Up
              </Button>
            </div>
          )}
        </div>

        <div className="md:hidden">
          <button
            type="button"
            className="text-[var(--text-on-dark-muted)] hover:text-[var(--text-on-dark)]"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Menu"
          >
            <svg
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Menu for App Variant */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-t border-gray-200 px-4 py-4">
          <div className="space-y-3">
            <a
              href={testbenchHref}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setMobileMenuOpen(false)}
              className="block w-full text-left py-2 text-epcPrimary font-semibold flex items-center gap-1.5"
            >
              <span>Project testbench</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </a>
            <div className="rounded-lg bg-slate-900 p-3 -mx-1">
              <AppWorkbenchNavMobile />
            </div>

            <div className="pt-4 border-t border-gray-200">
              {authenticated ? (
                <div className="flex items-center gap-2">
                  <UserProfile variant="light" />
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <Button
                    variant="outline"
                    onClick={() => handleNavClick("/login")}
                    className="w-full border-gray-300 text-gray-700 hover:bg-gray-50"
                  >
                    Sign In
                  </Button>
                  <Button
                    onClick={() => login("google")}
                    variant="default"
                    className="w-full"
                  >
                    Sign Up
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};
