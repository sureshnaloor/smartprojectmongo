import { useParams, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { DOCUMENT_TABS } from "./constants";

interface DocumentCategoryTabsProps {
  activeKey?: string;
}

export function DocumentCategoryTabs({ activeKey }: DocumentCategoryTabsProps) {
  const { projectId } = useParams();
  const [location, setLocation] = useLocation();
  const pid = parseInt(projectId ?? "0", 10);

  return (
    <div
      className="sticky top-0 z-10 border-b bg-[var(--bg-white)]"
      style={{ borderColor: "var(--border-subtle)" }}
    >
      <div className="relative px-6 lg:px-8">
        <div
          className="pointer-events-none absolute left-0 top-0 z-[1] h-full w-8 bg-gradient-to-r from-[var(--bg-white)] to-transparent"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute right-0 top-0 z-[1] h-full w-8 bg-gradient-to-l from-[var(--bg-white)] to-transparent"
          aria-hidden
        />
        <nav className="-mb-px flex gap-0 overflow-x-auto scrollbar-none">
          {DOCUMENT_TABS.map((tab) => {
            const active =
              activeKey === tab.key ||
              (typeof location === "string" && location.includes(tab.match));
            const Icon = tab.Icon;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setLocation(tab.href(pid))}
                className={cn(
                  "doc-tab-fade flex min-w-[100px] max-w-[160px] flex-col items-center border-b-2 px-5 py-3.5 transition-colors shrink-0",
                  active
                    ? "border-[var(--copper-500)]"
                    : "border-transparent hover:bg-[var(--bg-cream)]"
                )}
              >
                <Icon
                  className="mb-1 h-[18px] w-[18px] shrink-0"
                  style={{ color: active ? "var(--copper-500)" : "var(--text-muted)" }}
                />
                <span
                  className={cn(
                    "kanban-body-sm font-medium truncate w-full text-center",
                    active ? "text-[var(--text-primary)]" : "text-[var(--text-secondary)]"
                  )}
                >
                  {tab.label}
                </span>
                <span className="kanban-caption text-[var(--text-muted)] truncate w-full text-center mt-0.5">
                  {tab.subtitle}
                </span>
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
