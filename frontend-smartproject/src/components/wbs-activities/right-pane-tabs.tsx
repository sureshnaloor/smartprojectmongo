import { cn } from "@/lib/utils";
import { RIGHT_PANE_TABS, type WbsActivitiesRightTab } from "./constants";

interface RightPaneTabsProps {
  activeTab: WbsActivitiesRightTab;
  onTabChange: (tab: WbsActivitiesRightTab) => void;
  resourceCount?: number;
}

export function RightPaneTabs({ activeTab, onTabChange, resourceCount }: RightPaneTabsProps) {
  return (
    <div className="sticky top-0 z-10 border-b border-[var(--border-subtle)] bg-[var(--bg-cream)] px-6">
      <nav className="cp-tabs-underline">
        {RIGHT_PANE_TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          const count = tab.countKey === "resources" && resourceCount != null ? resourceCount : null;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => onTabChange(tab.key)}
              className={cn("cp-tab-underline", isActive && "cp-tab-underline--active")}
            >
              {tab.label}
              {count != null && count > 0 && (
                <span className="ml-1 cp-body-sm text-[var(--text-muted)]">· {count}</span>
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
