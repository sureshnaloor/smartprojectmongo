import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isWithinInterval,
  max,
  min,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  CalendarHoliday,
  DefaultCalendar,
  dayCellClass,
  getDayInfo,
} from "@/lib/work-calendar";

/** Matches API allocation assignment rows (manpower, equipment, tools, etc.). */
export type AssignmentCalendarItem = {
  projectResourceId: number;
  projectName: string;
  wpCode: string;
  wpName: string;
  quantity: string;
  plannedStartDate: string | null;
  plannedEndDate: string | null;
  /** Working days (excludes weekends & holidays). */
  durationDays: number | null;
  calendarDays?: number | null;
  workingHours?: number | null;
  totalResourceHours?: number | null;
};

const CALENDAR_PALETTE = [
  "bg-teal-500/90",
  "bg-amber-500/90",
  "bg-violet-500/90",
  "bg-rose-500/90",
  "bg-cyan-600/90",
];

type Props = {
  assignments: AssignmentCalendarItem[];
  emptyDateHint?: string;
};

async function fetchCalendarForYear(year: number) {
  const res = await fetch(`/api/default-calendar?year=${year}`);
  if (!res.ok) throw new Error("Failed to load work calendar");
  return res.json() as Promise<{
    calendar: DefaultCalendar;
    holidays: CalendarHoliday[];
  }>;
}

export function AssignmentMonthCalendar({ assignments, emptyDateHint }: Props) {
  const intervals = useMemo(() => {
    const out: { start: Date; end: Date; assignmentIndex: number }[] = [];
    assignments.forEach((a, assignmentIndex) => {
      if (!a.plannedStartDate || !a.plannedEndDate) return;
      try {
        const start = parseISO(a.plannedStartDate);
        const end = parseISO(a.plannedEndDate);
        if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return;
        const lo = min([start, end]);
        const hi = max([start, end]);
        out.push({ start: lo, end: hi, assignmentIndex });
      } catch {
        /* ignore */
      }
    });
    return out;
  }, [assignments]);

  const assignmentKey = useMemo(
    () =>
      assignments
        .map((a) => `${a.projectResourceId}|${a.plannedStartDate}|${a.plannedEndDate}`)
        .join(";"),
    [assignments]
  );

  const firstMonth = useMemo(() => {
    if (intervals.length === 0) return startOfMonth(new Date());
    const earliest = min(intervals.map((i) => i.start));
    return startOfMonth(earliest);
  }, [intervals]);

  const [viewMonth, setViewMonth] = useState<Date>(firstMonth);
  const viewYear = viewMonth.getFullYear();

  const { data: calendarData } = useQuery({
    queryKey: ["/api/default-calendar", viewYear],
    queryFn: () => fetchCalendarForYear(viewYear),
    staleTime: 60_000,
  });

  useEffect(() => {
    setViewMonth(firstMonth);
  }, [firstMonth.getTime(), assignmentKey]);

  const gridDays = useMemo(() => {
    const ms = startOfMonth(viewMonth);
    const me = endOfMonth(viewMonth);
    const gridStart = startOfWeek(ms, { weekStartsOn: 1 });
    const gridEnd = endOfWeek(me, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: gridStart, end: gridEnd });
  }, [viewMonth]);

  const calendar = calendarData?.calendar;
  const holidays = calendarData?.holidays ?? [];

  if (intervals.length === 0) {
    return (
      <p className="text-xs text-zinc-500">
        {emptyDateHint ??
          "No planned start/end dates on work package assignments. Set dates in Project → Resources on each work package line."}
      </p>
    );
  }

  return (
    <div className="space-y-1.5 max-w-[min(100%,17.5rem)]">
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
        <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 text-center leading-tight flex-1 px-0.5">
          {format(viewMonth, "MMMM yyyy")}
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
          <div
            key={d}
            className="bg-zinc-100 px-0.5 py-0.5 text-center font-semibold text-zinc-600"
          >
            {d}
          </div>
        ))}
        {gridDays.map((day) => {
          const inMonth = isSameMonth(day, viewMonth);
          const iso = format(day, "yyyy-MM-dd");
          const covering = intervals.filter(({ start, end }) =>
            isWithinInterval(day, { start, end })
          );
          const firstIdx = covering[0]?.assignmentIndex ?? 0;
          const dayInfo =
            calendar && inMonth ? getDayInfo(iso, calendar, holidays) : null;
          const isNonWorking =
            dayInfo && (dayInfo.classification === "holiday" || dayInfo.classification === "weekend");
          const assignmentBg =
            covering.length > 0 && !isNonWorking
              ? CALENDAR_PALETTE[firstIdx % CALENDAR_PALETTE.length]
              : null;
          return (
            <div
              key={day.toISOString()}
              className={cn(
                "min-h-[1.125rem] px-0.5 py-0.5 text-center tabular-nums flex items-center justify-center border",
                assignmentBg ??
                  (inMonth && dayInfo
                    ? dayCellClass(dayInfo.classification)
                    : inMonth
                      ? "bg-white text-zinc-800"
                      : "bg-zinc-50/80 text-zinc-300")
              )}
              title={
                dayInfo?.holidayName ??
                (covering.length > 0
                  ? covering
                      .map((c) => {
                        const a = assignments[c.assignmentIndex];
                        return a ? `${a.projectName} — ${a.wpCode}` : "";
                      })
                      .filter(Boolean)
                      .join("; ")
                  : dayInfo
                    ? `${dayInfo.hours}h`
                    : undefined)
              }
            >
              {inMonth ? format(day, "d") : ""}
            </div>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-2 text-[9px] text-zinc-500">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-sm bg-red-100 border border-red-200" /> Holiday
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-sm bg-zinc-100" /> Weekend
        </span>
      </div>
      <ul className="flex flex-col gap-1 text-[10px] text-zinc-600 leading-snug">
        {assignments.map((a, i) => {
          if (!a.plannedStartDate || !a.plannedEndDate) return null;
          return (
            <li key={a.projectResourceId} className="flex items-start gap-1.5">
              <span
                className={cn(
                  "inline-block h-2 w-2 rounded-sm shrink-0 mt-0.5",
                  CALENDAR_PALETTE[i % CALENDAR_PALETTE.length]
                )}
              />
              <span>
                {a.projectName} / {a.wpCode}: {a.plannedStartDate} → {a.plannedEndDate}
                {a.durationDays != null ? ` (${a.durationDays} wd` : ""}
                {a.workingHours != null ? `, ${a.workingHours} h` : ""}
                {a.totalResourceHours != null ? `, ${a.totalResourceHours} res-h` : ""}
                {a.durationDays != null ? ")" : ""}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
