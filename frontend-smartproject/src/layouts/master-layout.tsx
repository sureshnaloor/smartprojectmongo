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

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Toaster position="top-right" />
      {/* Top Navigation - Fixed */}
      <SharedNavigation variant="app" />

      <div className="flex flex-1" style={{ minHeight: 'calc(100vh - 4rem)', paddingTop: '4rem' }}>
        <div className="flex flex-1">
          {/* Left Sidebar Navigation - Show global navigation for master pages */}
          <SideNavigation currentProjectId={projectId} />

          {/* Main Content Area - min-w-0 allows flex child to shrink and stay within container */}
          <main className="flex-1 flex flex-col min-w-0">
            <div className="flex-1">
              {children}
            </div>
          </main>
        </div>
      </div>

      <footer className="border-t border-gray-200 bg-gray-100/90 text-xs text-gray-500">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-center gap-2">
          <img src="/smartproject.png" alt="ConstructPro Logo" className="h-4 w-auto" />
          <span>© {new Date().getFullYear()} ConstructPro. All rights reserved.</span>
        </div>
      </footer>
    </div>
  );
} 