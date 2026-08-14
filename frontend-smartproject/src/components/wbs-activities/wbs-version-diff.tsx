import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Loader2,
  Plus,
  Minus,
  Equal,
  ChevronDown,
  ChevronRight,
  Eye,
  EyeOff,
  Package,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { WbsItem, WorkPackage } from "@shared/schema";
import type { WbsVersionEntry } from "./wbs-version-tree";

// ─── Types ────────────────────────────────────────────────────────────────────

type DiffStatus = "added" | "deleted" | "unchanged";

interface WbsDiffItem {
  status: DiffStatus;
  code: string;
  name: string;
  level: number;
  type: string;
  children: WbsDiffItem[];
  wps: WpDiffItem[];
  /** raw ids from each side (may be undefined if missing in that version) */
  idA?: number;
  idB?: number;
}

interface WpDiffItem {
  status: DiffStatus;
  code: string;
  name: string;
  parentWbsCode: string;
  idA?: number;
  idB?: number;
}

// ─── Diff engine ──────────────────────────────────────────────────────────────

/**
 * Build a stable key for a work package across versions.
 * Uses code if non-empty, otherwise falls back to parentWbsCode + ":" + name.
 */
function wpKey(wp: WorkPackage, wbsCodeByWbsId: Map<number, string>): string {
  const parentCode = wbsCodeByWbsId.get(wp.wbsItemId) ?? "?";
  return wp.code?.trim() ? wp.code.trim() : `${parentCode}:${wp.name.trim()}`;
}

function computeDiff(
  wbsA: WbsItem[],
  wbsB: WbsItem[],
  wpsA: WorkPackage[],
  wpsB: WorkPackage[]
): WbsDiffItem[] {
  // Build code→item maps for both sides
  const codeMapA = new Map<string, WbsItem>(
    wbsA.filter((w) => w.code).map((w) => [w.code!.trim(), w])
  );
  const codeMapB = new Map<string, WbsItem>(
    wbsB.filter((w) => w.code).map((w) => [w.code!.trim(), w])
  );

  // WBS code → parent code maps
  const idToCodeA = new Map<number, string>(wbsA.map((w) => [w.id, w.code?.trim() ?? ""]));
  const idToCodeB = new Map<number, string>(wbsB.map((w) => [w.id, w.code?.trim() ?? ""]));

  // WP key maps
  const wpKeyMapA = new Map<string, WorkPackage>(wpsA.map((wp) => [wpKey(wp, idToCodeA), wp]));
  const wpKeyMapB = new Map<string, WorkPackage>(wpsB.map((wp) => [wpKey(wp, idToCodeB), wp]));

  // Union of all WBS codes
  const allCodes = new Set([
    ...Array.from(codeMapA.keys()),
    ...Array.from(codeMapB.keys()),
  ]);

  // Build flat diff list
  const flatItems = new Map<string, WbsDiffItem>();

  for (const code of Array.from(allCodes)) {
    const inA = codeMapA.get(code);
    const inB = codeMapB.get(code);
    const representative = inB ?? inA!;
    flatItems.set(code, {
      status: inA && inB ? "unchanged" : inB ? "added" : "deleted",
      code,
      name: representative.name,
      level: representative.level ?? 1,
      type: representative.type,
      children: [],
      wps: [],
      idA: inA?.id,
      idB: inB?.id,
    });
  }

  // Union of all WP keys
  const allWpKeys = new Set([
    ...Array.from(wpKeyMapA.keys()),
    ...Array.from(wpKeyMapB.keys()),
  ]);

  for (const key of Array.from(allWpKeys)) {
    const inA = wpKeyMapA.get(key);
    const inB = wpKeyMapB.get(key);
    const rep = inB ?? inA!;
    const parentCodeA = inA ? (idToCodeA.get(inA.wbsItemId) ?? "") : "";
    const parentCodeB = inB ? (idToCodeB.get(inB.wbsItemId) ?? "") : "";
    const parentCode = parentCodeB || parentCodeA;

    const wpItem: WpDiffItem = {
      status: inA && inB ? "unchanged" : inB ? "added" : "deleted",
      code: key,
      name: rep.name,
      parentWbsCode: parentCode,
      idA: inA?.id,
      idB: inB?.id,
    };

    const parentNode = flatItems.get(parentCode);
    if (parentNode) {
      parentNode.wps.push(wpItem);
    }
  }

  // Build hierarchy by code (e.g. "1.1" is child of "1")
  const roots: WbsDiffItem[] = [];
  const sorted = Array.from(flatItems.values()).sort((a, b) =>
    a.code.localeCompare(b.code, undefined, { numeric: true })
  );

  for (const item of sorted) {
    const parentCode = item.code.includes(".")
      ? item.code.substring(0, item.code.lastIndexOf("."))
      : null;

    if (parentCode && flatItems.has(parentCode)) {
      flatItems.get(parentCode)!.children.push(item);
    } else {
      roots.push(item);
    }
  }

  return roots;
}

// ─── Status helpers ────────────────────────────────────────────────────────────

const statusConfig = {
  added: {
    bg: "bg-emerald-50 border-l-emerald-400",
    text: "text-emerald-800",
    badge: "bg-emerald-100 text-emerald-700",
    icon: <Plus className="h-3 w-3" />,
    label: "Added",
  },
  deleted: {
    bg: "bg-red-50 border-l-red-400",
    text: "text-red-800",
    badge: "bg-red-100 text-red-700",
    icon: <Minus className="h-3 w-3" />,
    label: "Deleted",
  },
  unchanged: {
    bg: "bg-transparent border-l-transparent",
    text: "text-[var(--text-secondary)]",
    badge: "bg-[var(--bg-warm-gray)] text-[var(--text-muted)]",
    icon: <Equal className="h-3 w-3" />,
    label: "Unchanged",
  },
} as const;

// ─── Single diff row ──────────────────────────────────────────────────────────

function WpDiffRow({
  wp,
  indent,
  showUnchanged,
}: {
  wp: WpDiffItem;
  indent: number;
  showUnchanged: boolean;
}) {
  if (wp.status === "unchanged" && !showUnchanged) return null;
  const cfg = statusConfig[wp.status];
  return (
    <div
      className={cn(
        "flex items-center gap-2 border-b border-[var(--border-subtle)] py-1.5 pr-3 border-l-[3px] transition-colors",
        cfg.bg
      )}
      style={{ paddingLeft: `${indent * 20 + 32}px` }}
    >
      <Package className="h-3 w-3 shrink-0 text-[var(--copper-400)]" />
      <span className={cn("truncate text-xs font-medium", cfg.text)}>{wp.name}</span>
      {wp.code && wp.code !== wp.name && (
        <span className="shrink-0 text-[10px] text-[var(--text-muted)] font-mono">{wp.code}</span>
      )}
      <span className={cn("ml-auto shrink-0 inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-semibold", cfg.badge)}>
        {cfg.icon}
        WP · {cfg.label}
      </span>
    </div>
  );
}

function WbsDiffRow({
  item,
  level,
  showUnchanged,
  expandedCodes,
  onToggle,
}: {
  item: WbsDiffItem;
  level: number;
  showUnchanged: boolean;
  expandedCodes: Set<string>;
  onToggle: (code: string) => void;
}) {
  const isExpanded = expandedCodes.has(item.code);
  const hasChildren = item.children.length > 0 || item.wps.length > 0;

  // Filter visibility: show row if it has status ≠ unchanged, OR if any descendant has a change
  const hasDescendantChange = (node: WbsDiffItem): boolean => {
    if (node.status !== "unchanged") return true;
    if (node.wps.some((wp) => wp.status !== "unchanged")) return true;
    return node.children.some(hasDescendantChange);
  };

  if (item.status === "unchanged" && !showUnchanged && !hasDescendantChange(item)) return null;

  const cfg = statusConfig[item.status];
  const visibleWps = showUnchanged
    ? item.wps
    : item.wps.filter((wp) => wp.status !== "unchanged");

  return (
    <div>
      <div
        className={cn(
          "flex items-center gap-2 border-b border-[var(--border-subtle)] py-2.5 pr-3 border-l-[3px] transition-colors",
          cfg.bg
        )}
        style={{ paddingLeft: `${level * 20 + 12}px` }}
      >
        {/* Toggle */}
        <span
          className={cn(
            "flex h-3 w-3 shrink-0 items-center justify-center",
            hasChildren ? "cursor-pointer text-[var(--text-muted)]" : "text-transparent"
          )}
          onClick={() => hasChildren && onToggle(item.code)}
        >
          {hasChildren
            ? isExpanded
              ? <ChevronDown size={12} />
              : <ChevronRight size={12} />
            : null}
        </span>

        {/* Level badge */}
        <span className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-[var(--bg-warm-gray)] text-[10px] font-semibold text-[var(--text-secondary)]">
          {item.level}
        </span>

        {/* Name */}
        <div className="min-w-0 flex-1">
          <span className={cn("truncate text-xs font-medium", cfg.text)}>
            {item.code} — {item.name}
          </span>
          {(item.type === "WBS" || item.type === "Summary") && (
            <span className="ml-1.5 text-[10px] text-[var(--text-muted)]">(WBS)</span>
          )}
        </div>

        {/* Status badge */}
        <span className={cn("ml-auto shrink-0 inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-semibold", cfg.badge)}>
          {cfg.icon}
          {cfg.label}
        </span>
      </div>

      {isExpanded && (
        <>
          {item.children.map((child) => (
            <WbsDiffRow
              key={child.code}
              item={child}
              level={level + 1}
              showUnchanged={showUnchanged}
              expandedCodes={expandedCodes}
              onToggle={onToggle}
            />
          ))}
          {visibleWps.map((wp) => (
            <WpDiffRow key={wp.code} wp={wp} indent={level + 1} showUnchanged={showUnchanged} />
          ))}
        </>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface WbsVersionDiffProps {
  versions: WbsVersionEntry[];
}

export function WbsVersionDiff({ versions }: WbsVersionDiffProps) {
  // Default: compare version[n-2] → version[n-1] (last two)
  const defaultOlderIdx = Math.max(0, versions.length - 2);
  const defaultNewerIdx = versions.length - 1;

  const [olderIdx, setOlderIdx] = useState(defaultOlderIdx);
  const [newerIdx, setNewerIdx] = useState(defaultNewerIdx);
  const [showUnchanged, setShowUnchanged] = useState(false);
  const [expandedCodes, setExpandedCodes] = useState<Set<string>>(new Set());

  const olderVersion = versions[olderIdx];
  const newerVersion = versions[newerIdx];

  // Fetch both sides
  const { data: wbsA = [], isLoading: loadA } = useQuery<WbsItem[]>({
    queryKey: [`/api/projects/${olderVersion.id}/wbs`],
    enabled: !!olderVersion.id,
  });
  const { data: wpsA = [], isLoading: loadWpA } = useQuery<WorkPackage[]>({
    queryKey: [`/api/projects/${olderVersion.id}/work-packages`],
    enabled: !!olderVersion.id,
  });
  const { data: wbsB = [], isLoading: loadB } = useQuery<WbsItem[]>({
    queryKey: [`/api/projects/${newerVersion.id}/wbs`],
    enabled: !!newerVersion.id,
  });
  const { data: wpsB = [], isLoading: loadWpB } = useQuery<WorkPackage[]>({
    queryKey: [`/api/projects/${newerVersion.id}/work-packages`],
    enabled: !!newerVersion.id,
  });

  const isLoading = loadA || loadB || loadWpA || loadWpB;

  const diffTree = useMemo(
    () => (isLoading ? [] : computeDiff(wbsA, wbsB, wpsA, wpsB)),
    [wbsA, wbsB, wpsA, wpsB, isLoading]
  );

  // Summary counts
  const { addedWbs, deletedWbs, addedWp, deletedWp } = useMemo(() => {
    let addedWbs = 0, deletedWbs = 0, addedWp = 0, deletedWp = 0;
    const walk = (items: WbsDiffItem[]) => {
      for (const item of items) {
        if (item.status === "added") addedWbs++;
        if (item.status === "deleted") deletedWbs++;
        for (const wp of item.wps) {
          if (wp.status === "added") addedWp++;
          if (wp.status === "deleted") deletedWp++;
        }
        walk(item.children);
      }
    };
    walk(diffTree);
    return { addedWbs, deletedWbs, addedWp, deletedWp };
  }, [diffTree]);

  const hasAnyChange = addedWbs + deletedWbs + addedWp + deletedWp > 0;

  // Auto-expand nodes that contain changes — must be useEffect, NOT useMemo,
  // because it calls setExpandedCodes (a side-effect during render = React #301)
  useEffect(() => {
    const codes = new Set<string>();
    const collect = (items: WbsDiffItem[]) => {
      for (const item of items) {
        const hasOwnChange =
          item.status !== "unchanged" ||
          item.wps.some((wp) => wp.status !== "unchanged");
        const hasChildChange = item.children.some(function check(c: WbsDiffItem): boolean {
          return (
            c.status !== "unchanged" ||
            c.wps.some((wp) => wp.status !== "unchanged") ||
            c.children.some(check)
          );
        });
        if (hasOwnChange || hasChildChange) codes.add(item.code);
        collect(item.children);
      }
    };
    collect(diffTree);
    setExpandedCodes(codes);
  }, [diffTree]);

  const toggleExpand = (code: string) => {
    setExpandedCodes((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Version selector row */}
      <div className="flex flex-wrap items-center gap-2 rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--bg-warm-gray)] px-3 py-2.5">
        <span className="text-xs font-semibold text-[var(--text-secondary)]">Compare:</span>

        {/* Older (base) version */}
        <select
          value={olderIdx}
          onChange={(e) => {
            const idx = parseInt(e.target.value);
            setOlderIdx(idx);
            if (idx >= newerIdx) setNewerIdx(Math.min(idx + 1, versions.length - 1));
          }}
          className="rounded border border-[var(--border-subtle)] bg-white px-2 py-1 text-xs font-medium text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--copper-400)]"
        >
          {versions.map((v, i) => (
            <option key={v.id} value={i} disabled={i >= newerIdx}>
              {v.versionLabel} {v.wbsFinalized ? "(Finalized)" : "(WIP)"}
            </option>
          ))}
        </select>

        <ArrowRight className="h-3.5 w-3.5 shrink-0 text-[var(--text-muted)]" />

        {/* Newer (target) version */}
        <select
          value={newerIdx}
          onChange={(e) => {
            const idx = parseInt(e.target.value);
            setNewerIdx(idx);
            if (idx <= olderIdx) setOlderIdx(Math.max(idx - 1, 0));
          }}
          className="rounded border border-[var(--border-subtle)] bg-white px-2 py-1 text-xs font-medium text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--copper-400)]"
        >
          {versions.map((v, i) => (
            <option key={v.id} value={i} disabled={i <= olderIdx}>
              {v.versionLabel} {v.wbsFinalized ? "(Finalized)" : "(WIP)"}
            </option>
          ))}
        </select>

        {/* Toggle unchanged */}
        <button
          type="button"
          onClick={() => setShowUnchanged((v) => !v)}
          className={cn(
            "ml-auto inline-flex items-center gap-1.5 rounded border px-2.5 py-1 text-[11px] font-medium transition-colors",
            showUnchanged
              ? "border-[var(--copper-400)] bg-[var(--copper-50)] text-[var(--copper-700)]"
              : "border-[var(--border-subtle)] bg-white text-[var(--text-secondary)] hover:border-[var(--copper-300)]"
          )}
        >
          {showUnchanged ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
          {showUnchanged ? "Showing all" : "Show unchanged"}
        </button>
      </div>

      {/* Summary badges */}
      <div className="flex flex-wrap items-center gap-2 px-1">
        {addedWbs > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-semibold text-emerald-800">
            <Plus className="h-3 w-3" />
            {addedWbs} WBS added
          </span>
        )}
        {deletedWbs > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-1 text-[11px] font-semibold text-red-800">
            <Minus className="h-3 w-3" />
            {deletedWbs} WBS deleted
          </span>
        )}
        {addedWp > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
            <Plus className="h-3 w-3" />
            {addedWp} WP added
          </span>
        )}
        {deletedWp > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full bg-red-50 border border-red-200 px-2.5 py-1 text-[11px] font-semibold text-red-700">
            <Minus className="h-3 w-3" />
            {deletedWp} WP deleted
          </span>
        )}
        {!hasAnyChange && !isLoading && (
          <span className="text-xs text-[var(--text-muted)] italic">
            No structural changes between these versions.
          </span>
        )}
      </div>

      {/* Diff tree */}
      <div className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] overflow-hidden bg-[var(--bg-white)]">
        {/* Legend */}
        <div className="flex items-center gap-4 border-b border-[var(--border-subtle)] bg-[var(--bg-warm-gray)] px-4 py-2">
          <span className="text-[11px] text-[var(--text-muted)] font-medium">Legend:</span>
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
            <Plus className="h-3 w-3" /> Added
          </span>
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-700">
            <Minus className="h-3 w-3" /> Deleted
          </span>
          {showUnchanged && (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--text-muted)]">
              <Equal className="h-3 w-3" /> Unchanged
            </span>
          )}
        </div>

        {isLoading ? (
          <div className="flex min-h-[120px] items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-[var(--copper-500)]" />
          </div>
        ) : !hasAnyChange && !showUnchanged ? (
          <div className="flex min-h-[80px] flex-col items-center justify-center gap-1">
            <Equal className="h-6 w-6 text-[var(--text-muted)]" />
            <p className="text-xs text-[var(--text-muted)]">
              WBS structure is identical between these two versions.
            </p>
            <button
              type="button"
              onClick={() => setShowUnchanged(true)}
              className="mt-1 text-[11px] text-[var(--copper-600)] underline underline-offset-2"
            >
              Show all items anyway
            </button>
          </div>
        ) : (
          <div className="max-h-[520px] overflow-y-auto">
            {diffTree.map((item) => (
              <WbsDiffRow
                key={item.code}
                item={item}
                level={0}
                showUnchanged={showUnchanged}
                expandedCodes={expandedCodes}
                onToggle={toggleExpand}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
