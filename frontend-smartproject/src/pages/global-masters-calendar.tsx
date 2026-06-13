import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { Calendar, ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react";
import {
  CalendarHoliday,
  DefaultCalendar,
  WEEKDAY_LABELS,
  WEEKEND_PATTERN_OPTIONS,
  WeekendPattern,
  dayCellClass,
  getDayInfo,
  resolveWeekendDays,
} from "@/lib/work-calendar";
import { cn } from "@/lib/utils";

interface CalendarResponse {
  calendar: DefaultCalendar;
  holidays: CalendarHoliday[];
  year: number;
}

async function fetchCalendar(year: number): Promise<CalendarResponse> {
  const res = await fetch(`/api/default-calendar?year=${year}`);
  if (!res.ok) throw new Error("Failed to load calendar");
  return res.json();
}

export default function GlobalMastersCalendarPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [previewViewMonth, setPreviewViewMonth] = useState(() => startOfMonth(new Date(currentYear, 0, 1)));
  const [weekendPattern, setWeekendPattern] = useState<WeekendPattern>("sat_sun");
  const [customWeekendDays, setCustomWeekendDays] = useState<number[]>([]);
  const [standardHoursPerDay, setStandardHoursPerDay] = useState("8");
  const [partialDays, setPartialDays] = useState<DefaultCalendar["partialDays"]>([]);
  const [holidayForm, setHolidayForm] = useState({
    date: "",
    name: "",
    holidayType: "national" as CalendarHoliday["holidayType"],
  });

  const { data, isLoading } = useQuery({
    queryKey: ["/api/default-calendar", year],
    queryFn: () => fetchCalendar(year),
  });

  useEffect(() => {
    if (!data?.calendar) return;
    const c = data.calendar;
    setWeekendPattern(c.weekendPattern);
    setCustomWeekendDays(c.customWeekendDays ?? []);
    setStandardHoursPerDay(String(c.standardHoursPerDay));
    setPartialDays(c.partialDays ?? []);
  }, [data?.calendar]);

  useEffect(() => {
    setPreviewViewMonth(startOfMonth(new Date(year, 0, 1)));
  }, [year]);

  const saveCalendarMutation = useMutation({
    mutationFn: async () => {
      const hours = Number(standardHoursPerDay);
      if (!Number.isFinite(hours) || hours < 0 || hours > 24) {
        throw new Error("Standard hours per day must be between 0 and 24");
      }
      const res = await fetch("/api/default-calendar", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          weekendPattern,
          customWeekendDays: weekendPattern === "custom" ? customWeekendDays : [],
          standardHoursPerDay: hours,
          partialDays,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(typeof body.message === "string" ? body.message : "Failed to save calendar");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/default-calendar"] });
      toast({ title: "Work calendar saved" });
    },
    onError: (e: Error) =>
      toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const addHolidayMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/calendar-holidays", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...holidayForm, year }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(typeof body.message === "string" ? body.message : "Failed to add holiday");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/default-calendar", year] });
      setHolidayForm({ date: "", name: "", holidayType: "national" });
      toast({ title: "Holiday added" });
    },
    onError: (e: Error) =>
      toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteHolidayMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/calendar-holidays/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete holiday");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/default-calendar", year] });
      toast({ title: "Holiday removed" });
    },
    onError: (e: Error) =>
      toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const previewCalendar: DefaultCalendar = useMemo(
    () => ({
      id: 1,
      weekendPattern,
      customWeekendDays,
      standardHoursPerDay: Number(standardHoursPerDay) || 8,
      partialDays,
    }),
    [weekendPattern, customWeekendDays, standardHoursPerDay, partialDays]
  );

  const holidays = data?.holidays ?? [];

  const previewGridDays = useMemo(() => {
    const ms = startOfMonth(previewViewMonth);
    const me = endOfMonth(previewViewMonth);
    const gridStart = startOfWeek(ms, { weekStartsOn: 1 });
    const gridEnd = endOfWeek(me, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: gridStart, end: gridEnd });
  }, [previewViewMonth]);

  const previewMonthIndex = previewViewMonth.getMonth();
  const canPreviewPrev = previewMonthIndex > 0;
  const canPreviewNext = previewMonthIndex < 11;

  const toggleCustomDay = (dow: number) => {
    setCustomWeekendDays((prev) =>
      prev.includes(dow) ? prev.filter((d) => d !== dow) : [...prev, dow].sort((a, b) => a - b)
    );
  };

  const addPartialDay = () => {
    setPartialDays((prev) => [...prev, { date: `${year}-01-01`, hours: 4, note: "" }]);
  };

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Default work calendar</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Weekends and holidays are excluded from working-day and resource-hour calculations.
          Resource rates are always per hour — available hours per day depend on this calendar.
        </p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          saveCalendarMutation.mutate();
        }}
        className="space-y-6"
      >
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Weekend &amp; standard hours</CardTitle>
            <CardDescription>
              Choose which days are non-working. Linked to the default country for tax rules later.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Weekend pattern</Label>
                <Select
                  value={weekendPattern}
                  onValueChange={(v) => setWeekendPattern(v as WeekendPattern)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {WEEKEND_PATTERN_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Normal hours per working day</Label>
                <Input
                  type="number"
                  min={0}
                  max={24}
                  step={0.5}
                  value={standardHoursPerDay}
                  onChange={(e) => setStandardHoursPerDay(e.target.value)}
                />
              </div>
            </div>

            {weekendPattern === "custom" && (
              <div className="space-y-2">
                <Label>Custom weekend days</Label>
                <div className="flex flex-wrap gap-3">
                  {WEEKDAY_LABELS.map((label, dow) => (
                    <label key={label} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={customWeekendDays.includes(dow)}
                        onCheckedChange={() => toggleCustomDay(dow)}
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              Non-working: {resolveWeekendDays(previewCalendar).map((d) => WEEKDAY_LABELS[d]).join(", ") || "—"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Reduced-hour days</CardTitle>
            <CardDescription>
              Specific dates with fewer than normal hours (e.g. half-day before a holiday).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Hours</TableHead>
                  <TableHead>Note</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {partialDays.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-muted-foreground text-sm">
                      No reduced-hour days configured.
                    </TableCell>
                  </TableRow>
                ) : (
                  partialDays.map((row, idx) => (
                    <TableRow key={idx}>
                      <TableCell>
                        <Input
                          type="date"
                          value={row.date.slice(0, 10)}
                          onChange={(e) => {
                            const next = [...partialDays];
                            next[idx] = { ...next[idx], date: e.target.value };
                            setPartialDays(next);
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min={0}
                          max={24}
                          step={0.5}
                          className="w-24"
                          value={row.hours}
                          onChange={(e) => {
                            const next = [...partialDays];
                            next[idx] = { ...next[idx], hours: Number(e.target.value) };
                            setPartialDays(next);
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={row.note ?? ""}
                          placeholder="Optional"
                          onChange={(e) => {
                            const next = [...partialDays];
                            next[idx] = { ...next[idx], note: e.target.value };
                            setPartialDays(next);
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setPartialDays((p) => p.filter((_, i) => i !== idx))}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            <Button type="button" variant="outline" size="sm" onClick={addPartialDay}>
              <Plus className="h-4 w-4 mr-1" />
              Add reduced-hour day
            </Button>
          </CardContent>
        </Card>

        <Button type="submit" disabled={saveCalendarMutation.isPending || isLoading}>
          {saveCalendarMutation.isPending ? "Saving…" : "Save calendar settings"}
        </Button>
      </form>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Holidays — {year}
              </CardTitle>
              <CardDescription>National, common, and religious non-working days.</CardDescription>
            </div>
            <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[currentYear - 1, currentYear, currentYear + 1, currentYear + 2].map((y) => (
                  <SelectItem key={y} value={String(y)}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
            <div className="space-y-1">
              <Label className="text-xs">Date</Label>
              <Input
                type="date"
                value={holidayForm.date}
                onChange={(e) => setHolidayForm((f) => ({ ...f, date: e.target.value }))}
              />
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label className="text-xs">Name</Label>
              <Input
                value={holidayForm.name}
                placeholder="Holiday name"
                onChange={(e) => setHolidayForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Type</Label>
              <Select
                value={holidayForm.holidayType}
                onValueChange={(v) =>
                  setHolidayForm((f) => ({ ...f, holidayType: v as CalendarHoliday["holidayType"] }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="national">National</SelectItem>
                  <SelectItem value="common">Common</SelectItem>
                  <SelectItem value="religious">Religious</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button
            type="button"
            size="sm"
            disabled={!holidayForm.date || !holidayForm.name.trim() || addHolidayMutation.isPending}
            onClick={() => addHolidayMutation.mutate()}
          >
            <Plus className="h-4 w-4 mr-1" />
            Add holiday
          </Button>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {holidays.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-sm text-muted-foreground">
                    No holidays for {year}.
                  </TableCell>
                </TableRow>
              ) : (
                holidays.map((h) => (
                  <TableRow key={h.id}>
                    <TableCell className="font-mono text-sm">{h.date.slice(0, 10)}</TableCell>
                    <TableCell>{h.name}</TableCell>
                    <TableCell className="capitalize">{h.holidayType}</TableCell>
                    <TableCell>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteHolidayMutation.mutate(h.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          <div className="pt-2">
            <div className="flex items-center justify-between gap-2 mb-2 max-w-md">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-7 w-7 shrink-0"
                aria-label="Previous month"
                disabled={!canPreviewPrev}
                onClick={() => setPreviewViewMonth((d) => subMonths(d, 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 text-center flex-1">
                {format(previewViewMonth, "MMMM yyyy")} preview
              </p>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-7 w-7 shrink-0"
                aria-label="Next month"
                disabled={!canPreviewNext}
                onClick={() => setPreviewViewMonth((d) => addMonths(d, 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <div className="grid grid-cols-7 gap-px rounded border border-zinc-200 bg-zinc-200 overflow-hidden text-[10px] max-w-md">
              {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((d) => (
                <div key={d} className="bg-zinc-100 px-1 py-1 text-center font-semibold text-zinc-600">
                  {d}
                </div>
              ))}
              {previewGridDays.map((day) => {
                const iso = format(day, "yyyy-MM-dd");
                const info = getDayInfo(iso, previewCalendar, holidays);
                const inMonth = isSameMonth(day, previewViewMonth);
                return (
                  <div
                    key={iso}
                    title={info.holidayName ? `${info.holidayName} — OFF` : `${info.hours}h`}
                    className={cn(
                      "min-h-[2rem] px-0.5 py-0.5 text-center flex flex-col items-center justify-center gap-0.5 border",
                      inMonth ? dayCellClass(info.classification) : "bg-zinc-50/50 text-zinc-300"
                    )}
                  >
                    {inMonth ? (
                      <>
                        <span className="leading-none">{format(day, "d")}</span>
                        {info.classification === "holiday" && (
                          <span className="text-[7px] font-bold uppercase leading-none text-red-700">
                            OFF
                          </span>
                        )}
                        {info.classification === "weekend" && (
                          <span className="text-[7px] font-semibold uppercase leading-none text-zinc-400">
                            OFF
                          </span>
                        )}
                      </>
                    ) : null}
                  </div>
                );
              })}
            </div>
            <div className="flex flex-wrap gap-3 mt-2 text-[10px] text-zinc-600">
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-red-100 border border-red-200" /> Holiday
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-zinc-100" /> Weekend
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-amber-50 border border-amber-200" /> Reduced hours
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
