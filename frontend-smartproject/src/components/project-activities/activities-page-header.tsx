import { useLocation } from "wouter";
import { Search, Upload, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { ACTIVITY_CATALOG_TABS, type ActivityCatalogTab } from "./constants";

interface ActivitiesPageHeaderProps {
  projectId: string;
  projectName?: string;
  activeTab: ActivityCatalogTab;
  onTabChange: (tab: ActivityCatalogTab) => void;
  globalCount?: number;
  projectCount?: number;
  customCount?: number;
  search: string;
  onSearchChange: (v: string) => void;
  onImportCsv: () => void;
  onRefresh: () => void;
  refreshing?: boolean;
}

export function ActivitiesPageHeader({
  projectId,
  projectName,
  activeTab,
  onTabChange,
  globalCount,
  projectCount,
  customCount,
  search,
  onSearchChange,
  onImportCsv,
  onRefresh,
  refreshing,
}: ActivitiesPageHeaderProps) {
  const [, setLocation] = useLocation();

  const counts: Record<ActivityCatalogTab, number | undefined> = {
    global: globalCount,
    project: projectCount,
    custom: customCount,
  };

  return (
    <div className="bg-[var(--bg-cream)] px-6 pb-5 pt-6 lg:px-8">
      <p className="mb-2 kanban-body-sm text-[var(--text-secondary)]">
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
        <span className="text-[var(--text-primary)]">Activities</span>
      </p>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="hse-display-md text-[var(--text-primary)]">Activities</h1>
          <div
            className="mt-3 inline-flex flex-wrap gap-1.5 rounded-full p-1"
            style={{ backgroundColor: "var(--bg-warm-gray)" }}
          >
            {ACTIVITY_CATALOG_TABS.map((tab) => {
              const isActive = activeTab === tab.key;
              const count = counts[tab.key];
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => onTabChange(tab.key)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full px-4 py-2 kanban-body-sm font-medium transition-all",
                    isActive
                      ? "bg-[var(--bg-white)] text-[var(--text-primary)] shadow-[var(--shadow-sm)]"
                      : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  )}
                >
                  {tab.label}
                  {count != null && (
                    <span
                      className="flex h-5 min-w-5 items-center justify-center rounded-full px-1 kanban-caption font-semibold"
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
          <Button variant="outline" size="sm" className="gap-1.5" onClick={onImportCsv}>
            <Upload className="h-4 w-4" />
            Import CSV
          </Button>
          <Button variant="ghost" size="sm" className="gap-1.5" onClick={onRefresh} disabled={refreshing}>
            <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
            Refresh
          </Button>
          <div className="relative w-full sm:w-[240px]">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
            <Input
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search activities…"
              className="h-9 pl-9"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
