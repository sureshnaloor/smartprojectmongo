import { db } from "./db.js";
import { storage } from "./storage.js";
import type { DefaultCalendar, ProjectResource } from "./schema.js";
import {
  buildCalendarDayMap,
  workingDaysBetween,
  type CalendarDayInfo,
} from "./work-calendar.js";

const ONBOARD_TYPES = ["manpower", "rental_manpower", "equipment", "rental_equipment"] as const;
type OnboardResourceType = (typeof ONBOARD_TYPES)[number];

type EntityRef = {
  entityType: "employee" | "rental_manpower" | "equipment" | "rental_equipment";
  entityId: number;
};

export type OnboardingScope = {
  projectId: number;
  wbsItemId?: number;
  wpId?: number;
  activityId?: number;
};

export type OnboardingDeficiency = {
  projectResourceId: number;
  projectId: number;
  wpId: number;
  projectActivityId: number | null;
  activityName: string | null;
  wpCode: string;
  wpName: string;
  globalResourceId: number | null;
  resourceName: string;
  resourceType: OnboardResourceType;
  date: string;
  requiredCount: number;
  assignedCount: number;
  shortfall: number;
};

export type OnboardingResult = {
  runId: number;
  scope: OnboardingScope;
  assignmentsCreated: number;
  deficiencies: OnboardingDeficiency[];
  resourcesProcessed: number;
  workingDaysProcessed: number;
  dateRange: { start: string; end: string };
};

function toIsoDate(d: unknown): string | null {
  if (d == null || d === "") return null;
  const s = String(d);
  return s.length >= 10 ? s.slice(0, 10) : null;
}

function parseQty(value: unknown): number {
  const n = Number.parseFloat(String(value ?? "0"));
  return Number.isFinite(n) ? n : 0;
}

function isHoursUom(uom: string): boolean {
  const u = uom.trim().toUpperCase();
  return u === "H" || u === "HR" || u === "HOUR" || u === "HOURS";
}

/** Headcount needed on a working day for this project-resource line. */
function requiredHeadcountForDay(
  quantity: number,
  uom: string,
  dayHours: number,
  workingDaysInRange: number
): number {
  if (quantity <= 0 || dayHours <= 0) return 0;
  if (isHoursUom(uom)) {
    if (quantity <= 24) {
      return Math.max(1, Math.ceil(quantity / dayHours));
    }
    const totalCapacity = workingDaysInRange * dayHours;
    if (totalCapacity <= 0) return Math.max(1, Math.ceil(quantity / dayHours));
    const dailyHours = quantity / workingDaysInRange;
    return dailyHours >= dayHours * 0.25 ? Math.max(1, Math.ceil(dailyHours / dayHours)) : dailyHours > 0 ? 1 : 0;
  }
  return Math.max(1, Math.ceil(quantity));
}

async function getWbsDescendantIds(projectId: number, rootWbsId: number): Promise<Set<number>> {
  const wbsItems = await db.collection("wbs_items").find({ projectId }).toArray();
  const childrenByParent = new Map<number | null, number[]>();
  for (const w of wbsItems as Array<{ id: number; parentId?: number | null }>) {
    const pid = w.parentId ?? null;
    const list = childrenByParent.get(pid) ?? [];
    list.push(w.id);
    childrenByParent.set(pid, list);
  }
  const out = new Set<number>();
  const stack = [rootWbsId];
  while (stack.length) {
    const id = stack.pop()!;
    out.add(id);
    for (const child of childrenByParent.get(id) ?? []) stack.push(child);
  }
  return out;
}

async function resolveScopeResources(scope: OnboardingScope): Promise<ProjectResource[]> {
  const all = (await storage.getProjectResources(scope.projectId)).filter((r) =>
    ONBOARD_TYPES.includes(r.type as OnboardResourceType)
  );

  if (scope.activityId != null) {
    return all.filter((r) => r.projectActivityId === scope.activityId);
  }

  let wpIds: Set<number> | null = null;
  if (scope.wpId != null) {
    wpIds = new Set([scope.wpId]);
  } else if (scope.wbsItemId != null) {
    const wbsIds = await getWbsDescendantIds(scope.projectId, scope.wbsItemId);
    const wps = await storage.getWorkPackagesByProject(scope.projectId);
    wpIds = new Set(wps.filter((wp) => wbsIds.has(wp.wbsItemId)).map((wp) => wp.id));
  }

  if (wpIds) return all.filter((r) => wpIds!.has(r.wpId));
  return all;
}

async function buildEntityPools(): Promise<Map<number, EntityRef[]>> {
  const pool = new Map<number, EntityRef[]>();

  const add = (resourceId: number, ref: EntityRef) => {
    const list = pool.get(resourceId) ?? [];
    list.push(ref);
    pool.set(resourceId, list);
  };

  const empMaps = await db.collection("employee_resource_mappings").find().toArray();
  for (const m of empMaps as Array<{ resourceId: number; employeeId: number }>) {
    add(m.resourceId, { entityType: "employee", entityId: m.employeeId });
  }

  const rmMaps = await db.collection("rental_manpower_resource_mappings").find().toArray();
  for (const m of rmMaps as Array<{ resourceId: number; rentalManpowerId: number }>) {
    add(m.resourceId, { entityType: "rental_manpower", entityId: m.rentalManpowerId });
  }

  const eqMaps = await db.collection("equipment_resource_mappings").find().toArray();
  for (const m of eqMaps as Array<{ resourceId: number; equipmentId: number }>) {
    add(m.resourceId, { entityType: "equipment", entityId: m.equipmentId });
  }

  const reMaps = await db.collection("rental_equipment_resource_mappings").find().toArray();
  for (const m of reMaps as Array<{ resourceId: number; rentalEquipmentId: number }>) {
    add(m.resourceId, { entityType: "rental_equipment", entityId: m.rentalEquipmentId });
  }

  return pool;
}

function entityKey(ref: EntityRef): string {
  return `${ref.entityType}:${ref.entityId}`;
}

function resourceTypeToEntityType(type: OnboardResourceType): EntityRef["entityType"] {
  return type;
}

export async function runResourceOnboarding(
  scope: OnboardingScope,
  options?: { clearExisting?: boolean; enteredBy?: string }
): Promise<OnboardingResult> {
  const project = await storage.getProject(scope.projectId);
  if (!project) throw new Error(`Project ${scope.projectId} not found`);

  const rangeStart = toIsoDate(project.startDate) ?? toIsoDate(new Date());
  const rangeEnd = toIsoDate(project.endDate) ?? rangeStart;
  if (!rangeStart || !rangeEnd) throw new Error("Project start/end dates are required for onboarding");

  const calendar = await storage.getDefaultCalendar();
  const holidays = await storage.getCalendarHolidaysInRange(rangeStart, rangeEnd);
  const dayMap = buildCalendarDayMap(rangeStart, rangeEnd, calendar, holidays);
  const workingDays = dayMap.filter((d) => d.hours > 0);
  const workingDaysCount = workingDays.length || 1;

  const resourceRows = await resolveScopeResources(scope);
  const entityPools = await buildEntityPools();

  const wpIds = [...new Set(resourceRows.map((r) => r.wpId))];
  const actIds = [
    ...new Set(
      resourceRows.map((r) => r.projectActivityId).filter((id): id is number => id != null)
    ),
  ];
  const [wps, acts] = await Promise.all([
    wpIds.length > 0
      ? db.collection("work_packages").find({ id: { $in: wpIds } }).toArray()
      : [],
    actIds.length > 0
      ? db.collection("project_activities").find({ id: { $in: actIds } }).toArray()
      : [],
  ]);
  const wpById = new Map(wps.map((w: { id: number; code?: string; name?: string }) => [w.id, w]));
  const actById = new Map(acts.map((a: { id: number; name?: string }) => [a.id, a]));

  if (options?.clearExisting !== false) {
    const clearFilter: Record<string, unknown> = { projectId: scope.projectId };
    if (scope.activityId != null) clearFilter.projectActivityId = scope.activityId;
    else if (scope.wpId != null) clearFilter.wpId = scope.wpId;
    await db.collection("resource_entity_assignments").deleteMany(clearFilter);
  }

  const runId = await storage.getNextId("resource_onboarding_runs");
  await db.collection("resource_onboarding_runs").insertOne({
    id: runId,
    projectId: scope.projectId,
    scope,
    enteredBy: options?.enteredBy ?? "system",
    dateRange: { start: rangeStart, end: rangeEnd },
    createdAt: new Date(),
  });

  const busyByDate = new Map<string, Set<string>>();
  const deficiencies: OnboardingDeficiency[] = [];
  let assignmentsCreated = 0;

  for (const row of resourceRows) {
    const globalResourceId = row.globalResourceId;
    if (globalResourceId == null) continue;

    let start = toIsoDate(row.plannedStartDate) ?? rangeStart;
    let end = toIsoDate(row.plannedEndDate) ?? rangeEnd;
    if (!row.plannedStartDate || !row.plannedEndDate) {
      await storage.updateProjectResource(row.id, {
        plannedStartDate: start,
        plannedEndDate: end,
      });
    }

    const rowWorkingDays = buildCalendarDayMap(start, end, calendar, holidays).filter((d) => d.hours > 0);
    const rowWorkingCount = rowWorkingDays.length || workingDaysCount;
    const qty = parseQty(row.quantity);
    const pool = entityPools.get(globalResourceId) ?? [];
    const entityType = resourceTypeToEntityType(row.type as OnboardResourceType);
    const matchingPool = pool.filter((p) => p.entityType === entityType);

    const wp = wpById.get(row.wpId);
    const actId = row.projectActivityId ?? null;
    const act = actId != null ? actById.get(actId) : undefined;

    for (const day of rowWorkingDays) {
      const required = requiredHeadcountForDay(qty, row.unitOfMeasure, day.hours, rowWorkingCount);
      if (required <= 0) continue;

      const busy = busyByDate.get(day.date) ?? new Set<string>();
      const available = matchingPool.filter((p) => !busy.has(entityKey(p)));
      const picked = available.slice(0, required);
      const shortfall = required - picked.length;

      const hoursEach =
        isHoursUom(row.unitOfMeasure) && qty <= 24
          ? Math.min(day.hours, qty / required)
          : Math.min(day.hours, qty / rowWorkingCount / Math.max(1, required));

      for (const entity of picked) {
        const id = await storage.getNextId("resource_entity_assignments");
        await db.collection("resource_entity_assignments").insertOne({
          id,
          date: day.date,
          resourceType: row.type,
          projectId: row.projectId,
          wpId: row.wpId,
          projectActivityId: actId,
          projectResourceId: row.id,
          globalResourceId,
          entityType: entity.entityType,
          entityId: entity.entityId,
          plannedHours: String(Math.round(hoursEach * 100) / 100),
          onboardingRunId: runId,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        busy.add(entityKey(entity));
        assignmentsCreated++;
      }
      busyByDate.set(day.date, busy);

      if (shortfall > 0) {
        deficiencies.push({
          projectResourceId: row.id,
          projectId: row.projectId,
          wpId: row.wpId,
          projectActivityId: actId,
          activityName: actId != null ? (act as { name?: string })?.name ?? null : null,
          wpCode: (wp as { code?: string })?.code ?? String(row.wpId),
          wpName: (wp as { name?: string })?.name ?? `WP #${row.wpId}`,
          globalResourceId,
          resourceName: row.name,
          resourceType: row.type as OnboardResourceType,
          date: day.date,
          requiredCount: required,
          assignedCount: picked.length,
          shortfall,
        });
      }
    }
  }

  const deficiencyAgg = new Map<number, OnboardingDeficiency>();
  for (const d of deficiencies) {
    const prev = deficiencyAgg.get(d.projectResourceId);
    if (!prev || d.shortfall > prev.shortfall) {
      deficiencyAgg.set(d.projectResourceId, { ...d });
    } else if (prev) {
      prev.requiredCount = Math.max(prev.requiredCount, d.requiredCount);
      prev.shortfall = Math.max(prev.shortfall, d.shortfall);
    }
  }
  const deficienciesSummary = [...deficiencyAgg.values()];

  await db.collection("resource_onboarding_runs").updateOne(
    { id: runId },
    {
      $set: {
        assignmentsCreated,
        deficiencyCount: deficienciesSummary.length,
        deficiencies: deficienciesSummary,
        resourcesProcessed: resourceRows.length,
        completedAt: new Date(),
      },
    }
  );

  return {
    runId,
    scope,
    assignmentsCreated,
    deficiencies: deficienciesSummary,
    resourcesProcessed: resourceRows.length,
    workingDaysProcessed: workingDays.length,
    dateRange: { start: rangeStart, end: rangeEnd },
  };
}

export async function getLatestOnboardingSummary(projectId: number): Promise<{
  run: Record<string, unknown> | null;
  deficiencies: OnboardingDeficiency[];
  assignmentCount: number;
}> {
  const latest = await db
    .collection("resource_onboarding_runs")
    .find({ projectId })
    .sort({ createdAt: -1 })
    .limit(1)
    .toArray();
  if (latest.length === 0) {
    return { run: null, deficiencies: [], assignmentCount: 0 };
  }
  const run = latest[0] as Record<string, unknown> & {
    id: number;
    deficiencies?: OnboardingDeficiency[];
  };
  const assignmentCount = await db.collection("resource_entity_assignments").countDocuments({
    projectId,
    onboardingRunId: run.id,
  });
  return {
    run,
    deficiencies: run.deficiencies ?? [],
    assignmentCount,
  };
}
