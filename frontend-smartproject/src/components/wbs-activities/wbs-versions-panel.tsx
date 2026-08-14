import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { History, Loader2, GitBranch, Star, Archive, GitCompare } from "lucide-react";
import { cn } from "@/lib/utils";
import { WbsVersionTree, type WbsVersionEntry } from "./wbs-version-tree";
import { WbsVersionDiff } from "./wbs-version-diff";

type TabKey = "current" | "original" | "previous" | "diff";

interface WbsVersionsPanelProps {
  /** The currently-navigated project ID (used to find the amendment family) */
  projectId: number;
}

/**
 * Renders a 4-tab panel showing WBS version history for a project family:
 *   1. "Current Version"   — most recent (finalized or WIP)
 *   2. "Original Version"  — v0 (hidden when same as current)
 *   3. "Previous Versions" — v1 … v(n-1) (hidden when none exist)
 *   4. "Version Diff"      — additions / deletions between any two versions
 */
export function WbsVersionsPanel({ projectId }: WbsVersionsPanelProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("current");
  const [prevVersionIdx, setPrevVersionIdx] = useState(0);

  const { data: versions = [], isLoading } = useQuery<WbsVersionEntry[]>({
    queryKey: [`/api/projects/${projectId}/wbs-versions`],
    enabled: !!projectId,
  });

  if (isLoading) {
    return (
      <div className="flex min-h-[80px] items-center justify-center rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-white)]">
        <Loader2 className="h-5 w-5 animate-spin text-[var(--copper-500)]" />
      </div>
    );
  }

  if (versions.length === 0) return null;

  const currentVersion = versions[versions.length - 1]; // most recent
  const originalVersion = versions[0];                  // v0
  // "previous" = everything between original and current (exclusive)
  const previousVersions = versions.slice(1, versions.length - 1);

  const hasPreviousVersions = previousVersions.length > 0;
  const isSameAsOriginal = currentVersion.id === originalVersion.id;
  const canDiff = versions.length >= 2;

  const tabs: { key: TabKey; label: string; icon: React.ReactNode; hidden?: boolean }[] = [
    {
      key: "current",
      label: "Current Version",
      icon: <Star className="h-3.5 w-3.5" />,
    },
    {
      key: "original",
      label: "Original Version",
      icon: <Archive className="h-3.5 w-3.5" />,
      hidden: isSameAsOriginal,
    },
    {
      key: "previous",
      label: `Previous Versions${hasPreviousVersions ? ` (${previousVersions.length})` : ""}`,
      icon: <GitBranch className="h-3.5 w-3.5" />,
      hidden: !hasPreviousVersions,
    },
    {
      key: "diff",
      label: "Version Diff",
      icon: <GitCompare className="h-3.5 w-3.5" />,
      hidden: !canDiff,
    },
  ];

  const visibleTabs = tabs.filter((t) => !t.hidden);

  // If only current tab is visible (single version project), show tree directly with no tab bar
  if (visibleTabs.length === 1) {
    return (
      <section className="space-y-3">
        <div className="flex items-center gap-2 px-1">
          <History className="h-4 w-4 text-[var(--copper-500)]" />
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">
            WBS Version History
          </h3>
          <span className="rounded-full bg-[var(--bg-warm-gray)] px-2 py-0.5 text-[11px] text-[var(--text-muted)]">
            1 version
          </span>
        </div>
        <WbsVersionTree projectId={currentVersion.id} version={currentVersion} />
      </section>
    );
  }

  return (
    <section className="space-y-3">
      {/* Section heading */}
      <div className="flex items-center gap-2 px-1">
        <History className="h-4 w-4 text-[var(--copper-500)]" />
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">
          WBS Version History
        </h3>
        <span className="rounded-full bg-[var(--bg-warm-gray)] px-2 py-0.5 text-[11px] text-[var(--text-muted)]">
          {versions.length} {versions.length === 1 ? "version" : "versions"}
        </span>
      </div>

      {/* Tab bar + content */}
      <div className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] overflow-hidden bg-[var(--bg-white)]">
        {/* Tab bar */}
        <div className="flex items-center gap-0 border-b border-[var(--border-subtle)] bg-[var(--bg-warm-gray)] px-1 pt-1">
          {visibleTabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-t px-3 py-2 text-xs font-medium transition-colors",
                "border-b-2",
                activeTab === tab.key
                  ? tab.key === "diff"
                    ? "border-[var(--navy-800)] bg-white text-[var(--navy-800)]"
                    : "border-[var(--copper-500)] bg-white text-[var(--copper-600)]"
                  : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/50"
              )}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="p-3">
          {/* Current Version */}
          {activeTab === "current" && (
            <WbsVersionTree projectId={currentVersion.id} version={currentVersion} />
          )}

          {/* Original Version */}
          {activeTab === "original" && !isSameAsOriginal && (
            <WbsVersionTree projectId={originalVersion.id} version={originalVersion} />
          )}

          {/* Previous Versions — pill sub-selector */}
          {activeTab === "previous" && hasPreviousVersions && (
            <div className="space-y-3">
              {previousVersions.length > 1 && (
                <div className="flex flex-wrap gap-1">
                  {previousVersions.map((v, idx) => (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setPrevVersionIdx(idx)}
                      className={cn(
                        "rounded-full px-3 py-1 text-[11px] font-semibold transition-colors border",
                        prevVersionIdx === idx
                          ? "bg-[var(--navy-800)] text-white border-[var(--navy-800)]"
                          : "bg-[var(--bg-warm-gray)] text-[var(--text-secondary)] border-[var(--border-subtle)] hover:border-[var(--navy-800)] hover:text-[var(--navy-800)]"
                      )}
                    >
                      {v.versionLabel}
                    </button>
                  ))}
                </div>
              )}
              <WbsVersionTree
                projectId={previousVersions[Math.min(prevVersionIdx, previousVersions.length - 1)].id}
                version={previousVersions[Math.min(prevVersionIdx, previousVersions.length - 1)]}
              />
            </div>
          )}

          {/* Version Diff */}
          {activeTab === "diff" && canDiff && (
            <WbsVersionDiff versions={versions} />
          )}
        </div>
      </div>
    </section>
  );
}

