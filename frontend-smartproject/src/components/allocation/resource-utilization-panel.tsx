import { useMemo, useState } from "react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isWithinInterval,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AssignmentCalendarItem } from "@/components/allocation/assignment-month-calendar";
import { cn } from "@/lib/utils";

type UtilizationRow = {
  entityId: number;
  resourceId: number | null;
  resourceName: string;
  assignments: AssignmentCalendarItem[];
};

type Props = {
  rows: UtilizationRow[];
  emptyHint: string;
};

type ResourceRollup = {
  resourceId: number;
  resourceName: string;
  totalAvailable: number;
  totalPlanned: number;
  totalUnplanned: number;
  activePlanned: number;
  idlePlanned: number;
  assignments: AssignmentCalendarItem[];
};

function parseQty(value: string): number {
  const n = Number.parseFloat(String(value ?? "").trim());
  return Number.isFinite(n) ? n : 0;
}

function fmtQty(value: number): string {
  if (Number.isInteger(value)) return String(value);
  return value.toFixed(2).replace(/\.?0+$/, "");
}

function dayKey(d: Date): string {
  return format(d, "yyyy-MM-dd");
}

export function ResourceUtilizationPanel({ rows, emptyHint }: Props) {
  const summaries = useMemo<ResourceRollup[]>(() => {
    const byResource = new Map<
      number,
      { resourceName: string; entityIds: Set<number>; assignments: AssignmentCalendarItem[] }
    >();
    for (const row of rows) {
      if (row.resourceId == null) continue;
      const hit = byResource.get(row.resourceId);
      if (hit) {
        hit.entityIds.add(row.entityId);
        hit.assignments.push(...row.assignments);
      } else {
        byResource.set(row.resourceId, {
          resourceName: row.resourceName,
          entityIds: new Set([row.entityId]),
          assignments: [...row.assignments],
        });
      }
    }

    const today = new Date();
    const out: ResourceRollup[] = [];
    for (const [resourceId, entry] of byResource.entries()) {
      const seen = new Set<number>();
      const uniqAssignments = entry.assignments.filter((a) => {
        if (seen.has(a.projectResourceId)) return false;
        seen.add(a.projectResourceId);
        return true;
      });

      let totalPlanned = 0;
      let activePlanned = 0;
      for (const a of uniqAssignments) {
        const qty = parseQty(a.quantity);
        totalPlanned += qty;
        if (!a.plannedStartDate || !a.plannedEndDate) continue;
        const start = parseISO(a.plannedStartDate);
        const end = parseISO(a.plannedEndDate);
        if (
          Number.isNaN(start.getTime()) ||
          Number.isNaN(end.getTime()) ||
          !isWithinInterval(today, { start: start <= end ? start : end, end: start <= end ? end : start })
        ) {
          continue;
        }
        activePlanned += qty;
      }

      out.push({
        resourceId,
        resourceName: entry.resourceName,
        totalAvailable: entry.entityIds.size,
        totalPlanned,
        totalUnplanned: Math.max(entry.entityIds.size - totalPlanned, 0),
        activePlanned,
        idlePlanned: Math.max(totalPlanned - activePlanned, 0),
        assignments: uniqAssignments,
      });
    }

    return out.sort((a, b) => a.resourceName.localeCompare(b.resourceName));
  }, [rows]);

  const [selectedResourceId, setSelectedResourceId] = useState<number | null>(summaries[0]?.resourceId ?? null);
  const [viewMonth, setViewMonth] = useState<Date>(startOfMonth(new Date()));

  const selected = useMemo(
    () => summaries.find((s) => s.resourceId === selectedResourceId) ?? summaries[0] ?? null,
    [selectedResourceId, summaries]
  );

  const gridDays = useMemo(() => {
    const monthStart = startOfMonth(viewMonth);
    const monthEnd = endOfMonth(viewMonth);
    const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: gridStart, end: gridEnd });
  }, [viewMonth]);

  const dailyPlanned = useMemo(() => {
    const out = new Map<string, number>();
    if (!selected) return out;
    for (const a of selected.assignments) {
      if (!a.plannedStartDate || !a.plannedEndDate) continue;
      const start = parseISO(a.plannedStartDate);
      const end = parseISO(a.plannedEndDate);
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) continue;
      const lo = start <= end ? start : end;
      const hi = start <= end ? end : start;
      const qty = parseQty(a.quantity);
      for (const d of eachDayOfInterval({ start: lo, end: hi })) {
        const k = dayKey(d);
        out.set(k, (out.get(k) ?? 0) + qty);
      }
    }
    return out;
  }, [selected]);

  if (summaries.length === 0) {
    return (
      <Card className="border-zinc-200 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-bold text-zinc-800">Resource utilization</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-xs text-zinc-500">{emptyHint}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-zinc-200 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-bold text-zinc-800">Resource utilization</CardTitle>
        <p className="text-xs text-zinc-500">
          Planned summary from active work-package assignments. Timesheet actuals can be layered here later.
        </p>
      </CardHeader>
      <CardContent className="pt-0 space-y-4">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {summaries.map((s) => {
            const selectedCard = selected?.resourceId === s.resourceId;
            const hasShortfall = s.totalPlanned > s.totalAvailable;
            return (
              <button
                key={s.resourceId}
                type="button"
                onClick={() => setSelectedResourceId(s.resourceId)}
                className={cn(
                  "rounded-md border p-3 text-left transition-colors",
                  selectedCard
                    ? "border-teal-300 bg-teal-50/50"
                    : hasShortfall
                      ? "border-rose-300 bg-rose-50/40 hover:border-rose-400"
                      : "border-zinc-200 bg-white hover:border-zinc-300"
                )}
              >
                <p className="text-xs font-semibold text-zinc-800">{s.resourceName}</p>
                <div className="mt-2 space-y-1 text-[11px] text-zinc-600">
                  <p>Total available/assigned: {s.totalAvailable}</p>
                  <p>Total planned/required: {fmtQty(s.totalPlanned)}</p>
                  <p>Unplanned (A - P): {fmtQty(s.totalUnplanned)}</p>
                  <p>Currently active: {fmtQty(s.activePlanned)}</p>
                  <p>Idle planned: {fmtQty(s.idlePlanned)}</p>
                </div>
                {hasShortfall ? (
                  <p className="mt-2 text-[10px] font-semibold text-rose-700">
                    Shortfall: {fmtQty(s.totalPlanned - s.totalAvailable)}
                  </p>
                ) : null}
              </button>
            );
          })}
        </div>

        {selected && (
          <div className="space-y-1.5 max-w-[min(100%,22rem)]">
            <div className="flex items-center justify-between gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0 text-zinc-600"
                aria-label="Previous month"
                onClick={() => setViewMonth((d) => subMonths(d, 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 text-center leading-tight flex-1">
                {selected.resourceName} — {format(viewMonth, "MMMM yyyy")}
              </p>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0 text-zinc-600"
                aria-label="Next month"
                onClick={() => setViewMonth((d) => addMonths(d, 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <div className="grid grid-cols-7 gap-px rounded border border-zinc-200 bg-zinc-200 overflow-hidden text-[9px] leading-none">
              {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((d) => (
                <div key={d} className="bg-zinc-100 px-0.5 py-0.5 text-center font-semibold text-zinc-600">
                  {d}
                </div>
              ))}
              {gridDays.map((day) => {
                const inMonth = isSameMonth(day, viewMonth);
                const qty = dailyPlanned.get(dayKey(day)) ?? 0;
                const available = selected.totalAvailable;
                const unplanned = Math.max(available - qty, 0);
                const hasShortfall = qty > available;
                return (
                  <div
                    key={day.toISOString()}
                    className={cn(
                      "min-h-[1.5rem] px-0.5 py-0.5 text-center flex flex-col items-center justify-center",
                      qty > 0
                        ? hasShortfall
                          ? "bg-rose-100 text-rose-900"
                          : "bg-teal-100 text-teal-900"
                        : inMonth
                          ? "bg-white text-zinc-800"
                          : "bg-zinc-50",
                      !inMonth && "text-zinc-300"
                    )}
                    title={
                      qty > 0
                        ? `Planned: ${fmtQty(qty)} | Available: ${available} | Unplanned: ${fmtQty(unplanned)}`
                        : undefined
                    }
                  >
                    <span className="text-[9px]">{inMonth ? format(day, "d") : ""}</span>
                    {inMonth && qty > 0 ? (
                      <span className="text-[8px] font-semibold">
                        P:{fmtQty(qty)} A:{available} U:{fmtQty(unplanned)}
                      </span>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
