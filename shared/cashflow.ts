export type CashflowEntryMode = "percent" | "amount";
export type CashflowKind = "planned" | "actual";

export interface CashflowMonthInput {
  month: string;
  inflowPercent: number;
  inflowAmount: number;
  outflowPercent: number;
  outflowAmount: number;
}

export interface CashflowPlanInput {
  kind: CashflowKind;
  monthsBefore: number;
  monthsAfter: number;
  inflowMode: CashflowEntryMode;
  outflowMode: CashflowEntryMode;
  openingBalance: number;
  months: CashflowMonthInput[];
}

export interface CashflowMonthRow extends CashflowMonthInput {
  label: string;
  inProject: boolean;
  isProjectStart: boolean;
  isProjectEnd: boolean;
}

export interface CashflowPoint {
  month: string;
  label: string;
  inProject: boolean;
  isProjectStart: boolean;
  isProjectEnd: boolean;
  inflow: number;
  outflow: number;
  net: number;
  position: number;
}

export interface CashflowTotals {
  inflow: number;
  outflow: number;
  net: number;
  openingBalance: number;
  positionAtProjectEnd: number | null;
  positionAtWindowEnd: number;
  inflowPercentOfBudget: number;
  outflowPercentOfBudget: number;
  projectMonthCount: number;
  windowMonthCount: number;
}

export type CashflowBuildResult =
  | {
      ok: true;
      projectStartMonth: string;
      projectEndMonth: string;
      months: CashflowMonthRow[];
      series: CashflowPoint[];
      totals: CashflowTotals;
    }
  | { ok: false; error: string };

const MONTH_RE = /^(\d{4})-(0[1-9]|1[0-2])$/;
export const MAX_CASHFLOW_BUFFER_MONTHS = 36;
export const MAX_CASHFLOW_MONTHS = 240;

export function roundTo(value: number, decimals: number): number {
  if (!Number.isFinite(value)) return 0;
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

export function roundMoney(value: number): number {
  return roundTo(value, 2);
}

export function roundPercent(value: number): number {
  return roundTo(value, 4);
}

export function toIsoDate(value: unknown): string | null {
  if (value == null || value === "") return null;
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, "0");
    const d = String(value.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  const text = String(value).trim();
  const match = text.match(/^(\d{4}-\d{2}-\d{2})/);
  if (match) return match[1];
  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) return null;
  return toIsoDate(parsed);
}

export function yearMonthFromDate(isoDate: string): string | null {
  const month = isoDate.slice(0, 7);
  return MONTH_RE.test(month) ? month : null;
}

export function shiftYearMonth(yearMonth: string, delta: number): string {
  const match = yearMonth.match(MONTH_RE);
  if (!match) return yearMonth;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const shifted = new Date(Date.UTC(year, month - 1 + delta, 1));
  const nextYear = shifted.getUTCFullYear();
  const nextMonth = String(shifted.getUTCMonth() + 1).padStart(2, "0");
  return `${nextYear}-${nextMonth}`;
}

export function monthLabel(yearMonth: string): string {
  const match = yearMonth.match(MONTH_RE);
  if (!match) return yearMonth;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, 1));
  return date.toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" });
}

export function emptyCashflowMonth(month: string): CashflowMonthInput {
  return {
    month,
    inflowPercent: 0,
    inflowAmount: 0,
    outflowPercent: 0,
    outflowAmount: 0,
  };
}

function nonNegative(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || n < 0) return 0;
  return n;
}

function applySide(
  percent: number,
  amount: number,
  mode: CashflowEntryMode,
  budget: number
): { percent: number; amount: number } {
  if (mode === "percent") {
    const nextPercent = roundPercent(nonNegative(percent));
    return {
      percent: nextPercent,
      amount: roundMoney((budget * nextPercent) / 100),
    };
  }
  const nextAmount = roundMoney(nonNegative(amount));
  return {
    amount: nextAmount,
    percent: budget > 0 ? roundPercent((nextAmount / budget) * 100) : 0,
  };
}

export function withMonthValue(
  month: CashflowMonthInput,
  side: "inflow" | "outflow",
  mode: CashflowEntryMode,
  value: number,
  budget: number
): CashflowMonthInput {
  const next = { ...month };
  if (side === "inflow") {
    const applied = applySide(
      mode === "percent" ? value : month.inflowPercent,
      mode === "amount" ? value : month.inflowAmount,
      mode,
      budget
    );
    next.inflowPercent = applied.percent;
    next.inflowAmount = applied.amount;
  } else {
    const applied = applySide(
      mode === "percent" ? value : month.outflowPercent,
      mode === "amount" ? value : month.outflowAmount,
      mode,
      budget
    );
    next.outflowPercent = applied.percent;
    next.outflowAmount = applied.amount;
  }
  return next;
}

export function normalizeMonthEntries(
  months: CashflowMonthInput[],
  budget: number,
  inflowMode: CashflowEntryMode,
  outflowMode: CashflowEntryMode
): CashflowMonthInput[] {
  const byMonth = new Map<string, CashflowMonthInput>();
  for (const raw of months) {
    if (!MONTH_RE.test(raw.month)) continue;
    const inflow = applySide(raw.inflowPercent, raw.inflowAmount, inflowMode, budget);
    const outflow = applySide(raw.outflowPercent, raw.outflowAmount, outflowMode, budget);
    byMonth.set(raw.month, {
      month: raw.month,
      inflowPercent: inflow.percent,
      inflowAmount: inflow.amount,
      outflowPercent: outflow.percent,
      outflowAmount: outflow.amount,
    });
  }
  return Array.from(byMonth.values()).sort((a, b) => a.month.localeCompare(b.month));
}

/** Split a total across count buckets. The last bucket absorbs the remainder. */
export function splitTotal(total: number, count: number, decimals: number): number[] {
  if (count <= 0) return [];
  const factor = 10 ** decimals;
  const totalUnits = Math.round(total * factor);
  const baseUnits = Math.floor(totalUnits / count);
  const remainder = totalUnits - baseUnits * count;
  return Array.from({ length: count }, (_, index) => {
    const units = baseUnits + (index === count - 1 ? remainder : 0);
    return units / factor;
  });
}

function clampBuffer(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(MAX_CASHFLOW_BUFFER_MONTHS, Math.max(0, Math.trunc(value)));
}

export function buildCashflow(options: {
  startDate: unknown;
  endDate: unknown;
  budget: number;
  plan: CashflowPlanInput;
}): CashflowBuildResult {
  const startIso = toIsoDate(options.startDate);
  const endIso = toIsoDate(options.endDate);
  if (!startIso || !endIso) {
    return { ok: false, error: "Set a start date and an end date on the project before planning cash flow." };
  }
  const projectStartMonth = yearMonthFromDate(startIso);
  const projectEndMonth = yearMonthFromDate(endIso);
  if (!projectStartMonth || !projectEndMonth) {
    return { ok: false, error: "Project dates are not valid." };
  }
  if (projectEndMonth < projectStartMonth) {
    return { ok: false, error: "The project end date is before the start date." };
  }

  const budget = Number.isFinite(options.budget) ? options.budget : 0;
  const monthsBefore = clampBuffer(options.plan.monthsBefore);
  const monthsAfter = clampBuffer(options.plan.monthsAfter);
  const first = shiftYearMonth(projectStartMonth, -monthsBefore);
  const last = shiftYearMonth(projectEndMonth, monthsAfter);

  const saved = new Map(
    normalizeMonthEntries(
      options.plan.months,
      budget,
      options.plan.inflowMode,
      options.plan.outflowMode
    ).map((month) => [month.month, month])
  );

  const months: CashflowMonthRow[] = [];
  let cursor = first;
  let guard = 0;
  while (cursor <= last) {
    guard += 1;
    if (guard > MAX_CASHFLOW_MONTHS) {
      return { ok: false, error: "The cash flow window is too long. Shorten the project or the months outside it." };
    }
    const stored = saved.get(cursor) ?? emptyCashflowMonth(cursor);
    months.push({
      ...stored,
      month: cursor,
      label: monthLabel(cursor),
      inProject: cursor >= projectStartMonth && cursor <= projectEndMonth,
      isProjectStart: cursor === projectStartMonth,
      isProjectEnd: cursor === projectEndMonth,
    });
    cursor = shiftYearMonth(cursor, 1);
  }

  const openingBalance = Number.isFinite(options.plan.openingBalance) ? roundMoney(options.plan.openingBalance) : 0;
  let running = openingBalance;
  let positionAtProjectEnd: number | null = null;
  const series: CashflowPoint[] = months.map((month) => {
    const net = roundMoney(month.inflowAmount - month.outflowAmount);
    running = roundMoney(running + net);
    if (month.isProjectEnd) positionAtProjectEnd = running;
    return {
      month: month.month,
      label: month.label,
      inProject: month.inProject,
      isProjectStart: month.isProjectStart,
      isProjectEnd: month.isProjectEnd,
      inflow: month.inflowAmount,
      outflow: month.outflowAmount,
      net,
      position: running,
    };
  });

  const inflow = roundMoney(series.reduce((sum, point) => sum + point.inflow, 0));
  const outflow = roundMoney(series.reduce((sum, point) => sum + point.outflow, 0));

  return {
    ok: true,
    projectStartMonth,
    projectEndMonth,
    months,
    series,
    totals: {
      inflow,
      outflow,
      net: roundMoney(inflow - outflow),
      openingBalance,
      positionAtProjectEnd,
      positionAtWindowEnd: series.length ? series[series.length - 1].position : openingBalance,
      inflowPercentOfBudget: budget > 0 ? roundPercent((inflow / budget) * 100) : 0,
      outflowPercentOfBudget: budget > 0 ? roundPercent((outflow / budget) * 100) : 0,
      projectMonthCount: months.filter((month) => month.inProject).length,
      windowMonthCount: months.length,
    },
  };
}

export const BUILTIN_OVERHEAD_CATEGORIES: { key: string; name: string }[] = [
  { key: "salaries", name: "Salaries" },
  { key: "maintenance", name: "Maintenance" },
];

export interface OverheadAmountInput {
  month: string;
  amount: number;
}

export interface OverheadCategoryInput {
  key: string;
  name: string;
  amounts: OverheadAmountInput[];
}

export interface OverheadPlanInput {
  startMonth: string;
  endMonth: string;
  openingBalance: number;
  categories: OverheadCategoryInput[];
}

export interface OverheadMonthRow {
  month: string;
  label: string;
  amounts: Record<string, number>;
  total: number;
}

export interface CompanyFlowPoint {
  month: string;
  label: string;
  projectInflow: number;
  projectOutflow: number;
  overhead: number;
  net: number;
  position: number;
}

export interface CompanyFlowTotals {
  projectInflow: number;
  projectOutflow: number;
  overhead: number;
  net: number;
  openingBalance: number;
  positionAtEnd: number;
}

export function isYearMonth(value: string): boolean {
  return MONTH_RE.test(value);
}

export function listMonths(startMonth: string, endMonth: string): { months: string[] } | { error: string } {
  if (!isYearMonth(startMonth) || !isYearMonth(endMonth)) {
    return { error: "Choose a start month and an end month." };
  }
  if (endMonth < startMonth) {
    return { error: "The end month is before the start month." };
  }
  const months: string[] = [];
  let cursor = startMonth;
  while (cursor <= endMonth) {
    months.push(cursor);
    if (months.length > MAX_CASHFLOW_MONTHS) {
      return { error: "That month range is too long." };
    }
    cursor = shiftYearMonth(cursor, 1);
  }
  return { months };
}

export function categoryAmount(category: OverheadCategoryInput, month: string): number {
  const match = category.amounts.find((entry) => entry.month === month);
  const amount = match ? Number(match.amount) : 0;
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  return roundMoney(amount);
}

function builtinKey(key: string): boolean {
  return BUILTIN_OVERHEAD_CATEGORIES.some((category) => category.key === key);
}

export function normalizeOverheadPlan(plan: OverheadPlanInput): OverheadPlanInput {
  const incoming = new Map<string, OverheadCategoryInput>();
  for (const category of plan.categories) {
    const key = String(category.key || "").trim().toLowerCase();
    if (!/^[a-z0-9-]{1,40}$/.test(key) || incoming.has(key)) continue;
    const amountsByMonth = new Map<string, number>();
    for (const entry of category.amounts || []) {
      if (!isYearMonth(entry.month)) continue;
      const amount = Number(entry.amount);
      if (!Number.isFinite(amount) || amount <= 0) continue;
      amountsByMonth.set(entry.month, roundMoney(amount));
    }
    const amounts = Array.from(amountsByMonth.entries())
      .map(([month, amount]) => ({ month, amount }))
      .sort((a, b) => a.month.localeCompare(b.month));
    const builtin = BUILTIN_OVERHEAD_CATEGORIES.find((item) => item.key === key);
    const name = builtin ? builtin.name : String(category.name || "").trim().slice(0, 80);
    if (!builtin && !name) continue;
    incoming.set(key, { key, name, amounts });
  }

  const categories: OverheadCategoryInput[] = BUILTIN_OVERHEAD_CATEGORIES.map(
    (category) => incoming.get(category.key) ?? { key: category.key, name: category.name, amounts: [] }
  );
  const custom = Array.from(incoming.values())
    .filter((category) => !builtinKey(category.key))
    .sort((a, b) => a.name.localeCompare(b.name));

  return {
    startMonth: plan.startMonth,
    endMonth: plan.endMonth,
    openingBalance: Number.isFinite(plan.openingBalance) ? roundMoney(plan.openingBalance) : 0,
    categories: categories.concat(custom),
  };
}

export function buildOverheadRows(plan: OverheadPlanInput): { rows: OverheadMonthRow[]; total: number } | { error: string } {
  const window = listMonths(plan.startMonth, plan.endMonth);
  if ("error" in window) return window;
  const normalized = normalizeOverheadPlan(plan);
  const rows = window.months.map((month) => {
    const amounts: Record<string, number> = {};
    let total = 0;
    for (const category of normalized.categories) {
      const amount = categoryAmount(category, month);
      amounts[category.key] = amount;
      total = roundMoney(total + amount);
    }
    return { month, label: monthLabel(month), amounts, total };
  });
  return {
    rows,
    total: roundMoney(rows.reduce((sum, row) => sum + row.total, 0)),
  };
}

export function buildCompanySeries(input: {
  openingBalance: number;
  overheadByMonth: { month: string; amount: number }[];
  projectFlows: { month: string; inflow: number; outflow: number }[];
}): { series: CompanyFlowPoint[]; totals: CompanyFlowTotals } | { error: string } {
  const overhead = new Map<string, number>();
  const inflow = new Map<string, number>();
  const outflow = new Map<string, number>();
  const add = (map: Map<string, number>, month: string, amount: number) => {
    if (!isYearMonth(month) || !Number.isFinite(amount)) return;
    map.set(month, roundMoney((map.get(month) || 0) + amount));
  };
  for (const entry of input.overheadByMonth) add(overhead, entry.month, entry.amount);
  for (const entry of input.projectFlows) {
    add(inflow, entry.month, entry.inflow);
    add(outflow, entry.month, entry.outflow);
  }
  const months = Array.from(new Set(Array.from(overhead.keys()).concat(Array.from(inflow.keys()), Array.from(outflow.keys())))).sort();
  if (months.length > MAX_CASHFLOW_MONTHS) {
    return { error: "The combined company cash flow window is too long." };
  }
  const openingBalance = Number.isFinite(input.openingBalance) ? roundMoney(input.openingBalance) : 0;
  let running = openingBalance;
  const series: CompanyFlowPoint[] = months.map((month) => {
    const projectInflow = inflow.get(month) || 0;
    const projectOutflow = outflow.get(month) || 0;
    const overheadAmount = overhead.get(month) || 0;
    const net = roundMoney(projectInflow - projectOutflow - overheadAmount);
    running = roundMoney(running + net);
    return {
      month,
      label: monthLabel(month),
      projectInflow,
      projectOutflow,
      overhead: overheadAmount,
      net,
      position: running,
    };
  });
  const projectInflow = roundMoney(series.reduce((sum, point) => sum + point.projectInflow, 0));
  const projectOutflow = roundMoney(series.reduce((sum, point) => sum + point.projectOutflow, 0));
  const overheadTotal = roundMoney(series.reduce((sum, point) => sum + point.overhead, 0));
  return {
    series,
    totals: {
      projectInflow,
      projectOutflow,
      overhead: overheadTotal,
      net: roundMoney(projectInflow - projectOutflow - overheadTotal),
      openingBalance,
      positionAtEnd: series.length ? series[series.length - 1].position : openingBalance,
    },
  };
}
