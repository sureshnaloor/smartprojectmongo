import { useLocation } from "wouter";
import { Search, Upload, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { MSR_TABS, type MsrTabKey } from "./constants";

interface MsrPageHeaderProps {
  projectId: string;
  projectName?: string;
  activeTab: MsrTabKey;
  materialsCount?: number;
  servicesCount?: number;
  search: string;
  onSearchChange: (v: string) => void;
  onBulkUpload: () => void;
  onRefresh: () => void;
  refreshing?: boolean;
  bulkDisabled?: boolean;
  hideBulkUpload?: boolean;
}

export function MsrPageHeader({
  projectId,
  projectName,
  activeTab,
  materialsCount,
  servicesCount,
  search,
  onSearchChange,
  onBulkUpload,
  onRefresh,
  refreshing,
  bulkDisabled,
  hideBulkUpload,
}: MsrPageHeaderProps) {
  const [, setLocation] = useLocation();

  return (
    <div className="bg-[var(--bg-cream)] pb-5 px-6 lg:px-8 pt-6">
      <p className="msr-meta mb-2">
        <button type="button" className="hover:text-[var(--text-primary)]" onClick={() => setLocation("/")}>
          Projects
        </button>
        {" / "}
        <button
          type="button"
          className="hover:text-[var(--text-primary)]"
          onClick={() => setLocation(`/projects/${projectId}`)}
        >
          {projectName ?? "Project"}
        </button>
        {" / "}
        <span className="text-[var(--text-primary)]">Materials &amp; Resources</span>
      </p>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="msr-panel-title text-[var(--text-primary)]">Materials &amp; Resources</h1>
          <div
            className="mt-3 inline-flex flex-wrap gap-1.5 rounded-full p-1"
            style={{ backgroundColor: "var(--bg-warm-gray)" }}
          >
            {MSR_TABS.map((tab) => {
              const isActive = activeTab === tab.key;
              const count =
                tab.key === "materials" ? materialsCount : tab.key === "services" ? servicesCount : undefined;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setLocation(tab.href(projectId))}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full px-4 py-2 msr-meta font-medium transition-all",
                    isActive
                      ? "bg-[var(--bg-white)] text-[var(--text-primary)] shadow-[var(--shadow-sm)]"
                      : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  )}
                >
                  {tab.label}
                  {count != null && (
                    <span
                      className="flex h-5 min-w-5 items-center justify-center rounded-full px-1 msr-badge font-semibold"
                      style={{ backgroundColor: "var(--bg-warm-gray)" }}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {!hideBulkUpload && (
            <Button variant="outline" size="sm" className="gap-1.5" onClick={onBulkUpload} disabled={bulkDisabled}>
              <Upload className="h-4 w-4" />
              Bulk Upload CSV
            </Button>
          )}
          <Button variant="ghost" size="sm" className="gap-1.5" onClick={onRefresh} disabled={refreshing}>
            <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
            Refresh
          </Button>
          <div className="relative w-full sm:w-[240px]">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
            <Input
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={
                activeTab === "materials"
                  ? "Search materials..."
                  : activeTab === "services"
                    ? "Search services..."
                    : "Search resources..."
              }
              className="h-9 pl-9"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
