import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { SideNavigation } from "@/components/project/side-navigation";
import { useMobile } from "@/hooks/use-mobile";
import { Toaster } from "sonner";
import { SharedNavigation } from "@/components/shared-navigation";

interface MasterLayoutProps {
  children: React.ReactNode;
  projectId?: number;
}

export default function MasterLayout({ children, projectId }: MasterLayoutProps) {
  const isMobile = useMobile();
  const [isSidebarOpen, setIsSidebarOpen] = useState(!isMobile);
  const [, setLocation] = useLocation();

  return (
    <div className="cp-app-shell">
      <Toaster position="top-right" />
      <SharedNavigation variant="app" />

      <div className="cp-app-main">
        <div className="flex min-h-0 min-w-0 flex-1">
          <SideNavigation currentProjectId={projectId} />

          <main className="cp-app-content">
            <div className="flex min-h-0 flex-1 flex-col overflow-auto">
              {children}
            </div>
          </main>
        </div>
      </div>

      <footer className="cp-app-footer">
        <div className="mx-auto flex max-w-7xl items-center justify-center gap-2 px-4 py-3">
          <img src="/smartproject-logo.svg" alt="SmartProject Logo" className="h-4 w-4 opacity-85" />
          <span>© {new Date().getFullYear()} SmartProject · An EPCORA Stack Product. All rights reserved.</span>
        </div>
      </footer>
    </div>
  );
}
