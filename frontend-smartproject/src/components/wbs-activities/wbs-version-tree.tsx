import { useState, useEffect, useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, ChevronDown, Loader2, Package, CheckCircle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { WbsItem, WorkPackage } from "@shared/schema";

export interface WbsVersionEntry {
  id: number;
  name: string;
  versionNumber: number;
  versionLabel: string;
  wbsFinalized: boolean;
  amendmentNumber: number | null;
  isCurrent: boolean;
  createdAt?: string | null;
}

interface WbsVersionTreeNode extends WbsItem {
  expanded: boolean;
  children: WbsVersionTreeNode[];
}

function buildTree(items: WbsItem[], expandedIds: Set<number>): WbsVersionTreeNode[] {
  const map = new Map<number, WbsVersionTreeNode>();
  const roots: WbsVersionTreeNode[] = [];
  items.forEach((item) =>
    map.set(item.id, { ...item, expanded: expandedIds.has(item.id), children: [] })
  );
  items.forEach((item) => {
    const node = map.get(item.id)!;
    if (item.parentId && map.has(item.parentId)) {
      map.get(item.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  });
  return roots;
}

function WorkPackageRow({ wp, indent }: { wp: WorkPackage; indent: number }) {
  return (
    <div
      className="flex items-center gap-2 border-b border-[var(--border-subtle)] py-1.5 pr-3 text-xs text-[var(--text-secondary)]"
      style={{ paddingLeft: `${indent * 20 + 32}px` }}
    >
      <Package className="h-3 w-3 shrink-0 text-[var(--copper-400)]" />
      <span className="truncate font-medium">
        {wp.code ? `${wp.code} — ` : ""}
        {wp.name}
      </span>
      <span className="ml-auto shrink-0 rounded bg-[var(--copper-50)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--copper-600)]">
        WP
      </span>
    </div>
  );
}

function TreeNode({
  node,
  level,
  wpByWbsId,
  onToggle,
}: {
  node: WbsVersionTreeNode;
  level: number;
  wpByWbsId: Map<number, WorkPackage[]>;
  onToggle: (id: number) => void;
}) {
  const wps = wpByWbsId.get(node.id) ?? [];
  const hasChildren = node.children.length > 0 || wps.length > 0;

  return (
    <div>
      <div
        className={cn(
          "group flex items-center gap-2 border-b border-[var(--border-subtle)] py-2.5 pr-3 transition-colors",
          "border-l-[3px] border-l-transparent hover:bg-[rgba(253,246,237,0.4)]"
        )}
        style={{ paddingLeft: `${level * 20 + 12}px` }}
      >
        <span
          className={cn(
            "flex h-3 w-3 shrink-0 items-center justify-center",
            hasChildren ? "cursor-pointer text-[var(--text-muted)]" : "text-transparent"
          )}
          onClick={() => hasChildren && onToggle(node.id)}
        >
          {hasChildren
            ? node.expanded
              ? <ChevronDown size={12} />
              : <ChevronRight size={12} />
            : null}
        </span>

        <span className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-[var(--bg-warm-gray)] text-[10px] font-semibold text-[var(--text-secondary)]">
          {node.level}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-xs">
            <span className="truncate font-medium text-[var(--text-primary)]">
              {node.code ? `${node.code} — ` : ""}
              {node.name}
            </span>
            {(node.type === "WBS" || node.type === "Summary") && (
              <span className="shrink-0 text-[10px] text-[var(--text-muted)]">(WBS)</span>
            )}
            {wps.length > 0 && (
              <span className="shrink-0 rounded bg-[var(--copper-50)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--copper-600)]">
                {wps.length} WP
              </span>
            )}
          </div>
        </div>
      </div>

      {node.expanded && (
        <>
          {node.children.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              level={level + 1}
              wpByWbsId={wpByWbsId}
              onToggle={onToggle}
            />
          ))}
          {!node.isTopLevel &&
            wps.map((wp) => <WorkPackageRow key={wp.id} wp={wp} indent={level + 1} />)}
        </>
      )}
    </div>
  );
}

export function WbsVersionTree({
  projectId,
  version,
}: {
  projectId: number;
  version: WbsVersionEntry;
}) {
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const initializedRef = useRef(false);

  const { data: wbsItems = [], isLoading: loadingWbs } = useQuery<WbsItem[]>({
    queryKey: [`/api/projects/${projectId}/wbs`],
    enabled: !!projectId,
  });

  const { data: workPackages = [], isLoading: loadingWps } = useQuery<WorkPackage[]>({
    queryKey: [`/api/projects/${projectId}/work-packages`],
    enabled: !!projectId,
  });

  // Reset on project change
  useEffect(() => {
    setExpandedIds(new Set());
    initializedRef.current = false;
  }, [projectId]);

  // Auto-expand first 2 levels
  useEffect(() => {
    if (wbsItems.length > 0 && !initializedRef.current) {
      setExpandedIds(new Set(wbsItems.filter((i) => i.level <= 2).map((i) => i.id)));
      initializedRef.current = true;
    }
  }, [wbsItems]);

  const wpByWbsId = useMemo(() => {
    const map = new Map<number, WorkPackage[]>();
    for (const wp of workPackages) {
      if (!map.has(wp.wbsItemId)) map.set(wp.wbsItemId, []);
      map.get(wp.wbsItemId)!.push(wp);
    }
    return map;
  }, [workPackages]);

  const tree = useMemo(
    () => buildTree(wbsItems, expandedIds),
    [wbsItems, expandedIds]
  );

  const toggle = (id: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const isLoading = loadingWbs || loadingWps;

  return (
    <div className="flex flex-col rounded-[var(--radius-md)] border border-[var(--border-subtle)] overflow-hidden bg-[var(--bg-white)]">
      {/* Version header bar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-[var(--border-subtle)] bg-[var(--bg-warm-gray)] px-4 py-2.5">
        <span className="rounded bg-[var(--navy-800)] px-2 py-0.5 text-[11px] font-bold text-white tracking-wide">
          {version.versionLabel}
        </span>
        <span className="text-xs text-[var(--text-secondary)] truncate max-w-[240px]">
          {version.name}
        </span>
        <div className="ml-auto flex items-center gap-2">
          {version.wbsFinalized ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">
              <CheckCircle className="h-3 w-3" />
              Finalized
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
              <Clock className="h-3 w-3" />
              Work in Progress
            </span>
          )}
        </div>
      </div>

      {/* Tree body */}
      {isLoading ? (
        <div className="flex min-h-[120px] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-[var(--copper-500)]" />
        </div>
      ) : wbsItems.length === 0 ? (
        <div className="flex min-h-[80px] items-center justify-center">
          <p className="text-xs text-[var(--text-muted)]">No WBS items in this version.</p>
        </div>
      ) : (
        <div className="max-h-[480px] overflow-y-auto">
          {tree.map((node) => (
            <TreeNode
              key={node.id}
              node={node}
              level={0}
              wpByWbsId={wpByWbsId}
              onToggle={toggle}
            />
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center gap-4 border-t border-[var(--border-subtle)] bg-[var(--bg-cream)] px-4 py-2 text-[11px] text-[var(--text-muted)]">
        <span>{wbsItems.length} WBS items</span>
        <span>·</span>
        <span>{workPackages.length} Work packages</span>
      </div>
    </div>
  );
}
