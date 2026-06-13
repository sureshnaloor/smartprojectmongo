export type WeekendPattern = "fri_sat" | "sat_sun" | "sun_only" | "fri_only" | "custom";

export type CalendarPartialDay = {
  date: string;
  hours: number;
  note?: string | null;
};

export type DefaultCalendar = {
  id: number;
  weekendPattern: WeekendPattern;
  customWeekendDays: number[];
  standardHoursPerDay: number;
  partialDays: CalendarPartialDay[];
};

export type CalendarHoliday = {
  id: number;
  year: number;
  date: string;
  name: string;
  holidayType: "national" | "common" | "religious" | "other";
};

export type DayClassification = "working" | "weekend" | "holiday" | "partial";

export const WEEKEND_PATTERN_OPTIONS: { value: WeekendPattern; label: string }[] = [
  { value: "sat_sun", label: "Saturday & Sunday" },
  { value: "fri_sat", label: "Friday & Saturday" },
  { value: "sun_only", label: "Sunday only" },
  { value: "fri_only", label: "Friday only" },
  { value: "custom", label: "Custom days" },
];

export const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

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

export function getDayInfo(
  dateStr: string,
  calendar: DefaultCalendar,
  holidays: CalendarHoliday[]
): { classification: DayClassification; hours: number; holidayName?: string } {
  const iso = dateStr.slice(0, 10);
  const holiday = holidays.find((h) => h.date.slice(0, 10) === iso);
  if (holiday) {
    return { classification: "holiday", hours: 0, holidayName: holiday.name };
  }

  const weekendDays = resolveWeekendDays(calendar);
  const dow = parseIsoDate(iso).getDay();
  if (weekendDays.includes(dow)) {
    return { classification: "weekend", hours: 0 };
  }

  const partial = calendar.partialDays?.find((p) => p.date.slice(0, 10) === iso);
  if (partial) {
    return {
      classification: partial.hours > 0 ? "partial" : "weekend",
      hours: partial.hours,
    };
  }

  return { classification: "working", hours: calendar.standardHoursPerDay };
}

export function dayCellClass(classification: DayClassification): string {
  switch (classification) {
    case "holiday":
      return "bg-red-100 text-red-800 border-red-200";
    case "weekend":
      return "bg-zinc-100 text-zinc-400";
    case "partial":
      return "bg-amber-50 text-amber-900 border-amber-200";
    default:
      return "bg-white text-zinc-800";
  }
}
