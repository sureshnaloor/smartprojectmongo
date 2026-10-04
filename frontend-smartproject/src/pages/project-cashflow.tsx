import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";
import { Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { cn, formatCurrency } from "@/lib/utils";
import {
  buildCashflow,
  emptyCashflowMonth,
  splitTotal,
  withMonthValue,
  type CashflowEntryMode,
  type CashflowMonthInput,
  type CashflowPlanInput,
} from "@shared/cashflow";

interface ProjectMeta {
  id: number;
  name: string;
  budget: number;
  currency: string;
  startDate?: string | null;
  endDate?: string | null;
}

interface LiveProject {
  id: number;
  name: string;
  budget: string | number;
  currency?: string;
  startDate?: string | null;
  endDate?: string | null;
}

interface CashflowResponse {
  project: ProjectMeta;
  saved: boolean;
  updatedAt: string | null;
  error: string | null;
  plan: CashflowPlanInput | null;
  series: unknown[];
  totals: unknown;
}

type Draft = CashflowPlanInput;

function draftKey(draft: Draft): string {
  const months = [...draft.months]
    .map((month) => ({
      month: month.month,
      inflowPercent: month.inflowPercent,
      inflowAmount: month.inflowAmount,
      outflowPercent: month.outflowPercent,
      outflowAmount: month.outflowAmount,
    }))
    .sort((a, b) => a.month.localeCompare(b.month));
  return JSON.stringify({
    monthsBefore: draft.monthsBefore,
    monthsAfter: draft.monthsAfter,
    inflowMode: draft.inflowMode,
    outflowMode: draft.outflowMode,
    openingBalance: draft.openingBalance,
    months,
  });
}

function errorMessage(err: unknown): string {
  if (!(err instanceof Error)) return "Could not save the cash flow plan";
  const jsonStart = err.message.indexOf("{");
  if (jsonStart >= 0) {
    try {
      const body = JSON.parse(err.message.slice(jsonStart)) as { message?: string };
      if (body.message) return body.message;
    } catch {
      /* response was not JSON */
    }
  }
  return err.message;
}

function positionClass(value: number): string {
  if (value > 0) return "text-[var(--status-success)]";
  if (value < 0) return "text-[var(--status-danger)]";
  return "text-[var(--text-secondary)]";
}

function coverageClass(percent: number): string {
  if (Math.abs(percent - 100) < 0.05) return "text-[var(--status-success)]";
  if (percent > 100) return "text-[var(--status-warning)]";
  return "text-[var(--text-secondary)]";
}

export default function ProjectCashflow() {
  const { projectId } = useParams();
  const numericId = Number(projectId);
  const loadedToken = useRef<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [savedKey, setSavedKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");

  const { data, isLoading, isError, error } = useQuery<CashflowResponse>({
    queryKey: [`/api/projects/${projectId}/cashflow`],
    enabled: Number.isFinite(numericId) && numericId > 0,
  });

  const { data: liveProject } = useQuery<LiveProject>({
    queryKey: [`/api/projects/${projectId}`],
    enabled: Number.isFinite(numericId) && numericId > 0,
  });

  useEffect(() => {
    loadedToken.current = null;
    setDraft(null);
    setSavedKey("");
  }, [projectId]);

  useEffect(() => {
    if (!data?.plan) return;
    const token = `${data.saved}:${String(data.updatedAt ?? "new")}`;
    if (loadedToken.current === token) return;
    loadedToken.current = token;
    const next: Draft = {
      kind: "planned",
      monthsBefore: data.plan.monthsBefore ?? 0,
      monthsAfter: data.plan.monthsAfter ?? 0,
      inflowMode: data.plan.inflowMode === "amount" ? "amount" : "percent",
      outflowMode: data.plan.outflowMode === "amount" ? "amount" : "percent",
      openingBalance: Number(data.plan.openingBalance ?? 0),
      months: Array.isArray(data.plan.months) ? data.plan.months : [],
    };
    setDraft(next);
    setSavedKey(draftKey(next));
  }, [data]);

  const budget = liveProject ? Number(liveProject.budget) || 0 : data?.project.budget ?? 0;
  const currency = liveProject?.currency || data?.project.currency || "USD";
  const startDate = liveProject?.startDate ?? data?.project.startDate;
  const endDate = liveProject?.endDate ?? data?.project.endDate;

  const view = useMemo(() => {
    if (!draft) return null;
    return buildCashflow({
      startDate,
      endDate,
      budget,
      plan: draft,
    });
  }, [draft, startDate, endDate, budget]);

  const dirty = !!draft && draftKey(draft) !== savedKey;

  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  const updateMonth = (month: string, side: "inflow" | "outflow", value: number) => {
    setDraft((current) => {
      if (!current) return current;
      const mode = side === "inflow" ? current.inflowMode : current.outflowMode;
      const existing = current.months.find((row) => row.month === month) ?? emptyCashflowMonth(month);
      const nextMonth = withMonthValue(existing, side, mode, value, budget);
      const months = current.months.some((row) => row.month === month)
        ? current.months.map((row) => (row.month === month ? nextMonth : row))
        : [...current.months, nextMonth];
      return { ...current, months };
    });
  };

  const setMode = (side: "inflow" | "outflow", mode: CashflowEntryMode) => {
    setDraft((current) => {
      if (!current || !view || !view.ok) return current;
      const months = view.months.map((row) => ({
        month: row.month,
        inflowPercent: row.inflowPercent,
        inflowAmount: row.inflowAmount,
        outflowPercent: row.outflowPercent,
        outflowAmount: row.outflowAmount,
      }));
      const outside = current.months.filter((row) => !months.some((visible) => visible.month === row.month));
      if (side === "inflow") return { ...current, inflowMode: mode, months: [...months, ...outside] };
      return { ...current, outflowMode: mode, months: [...months, ...outside] };
    });
    setEditingKey(null);
  };

  const spreadBudget = (side: "inflow" | "outflow") => {
    if (!draft || !view || !view.ok) return;
    if (budget <= 0) {
      toast.error("Set a project budget before splitting it across months.");
      return;
    }
    const projectMonths = view.months.filter((month) => month.inProject);
    if (projectMonths.length === 0) return;
    const hasValues = projectMonths.some((month) =>
      side === "inflow" ? month.inflowAmount > 0 || month.inflowPercent > 0 : month.outflowAmount > 0 || month.outflowPercent > 0
    );
    if (hasValues && !window.confirm("Replace the current project-month entries with an even split of the budget?")) {
      return;
    }
    const percents = splitTotal(100, projectMonths.length, 4);
    const amounts = splitTotal(budget, projectMonths.length, 2);
    const projectIndex = new Map(projectMonths.map((month, index) => [month.month, index]));
    setDraft((current) => {
      if (!current) return current;
      const byMonth = new Map(current.months.map((month) => [month.month, { ...month }]));
      for (const row of view.months) {
        const existing = byMonth.get(row.month) ?? emptyCashflowMonth(row.month);
        const index = projectIndex.get(row.month);
        const percent = index == null ? 0 : percents[index];
        const amount = index == null ? 0 : amounts[index];
        if (side === "inflow") {
          existing.inflowPercent = percent;
          existing.inflowAmount = amount;
        } else {
          existing.outflowPercent = percent;
          existing.outflowAmount = amount;
        }
        byMonth.set(row.month, existing);
      }
      return { ...current, months: Array.from(byMonth.values()) };
    });
  };

  const save = async () => {
    if (!draft || !view || !view.ok) return;
    setSaving(true);
    try {
      const response = await apiRequest("PUT", `/api/projects/${projectId}/cashflow`, {
        kind: "planned",
        monthsBefore: draft.monthsBefore,
        monthsAfter: draft.monthsAfter,
        inflowMode: draft.inflowMode,
        outflowMode: draft.outflowMode,
        openingBalance: draft.openingBalance,
        months: draft.months,
      });
      const saved = (await response.json()) as CashflowResponse;
      queryClient.setQueryData([`/api/projects/${projectId}/cashflow`], saved);
      queryClient.invalidateQueries({ queryKey: ["/api/cashflow/company"] });
      toast.success("Planned cash flow saved");
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  if (isError) {
    return (
      <div className="cp-card max-w-xl">
        <p className="cp-heading-md">Cash flow could not be loaded</p>
        <p className="cp-body-md mt-2 text-[var(--text-secondary)]">{errorMessage(error)}</p>
      </div>
    );
  }

  if (isLoading || !draft) {
    return (
      <div className="mx-auto max-w-6xl space-y-4">
        <div className="cp-skeleton h-10 w-64" />
        <div className="cp-skeleton h-40 w-full" />
        <div className="cp-skeleton h-72 w-full" />
      </div>
    );
  }

  const ready = !!view && view.ok;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 pb-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-[var(--copper-500)]" strokeWidth={1.5} />
            <h2 className="cp-heading-md text-xl">Cash flow analysis</h2>
          </div>
          <p className="cp-body-md mt-1 max-w-2xl text-[var(--text-secondary)]">
            Plan monthly billing and expenses for this project. Company overhead and the combined company total are on the tabs above.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {dirty && <span className="cp-caption text-[var(--status-warning)]">Unsaved changes</span>}
          <Button onClick={save} disabled={!dirty || saving || !ready}>
            {saving ? "Saving…" : "Save plan"}
          </Button>
        </div>
      </div>

      <div className="cp-tabs-underline">
        <button type="button" className="cp-tab-underline cp-tab-underline--active">
          Planned
        </button>
        <button
          type="button"
          className="cp-tab-underline cursor-not-allowed opacity-50"
          disabled
          title="Actual cash flow will use the same monthly layout"
        >
          Actual
        </button>
      </div>

      {!ready && view && !view.ok && (
        <div className="cp-card border-[var(--status-warning)] bg-[var(--status-warning-bg)]">
          <p className="cp-body-md text-[var(--text-primary)]">{view.error}</p>
        </div>
      )}

      {ready && view.ok && (
        <>
          <section className="cp-card space-y-5">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="cp-heading-md">Planning window</p>
                <p className="cp-body-sm mt-1 text-[var(--text-secondary)]">
                  {view.months[0]?.label} – {view.months[view.months.length - 1]?.label}
                  {" · "}
                  {view.totals.windowMonthCount} months, {view.totals.projectMonthCount} inside the project
                </p>
              </div>
              <p className="cp-body-sm text-[var(--text-secondary)]">
                Budget {formatCurrency(budget, currency)}
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Stepper
                label="Months before start"
                value={draft.monthsBefore}
                onChange={(monthsBefore) => setDraft({ ...draft, monthsBefore })}
              />
              <Stepper
                label="Months after finish"
                value={draft.monthsAfter}
                onChange={(monthsAfter) => setDraft({ ...draft, monthsAfter })}
              />
              <LabeledNumber
                label="Opening cash"
                value={draft.openingBalance}
                allowNegative
                editingKey={editingKey}
                editingText={editingText}
                fieldKey="opening"
                onFocus={(text) => {
                  setEditingKey("opening");
                  setEditingText(text);
                }}
                onText={setEditingText}
                onCommit={(openingBalance) => {
                  setDraft((current) => (current ? { ...current, openingBalance } : current));
                }}
                onFinished={() => setEditingKey(null)}
              />
              <div className="cp-body-sm text-[var(--text-secondary)] lg:pt-6">
                Months outside the project dates stay in the plan for mobilization, retention, and close-out.
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <ModeCard
                title="Inflow — revenue / billing"
                mode={draft.inflowMode}
                coverage={view.totals.inflowPercentOfBudget}
                onMode={(mode) => setMode("inflow", mode)}
                onSpread={() => spreadBudget("inflow")}
              />
              <ModeCard
                title="Outflow — expenses"
                mode={draft.outflowMode}
                coverage={view.totals.outflowPercentOfBudget}
                onMode={(mode) => setMode("outflow", mode)}
                onSpread={() => spreadBudget("outflow")}
              />
            </div>
            {budget <= 0 && (
              <p className="cp-body-sm text-[var(--status-warning)]">
                This project’s budget is zero, so a percent of budget stays at zero. Enter monthly amounts, or set the project budget first.
              </p>
            )}
          </section>

          <section className="cp-card overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead>
                  <tr className="cp-table-header">
                    <th className="px-4 py-3 text-left">Month</th>
                    <th className="px-4 py-3 text-right">Inflow</th>
                    <th className="px-4 py-3 text-right">Outflow</th>
                    <th className="px-4 py-3 text-right">Monthly net</th>
                    <th className="px-4 py-3 text-right">Cash position</th>
                  </tr>
                </thead>
                <tbody>
                  {view.months.map((month, index) => {
                    const point = view.series[index];
                    return (
                      <tr
                        key={month.month}
                        className={cn(
                          "border-t border-[var(--border-subtle)]",
                          !month.inProject && "bg-[var(--bg-warm-gray)]",
                          month.isProjectEnd && "bg-[var(--copper-50)]"
                        )}
                      >
                        <td className="px-4 py-3">
                          <div className="font-medium text-[var(--text-primary)]">{month.label}</div>
                          <div className="mt-1 flex flex-wrap gap-1">
                            <span className="cp-badge cp-badge--neutral">
                              {month.inProject ? "Project" : month.month < view.projectStartMonth ? "Before start" : "After finish"}
                            </span>
                            {month.isProjectStart && <span className="cp-badge cp-badge--info">Start</span>}
                            {month.isProjectEnd && <span className="cp-badge cp-badge--warning">Project end</span>}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <EntryCell
                            month={month.month}
                            side="inflow"
                            mode={draft.inflowMode}
                            percent={month.inflowPercent}
                            amount={month.inflowAmount}
                            currency={currency}
                            editingKey={editingKey}
                            editingText={editingText}
                            onFocus={(key, text) => {
                              setEditingKey(key);
                              setEditingText(text);
                            }}
                            onText={setEditingText}
                            onCommit={(value) => updateMonth(month.month, "inflow", value)}
                            onBlur={() => setEditingKey(null)}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <EntryCell
                            month={month.month}
                            side="outflow"
                            mode={draft.outflowMode}
                            percent={month.outflowPercent}
                            amount={month.outflowAmount}
                            currency={currency}
                            editingKey={editingKey}
                            editingText={editingText}
                            onFocus={(key, text) => {
                              setEditingKey(key);
                              setEditingText(text);
                            }}
                            onText={setEditingText}
                            onCommit={(value) => updateMonth(month.month, "outflow", value)}
                            onBlur={() => setEditingKey(null)}
                          />
                        </td>
                        <td className={cn("px-4 py-3 text-right font-medium tabular-nums", positionClass(point.net))}>
                          {formatCurrency(point.net, currency)}
                        </td>
                        <td className={cn("px-4 py-3 text-right font-semibold tabular-nums", positionClass(point.position))}>
                          {formatCurrency(point.position, currency)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t border-[var(--border-subtle)] bg-[var(--bg-warm-gray)]">
                    <td className="px-4 py-3 font-medium">Window total</td>
                    <td className="px-4 py-3 text-right font-medium tabular-nums">{formatCurrency(view.totals.inflow, currency)}</td>
                    <td className="px-4 py-3 text-right font-medium tabular-nums">{formatCurrency(view.totals.outflow, currency)}</td>
                    <td className={cn("px-4 py-3 text-right font-medium tabular-nums", positionClass(view.totals.net))}>
                      {formatCurrency(view.totals.net, currency)}
                    </td>
                    <td className={cn("px-4 py-3 text-right font-semibold tabular-nums", positionClass(view.totals.positionAtWindowEnd))}>
                      {formatCurrency(view.totals.positionAtWindowEnd, currency)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </section>

          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard label="Total inflow" value={formatCurrency(view.totals.inflow, currency)} hint={`${view.totals.inflowPercentOfBudget}% of budget`} />
            <SummaryCard label="Total outflow" value={formatCurrency(view.totals.outflow, currency)} hint={`${view.totals.outflowPercentOfBudget}% of budget`} />
            <SummaryCard
              label="Position at project end"
              value={formatCurrency(view.totals.positionAtProjectEnd ?? 0, currency)}
              hint="End of the finish month"
              tone={view.totals.positionAtProjectEnd ?? 0}
            />
            <SummaryCard
              label="Position at window end"
              value={formatCurrency(view.totals.positionAtWindowEnd, currency)}
              hint={draft.monthsAfter > 0 ? "Includes months after finish" : "Same month as project end"}
              tone={view.totals.positionAtWindowEnd}
            />
          </section>

          <section className="cp-card">
            <div className="mb-4">
              <p className="cp-heading-md">Net cash position</p>
              <p className="cp-body-sm mt-1 text-[var(--text-secondary)]">
                Each point is the cash position at month end. The darker point is the end of the project.
              </p>
            </div>
            <div className="h-[340px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={view.series} margin={{ top: 12, right: 12, left: 8, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: "var(--text-secondary)" }}
                    interval={view.series.length > 18 ? Math.ceil(view.series.length / 12) - 1 : 0}
                    angle={view.series.length > 14 ? -40 : 0}
                    textAnchor={view.series.length > 14 ? "end" : "middle"}
                    height={view.series.length > 14 ? 64 : 32}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "var(--text-secondary)" }}
                    tickFormatter={(value: number) =>
                      new Intl.NumberFormat("en-IN", {
                        notation: "compact",
                        style: "currency",
                        currency,
                        maximumFractionDigits: 1,
                      }).format(value)
                    }
                    width={84}
                  />
                  <Tooltip
                    formatter={(value, name) => [formatCurrency(Number(value ?? 0), currency), name]}
                    contentStyle={{ borderRadius: 8, borderColor: "var(--border-subtle)", fontSize: 12 }}
                  />
                  <Legend />
                  <ReferenceLine y={0} stroke="var(--text-muted)" strokeDasharray="4 4" />
                  <Area
                    type="monotone"
                    dataKey="position"
                    name="Cash position"
                    stroke="#C17817"
                    fill="#C17817"
                    fillOpacity={0.12}
                    strokeWidth={2.5}
                    dot={(dotProps) => <PositionDot {...dotProps} />}
                    activeDot={{ r: 5 }}
                  />
                  <Line type="monotone" dataKey="inflow" name="Inflow" stroke="#15803d" strokeWidth={1.5} dot={false} />
                  <Line type="monotone" dataKey="outflow" name="Outflow" stroke="#b91c1c" strokeWidth={1.5} dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function PositionDot(props: { cx?: number; cy?: number; payload?: { isProjectEnd?: boolean; month?: string } }) {
  const { cx, cy, payload } = props;
  if (cx == null || cy == null) return <g />;
  const end = payload?.isProjectEnd;
  return (
    <circle
      cx={cx}
      cy={cy}
      r={end ? 6 : 3}
      fill={end ? "#0F1729" : "#C17817"}
      stroke="#C17817"
      strokeWidth={end ? 2 : 0}
    />
  );
}

function SummaryCard({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint: string;
  tone?: number;
}) {
  return (
    <div className="cp-card cp-card--compact">
      <p className="cp-caption uppercase tracking-wide text-[var(--text-secondary)]">{label}</p>
      <p className={cn("mt-2 text-lg font-semibold tabular-nums", tone == null ? "text-[var(--text-primary)]" : positionClass(tone))}>
        {value}
      </p>
      <p className="cp-body-sm mt-1 text-[var(--text-secondary)]">{hint}</p>
    </div>
  );
}

function ModeCard({
  title,
  mode,
  coverage,
  onMode,
  onSpread,
}: {
  title: string;
  mode: CashflowEntryMode;
  coverage: number;
  onMode: (mode: CashflowEntryMode) => void;
  onSpread: () => void;
}) {
  return (
    <div className="rounded-md border border-[var(--border-subtle)] p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="cp-body-md font-medium text-[var(--text-primary)]">{title}</p>
        <div className="flex rounded-md border border-[var(--border-subtle)] p-0.5">
          <ModeButton active={mode === "percent"} onClick={() => onMode("percent")}>
            % of budget
          </ModeButton>
          <ModeButton active={mode === "amount"} onClick={() => onMode("amount")}>
            Monthly amount
          </ModeButton>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <p className={cn("cp-body-sm", coverageClass(coverage))}>
          {coverage}% of the project budget is assigned
          {coverage < 99.95 ? ` · ${(Math.round((100 - coverage) * 100) / 100)}% still open` : ""}
          {coverage > 100.05 ? " · above budget" : ""}
        </p>
        <button type="button" className="cp-caption text-[var(--copper-600)] hover:underline" onClick={onSpread}>
          Split budget across project months
        </button>
      </div>
    </div>
  );
}

function ModeButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded px-2.5 py-1 text-xs font-medium",
        active ? "bg-[var(--navy-900)] text-white" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
      )}
    >
      {children}
    </button>
  );
}

function Stepper({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <label className="block">
      <span className="cp-caption uppercase tracking-wide text-[var(--text-secondary)]">{label}</span>
      <div className="mt-1.5 flex items-center gap-2">
        <button
          type="button"
          className="h-9 w-9 rounded-md border border-[var(--border-subtle)] text-lg leading-none text-[var(--text-primary)] disabled:opacity-40"
          onClick={() => onChange(Math.max(0, value - 1))}
          disabled={value <= 0}
          aria-label={`Decrease ${label}`}
        >
          −
        </button>
        <input
          type="number"
          min={0}
          max={36}
          value={value}
          onChange={(event) => {
            const next = Number(event.target.value);
            if (!Number.isFinite(next)) return;
            onChange(Math.min(36, Math.max(0, Math.trunc(next))));
          }}
          className="h-9 w-16 rounded-md border border-[var(--border-subtle)] bg-white px-2 text-center text-sm"
        />
        <button
          type="button"
          className="h-9 w-9 rounded-md border border-[var(--border-subtle)] text-lg leading-none text-[var(--text-primary)] disabled:opacity-40"
          onClick={() => onChange(Math.min(36, value + 1))}
          disabled={value >= 36}
          aria-label={`Increase ${label}`}
        >
          +
        </button>
      </div>
    </label>
  );
}

function LabeledNumber({
  label,
  value,
  allowNegative,
  editingKey,
  editingText,
  fieldKey,
  onFocus,
  onText,
  onCommit,
  onFinished,
}: {
  label: string;
  value: number;
  allowNegative?: boolean;
  editingKey: string | null;
  editingText: string;
  fieldKey: string;
  onFocus: (text: string) => void;
  onText: (text: string) => void;
  onCommit: (value: number) => void;
  onFinished: () => void;
}) {
  const editing = editingKey === fieldKey;
  return (
    <label className="block">
      <span className="cp-caption uppercase tracking-wide text-[var(--text-secondary)]">{label}</span>
      <input
        inputMode="decimal"
        value={editing ? editingText : value === 0 ? "" : String(value)}
        placeholder="0"
        onFocus={() => onFocus(value === 0 ? "" : String(value))}
        onChange={(event) => {
          const text = event.target.value;
          const pattern = allowNegative ? /^-?\d*\.?\d*$/ : /^\d*\.?\d*$/;
          if (text !== "" && text !== "-" && !pattern.test(text)) return;
          onText(text);
          if (text === "" || text === "-" || text === "." || text === "-.") return;
          const parsed = Number(text);
          if (Number.isFinite(parsed)) onCommit(Math.round(parsed * 100) / 100);
        }}
        onBlur={() => {
          const text = editing ? editingText.trim() : String(value);
          if (text === "" || text === "-" || text === "." || text === "-.") {
            onCommit(0);
          } else {
            const parsed = Number(text);
            onCommit(Number.isFinite(parsed) ? Math.round(parsed * 100) / 100 : 0);
          }
          onFinished();
        }}
        className="mt-1.5 h-9 w-full rounded-md border border-[var(--border-subtle)] bg-white px-3 text-sm tabular-nums"
      />
    </label>
  );
}

function EntryCell({
  month,
  side,
  mode,
  percent,
  amount,
  currency,
  editingKey,
  editingText,
  onFocus,
  onText,
  onCommit,
  onBlur,
}: {
  month: string;
  side: "inflow" | "outflow";
  mode: CashflowEntryMode;
  percent: number;
  amount: number;
  currency: string;
  editingKey: string | null;
  editingText: string;
  onFocus: (key: string, text: string) => void;
  onText: (text: string) => void;
  onCommit: (value: number) => void;
  onBlur: () => void;
}) {
  const key = `${month}:${side}`;
  const editing = editingKey === key;
  const source = mode === "percent" ? percent : amount;
  const shown = editing ? editingText : source === 0 ? "" : String(source);

  return (
    <div className="ml-auto w-36">
      <div className="relative">
        <input
          inputMode="decimal"
          aria-label={`${month} ${side}`}
          value={shown}
          placeholder="0"
          onFocus={() => onFocus(key, source === 0 ? "" : String(source))}
          onChange={(event) => {
            const text = event.target.value;
            if (text !== "" && !/^\d*\.?\d*$/.test(text)) return;
            onText(text);
            if (text === "" || text === ".") {
              onCommit(0);
              return;
            }
            const parsed = Number(text);
            if (Number.isFinite(parsed) && parsed >= 0) onCommit(parsed);
          }}
          onBlur={onBlur}
          className={cn(
            "h-9 w-full rounded-md border border-[var(--border-subtle)] bg-white text-right text-sm tabular-nums",
            mode === "percent" ? "px-2 pr-7" : "px-2"
          )}
        />
        {mode === "percent" && (
          <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-[var(--text-secondary)]">%</span>
        )}
      </div>
      <p className="cp-caption mt-1 text-right text-[var(--text-secondary)]">
        {mode === "percent" ? formatCurrency(amount, currency) : `${percent}% of budget`}
      </p>
    </div>
  );
}
