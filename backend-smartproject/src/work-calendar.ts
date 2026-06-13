import type { CalendarHoliday, DefaultCalendar, WeekendPattern } from "./schema";

export type DayClassification = "working" | "weekend" | "holiday" | "partial";

export type CalendarDayInfo = {
  date: string;
  classification: DayClassification;
  hours: number;
  holidayName?: string;
};

const PATTERN_DAYS: Record<Exclude<WeekendPattern, "custom">, number[]> = {
  fri_sat: [5, 6],
  sat_sun: [6, 0],
  sun_only: [0],
  fri_only: [5],
};

export function resolveWeekendDays(calendar: Pick<DefaultCalendar, "weekendPattern" | "customWeekendDays">): number[] {
  if (calendar.weekendPattern === "custom") {
    return [...new Set(calendar.customWeekendDays ?? [])];
  }
  return [...PATTERN_DAYS[calendar.weekendPattern]];
}

function parseIsoDate(dateStr: string): Date {
  return new Date(`${dateStr.slice(0, 10)}T12:00:00`);
}

function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function eachDateInclusive(start: string, end: string): string[] {
  const a = parseIsoDate(start);
  const b = parseIsoDate(end);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return [];
  const lo = a <= b ? a : b;
  const hi = a <= b ? b : a;
  const out: string[] = [];
  const cur = new Date(lo);
  while (cur <= hi) {
    out.push(toIsoDate(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

function holidayMap(holidays: CalendarHoliday[]): Map<string, CalendarHoliday> {
  const map = new Map<string, CalendarHoliday>();
  for (const h of holidays) {
    map.set(h.date.slice(0, 10), h);
  }
  return map;
}

function partialDayMap(calendar: DefaultCalendar): Map<string, number> {
  const map = new Map<string, number>();
  for (const p of calendar.partialDays ?? []) {
    map.set(p.date.slice(0, 10), p.hours);
  }
  return map;
}

export function getDayInfo(
  dateStr: string,
  calendar: DefaultCalendar,
  holidays: CalendarHoliday[]
): CalendarDayInfo {
  const iso = dateStr.slice(0, 10);
  const holidayByDate = holidayMap(holidays);
  const partialByDate = partialDayMap(calendar);
  const weekendDays = resolveWeekendDays(calendar);
  const dow = parseIsoDate(iso).getDay();

  const holiday = holidayByDate.get(iso);
  if (holiday) {
    return {
      date: iso,
      classification: "holiday",
      hours: 0,
      holidayName: holiday.name,
    };
  }

  if (weekendDays.includes(dow)) {
    return { date: iso, classification: "weekend", hours: 0 };
  }

  if (partialByDate.has(iso)) {
    const hours = partialByDate.get(iso)!;
    return {
      date: iso,
      classification: hours > 0 ? "partial" : "weekend",
      hours,
    };
  }

  return {
    date: iso,
    classification: "working",
    hours: calendar.standardHoursPerDay,
  };
}

export function calendarDaysBetween(start: unknown, end: unknown): number | null {
  const a = start == null ? null : String(start).slice(0, 10);
  const b = end == null ? null : String(end).slice(0, 10);
  if (!a || !b) return null;
  const days = eachDateInclusive(a, b);
  return days.length > 0 ? days.length : null;
}

export function workingDaysBetween(
  start: unknown,
  end: unknown,
  calendar: DefaultCalendar,
  holidays: CalendarHoliday[]
): number | null {
  const days = eachDateInclusive(String(start ?? "").slice(0, 10), String(end ?? "").slice(0, 10));
  if (days.length === 0) return null;
  return days.filter((d) => getDayInfo(d, calendar, holidays).hours > 0).length;
}

export function workingHoursBetween(
  start: unknown,
  end: unknown,
  calendar: DefaultCalendar,
  holidays: CalendarHoliday[]
): number | null {
  const days = eachDateInclusive(String(start ?? "").slice(0, 10), String(end ?? "").slice(0, 10));
  if (days.length === 0) return null;
  return days.reduce((sum, d) => sum + getDayInfo(d, calendar, holidays).hours, 0);
}

export function buildCalendarDayMap(
  start: string,
  end: string,
  calendar: DefaultCalendar,
  holidays: CalendarHoliday[]
): CalendarDayInfo[] {
  return eachDateInclusive(start, end).map((d) => getDayInfo(d, calendar, holidays));
}
