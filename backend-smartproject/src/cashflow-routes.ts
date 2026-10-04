import type { Express, Request, Response } from "express";
import { buildCashflow, buildCompanySeries, buildOverheadRows, normalizeMonthEntries, normalizeOverheadPlan } from "../../shared/cashflow.ts";
import type { CashflowPlanInput, OverheadPlanInput } from "../../shared/cashflow.ts";
import { upsertCashflowPlanSchema, upsertCompanyOverheadSchema } from "./schema";
import { storage } from "./storage";

function projectMeta(project: {
  id: number;
  name?: string;
  budget?: unknown;
  currency?: string | null;
  startDate?: unknown;
  endDate?: unknown;
}) {
  const budget = Number(project.budget);
  return {
    id: project.id,
    name: project.name ?? "",
    budget: Number.isFinite(budget) ? budget : 0,
    currency: project.currency || "USD",
    startDate: project.startDate ?? null,
    endDate: project.endDate ?? null,
  };
}

function storedPlan(doc: Record<string, unknown> | undefined, fallback: CashflowPlanInput): CashflowPlanInput {
  if (!doc) return fallback;
  return {
    kind: "planned",
    monthsBefore: Number(doc.monthsBefore ?? 0),
    monthsAfter: Number(doc.monthsAfter ?? 0),
    inflowMode: doc.inflowMode === "amount" ? "amount" : "percent",
    outflowMode: doc.outflowMode === "amount" ? "amount" : "percent",
    openingBalance: Number(doc.openingBalance ?? 0),
    months: Array.isArray(doc.months) ? (doc.months as CashflowPlanInput["months"]) : [],
  };
}

function viewPayload(
  project: ReturnType<typeof projectMeta>,
  plan: CashflowPlanInput,
  saved: boolean,
  updatedAt: unknown
) {
  const months = normalizeMonthEntries(plan.months, project.budget, plan.inflowMode, plan.outflowMode);
  const normalized = { ...plan, months };
  const built = buildCashflow({
    startDate: project.startDate,
    endDate: project.endDate,
    budget: project.budget,
    plan: normalized,
  });
  if ("error" in built) {
    return {
      project,
      saved,
      updatedAt: updatedAt ?? null,
      error: built.error,
      plan: normalized,
      series: [],
      totals: null,
    };
  }
  return {
    project,
    saved,
    updatedAt: updatedAt ?? null,
    error: null,
    plan: normalized,
    series: built.series,
    totals: built.totals,
  };
}

export function registerCashflowRoutes(
  app: Express,
  handleError: (err: unknown, res: Response) => void
) {
  app.get("/api/projects/:projectId/cashflow", async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.projectId, 10);
      if (isNaN(projectId)) {
        return res.status(400).json({ message: "Invalid project ID" });
      }
      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      const doc = (await storage.getCashflowPlan(projectId, "planned")) as Record<string, unknown> | undefined;
      const plan = storedPlan(doc, {
        kind: "planned",
        monthsBefore: 0,
        monthsAfter: 0,
        inflowMode: "percent",
        outflowMode: "percent",
        openingBalance: 0,
        months: [],
      });
      res.json(viewPayload(projectMeta(project), plan, !!doc, doc?.updatedAt));
    } catch (err) {
      handleError(err, res);
    }
  });

  app.put("/api/projects/:projectId/cashflow", async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.projectId, 10);
      if (isNaN(projectId)) {
        return res.status(400).json({ message: "Invalid project ID" });
      }
      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      const meta = projectMeta(project);
      const parsed = upsertCashflowPlanSchema.parse(req.body);
      const plan: CashflowPlanInput = {
        kind: "planned",
        monthsBefore: parsed.monthsBefore,
        monthsAfter: parsed.monthsAfter,
        inflowMode: parsed.inflowMode,
        outflowMode: parsed.outflowMode,
        openingBalance: parsed.openingBalance,
        months: parsed.months.map((month) => ({
          month: month.month,
          inflowPercent: month.inflowPercent,
          inflowAmount: month.inflowAmount,
          outflowPercent: month.outflowPercent,
          outflowAmount: month.outflowAmount,
        })),
      };
      const preview = buildCashflow({
        startDate: meta.startDate,
        endDate: meta.endDate,
        budget: meta.budget,
        plan,
      });
      if ("error" in preview) {
        return res.status(400).json({ message: preview.error });
      }
      const months = normalizeMonthEntries(plan.months, meta.budget, plan.inflowMode, plan.outflowMode);
      const saved = (await storage.upsertCashflowPlan(projectId, "planned", {
        monthsBefore: plan.monthsBefore,
        monthsAfter: plan.monthsAfter,
        inflowMode: plan.inflowMode,
        outflowMode: plan.outflowMode,
        openingBalance: plan.openingBalance,
        months,
      })) as Record<string, unknown> | undefined;
      res.json(viewPayload(meta, { ...plan, months }, true, saved?.updatedAt ?? new Date()));
    } catch (err) {
      handleError(err, res);
    }
  });

  app.get("/api/cashflow/overhead", async (_req: Request, res: Response) => {
    try {
      res.set("Cache-Control", "no-store");
      res.json(await overheadPayload());
    } catch (err) {
      handleError(err, res);
    }
  });

  app.put("/api/cashflow/overhead", async (req: Request, res: Response) => {
    try {
      const parsed = upsertCompanyOverheadSchema.parse(req.body);
      const plan = normalizeOverheadPlan({
        startMonth: parsed.startMonth,
        endMonth: parsed.endMonth,
        openingBalance: parsed.openingBalance,
        categories: parsed.categories.map((category) => ({
          key: category.key,
          name: category.name,
          amounts: category.amounts.map((entry) => ({
            month: entry.month,
            amount: entry.amount,
          })),
        })),
      });
      const preview = buildOverheadRows(plan);
      if ("error" in preview) {
        return res.status(400).json({ message: preview.error });
      }
      const saved = (await storage.upsertCompanyOverhead(plan as unknown as Record<string, unknown>)) as Record<string, unknown> | undefined;
      res.set("Cache-Control", "no-store");
      res.json(await overheadPayload(saved?.updatedAt));
    } catch (err) {
      handleError(err, res);
    }
  });

  app.get("/api/cashflow/company", async (_req: Request, res: Response) => {
    try {
      res.set("Cache-Control", "no-store");
      res.json(await companyPayload());
    } catch (err) {
      handleError(err, res);
    }
  });
}

function currentYearWindow() {
  const year = new Date().getFullYear();
  return { startMonth: `${year}-01`, endMonth: `${year}-12` };
}

async function overheadPayload(updatedAt?: unknown) {
  const defaults = await storage.getGlobalDefaults();
  const doc = (await storage.getCompanyOverhead()) as Record<string, unknown> | undefined;
  const fallbackWindow = currentYearWindow();
  const plan = normalizeOverheadPlan({
    startMonth: typeof doc?.startMonth === "string" ? doc.startMonth : fallbackWindow.startMonth,
    endMonth: typeof doc?.endMonth === "string" ? doc.endMonth : fallbackWindow.endMonth,
    openingBalance: Number(doc?.openingBalance ?? 0),
    categories: Array.isArray(doc?.categories) ? (doc.categories as OverheadPlanInput["categories"]) : [],
  });
  const built = buildOverheadRows(plan);
  return {
    currency: defaults.defaultCurrencyCode || "USD",
    companyName: defaults.companyName,
    saved: !!doc,
    updatedAt: updatedAt ?? doc?.updatedAt ?? null,
    error: "error" in built ? built.error : null,
    plan,
    rows: "error" in built ? [] : built.rows,
    total: "error" in built ? 0 : built.total,
  };
}

async function companyPayload() {
  const defaults = await storage.getGlobalDefaults();
  const currency = defaults.defaultCurrencyCode || "USD";
  const projects = await storage.getProjects();
  const plans = await storage.listCashflowPlans("planned");
  const planByProject = new Map<number, Record<string, unknown>>();
  for (const plan of plans) {
    const projectId = Number(plan.projectId);
    if (Number.isFinite(projectId)) planByProject.set(projectId, plan);
  }

  const overheadDoc = (await storage.getCompanyOverhead()) as Record<string, unknown> | undefined;
  const overheadPlan = normalizeOverheadPlan({
    startMonth: typeof overheadDoc?.startMonth === "string" ? overheadDoc.startMonth : currentYearWindow().startMonth,
    endMonth: typeof overheadDoc?.endMonth === "string" ? overheadDoc.endMonth : currentYearWindow().endMonth,
    openingBalance: Number(overheadDoc?.openingBalance ?? 0),
    categories: Array.isArray(overheadDoc?.categories) ? (overheadDoc.categories as OverheadPlanInput["categories"]) : [],
  });
  const overheadView = buildOverheadRows(overheadPlan);
  const overheadByMonth = "error" in overheadView
    ? []
    : overheadView.rows.filter((row) => row.total > 0).map((row) => ({ month: row.month, amount: row.total }));

  const included: {
    id: number;
    name: string;
    currency: string;
    inflow: number;
    outflow: number;
    net: number;
    startMonth: string;
    endMonth: string;
  }[] = [];
  const excluded: { id: number; name: string; reason: string }[] = [];
  const projectFlows: { month: string; inflow: number; outflow: number }[] = [];

  for (const project of projects) {
    const id = Number(project.id);
    const name = String(project.name || `Project ${id}`);
    const projectCurrency = String(project.currency || currency);
    const doc = planByProject.get(id);
    if (!doc) {
      excluded.push({ id, name, reason: "No cash flow estimate yet." });
      continue;
    }
    const plan: CashflowPlanInput = {
      kind: "planned",
      monthsBefore: Number(doc.monthsBefore ?? 0),
      monthsAfter: Number(doc.monthsAfter ?? 0),
      inflowMode: doc.inflowMode === "amount" ? "amount" : "percent",
      outflowMode: doc.outflowMode === "amount" ? "amount" : "percent",
      openingBalance: Number(doc.openingBalance ?? 0),
      months: Array.isArray(doc.months) ? (doc.months as CashflowPlanInput["months"]) : [],
    };
    const built = buildCashflow({
      startDate: project.startDate,
      endDate: project.endDate,
      budget: Number(project.budget) || 0,
      plan,
    });
    if ("error" in built) {
      excluded.push({ id, name, reason: built.error });
      continue;
    }
    const hasAmounts = built.series.some((point) => point.inflow > 0 || point.outflow > 0);
    if (!hasAmounts) {
      excluded.push({ id, name, reason: "Estimate saved, but every month is still zero." });
      continue;
    }
    for (const point of built.series) {
      if (point.inflow || point.outflow) {
        projectFlows.push({ month: point.month, inflow: point.inflow, outflow: point.outflow });
      }
    }
    included.push({
      id,
      name,
      currency: projectCurrency,
      inflow: built.totals.inflow,
      outflow: built.totals.outflow,
      net: built.totals.net,
      startMonth: built.series[0]?.month ?? "",
      endMonth: built.series[built.series.length - 1]?.month ?? "",
    });
  }

  const usedCurrencies = Array.from(new Set(included.map((project) => project.currency)));
  const mixedCurrencies = usedCurrencies.length > 1;

  const company = buildCompanySeries({
    openingBalance: overheadPlan.openingBalance,
    overheadByMonth,
    projectFlows,
  });
  if ("error" in company) {
    return {
      currency,
      companyName: defaults.companyName,
      error: company.error,
      included,
      excluded,
      series: [],
      totals: null,
      overhead: null,
    };
  }

  included.sort((a, b) => a.name.localeCompare(b.name));
  excluded.sort((a, b) => a.name.localeCompare(b.name));
  return {
    currency: usedCurrencies.length === 1 ? usedCurrencies[0] : currency,
    companyName: defaults.companyName,
    mixedCurrencies,
    error: null,
    included,
    excluded,
    series: company.series,
    totals: company.totals,
    overhead: {
      saved: !!overheadDoc,
      startMonth: overheadPlan.startMonth,
      endMonth: overheadPlan.endMonth,
      openingBalance: overheadPlan.openingBalance,
      total: "error" in overheadView ? 0 : overheadView.total,
      categories: overheadPlan.categories.map((category) => ({
        key: category.key,
        name: category.name,
        total: category.amounts.reduce((sum, entry) => sum + entry.amount, 0),
      })),
    },
  };
}
