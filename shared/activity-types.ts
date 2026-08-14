export const PROJECT_ACTIVITY_TYPES = [
  "units",
  "milestone",
  "lumpsum",
  "progress_0_50_100",
] as const;

export type ProjectActivityType = (typeof PROJECT_ACTIVITY_TYPES)[number];

export interface ActivityMilestone {
  name: string;
  weightPercent: number;
  achieved?: boolean;
}

export const ACTIVITY_TYPE_LABELS: Record<ProjectActivityType, string> = {
  units: "Units",
  milestone: "Milestone",
  lumpsum: "Lump Sum",
  progress_0_50_100: "0/50/100",
};

export const ACTIVITY_TYPE_DESCRIPTIONS: Record<ProjectActivityType, string> = {
  units: "Quantity-based (e.g. excavation in m³, painting in sq ft)",
  milestone: "Weighted milestones that must total 100% (e.g. DCS, PLC phases)",
  lumpsum: "Single lump-sum scope; progress logged as % for earned value",
  progress_0_50_100: "Not started (0%), in progress (50%), or complete (100%)",
};

export const ACTIVITY_CATEGORY_TAGS = [
  "materials-heavy",
  "subcontract-heavy",
  "resource-heavy",
] as const;

export type ActivityCategoryTag = (typeof ACTIVITY_CATEGORY_TAGS)[number];

export const ACTIVITY_CATEGORY_TAG_LABELS: Record<ActivityCategoryTag, string> = {
  "materials-heavy": "Materials Heavy",
  "subcontract-heavy": "Subcontract Heavy",
  "resource-heavy": "Resource Heavy",
};

export const ACTIVITY_CATEGORY_TAG_DESCRIPTIONS: Record<ActivityCategoryTag, string> = {
  "materials-heavy": "High-value materials & equipment (Compressor, Motor, Transformer, Switchgear, SCADA, RTU, DCS)",
  "subcontract-heavy": "External services & subcontracts (Specialized installation or outsourced scopes)",
  "resource-heavy": "Normal installation & construction (Manpower, tools, and construction equipment)",
};

export function computeActivityBudget(activity: {
  activityType?: ProjectActivityType | string | null;
  quantity?: string | number | null;
  unitRate?: string | number | null;
  totalBudget?: string | number | null;
}): number {
  const type = (activity.activityType ?? "units") as ProjectActivityType;
  if (type === "units") {
    return Number(activity.quantity || 0) * Number(activity.unitRate || 0);
  }
  return Number(activity.totalBudget || 0);
}

export function computeEarnedValue(activity: {
  activityType?: ProjectActivityType | string | null;
  quantity?: string | number | null;
  unitRate?: string | number | null;
  totalBudget?: string | number | null;
  percentComplete?: number | null;
  progressState?: number | null;
  milestones?: ActivityMilestone[] | null;
}): number {
  const budget = computeActivityBudget(activity);
  const type = (activity.activityType ?? "units") as ProjectActivityType;

  switch (type) {
    case "units":
      return budget * (Number(activity.percentComplete || 0) / 100);
    case "milestone": {
      const achieved = (activity.milestones || []).reduce(
        (sum, m) => sum + (m.achieved ? Number(m.weightPercent) : 0),
        0
      );
      return budget * (achieved / 100);
    }
    case "lumpsum":
      return budget * (Number(activity.percentComplete || 0) / 100);
    case "progress_0_50_100":
      return budget * (Number(activity.progressState || 0) / 100);
    default:
      return 0;
  }
}

export function validateMilestones(
  milestones: Array<{ name?: string; weightPercent?: number; achieved?: boolean }> | undefined | null
): string | null {
  if (!milestones || milestones.length === 0) {
    return "At least one milestone is required";
  }
  const sum = milestones.reduce((s, m) => s + Number(m.weightPercent || 0), 0);
  if (Math.abs(sum - 100) > 0.01) {
    return `Milestone weights must sum to 100% (currently ${sum.toFixed(1)}%)`;
  }
  for (const m of milestones) {
    if (!m.name?.trim()) return "Each milestone must have a name";
    if (Number(m.weightPercent) <= 0) return "Each milestone weight must be greater than 0";
  }
  return null;
}

export function validateProjectActivityPayload(data: {
  activityType?: ProjectActivityType | string | null;
  name?: string;
  unitOfMeasure?: string | null;
  unitRate?: string | number | null;
  quantity?: string | number | null;
  duration?: number | string | null;
  totalBudget?: string | number | null;
  milestones?: Array<{ name?: string; weightPercent?: number; achieved?: boolean }> | null;
  progressState?: number | null;
}): string | null {
  const type = (data.activityType ?? "units") as ProjectActivityType;

  if (!data.name?.trim()) return "Activity name is required";

  if (type === "lumpsum") {
    data.unitOfMeasure = "LOT";
    data.quantity = "1";
    if (Number(data.totalBudget) <= 0) return "Total budget is required for lump sum activities";
    return null;
  }

  if (type === "units") {
    if (!data.unitOfMeasure?.trim()) return "Unit of measure is required for units activities";
    if (Number(data.unitRate) < 0) return "Unit rate must be zero or positive";
    if (Number(data.quantity) <= 0) return "Quantity must be greater than zero";
    return null;
  }

  if (type === "milestone") {
    if (!data.duration || Number(data.duration) <= 0) {
      return "Duration (number of days) is mandatory for milestone activities";
    }
    if (Number(data.totalBudget) <= 0) return "Total budget is required for milestone activities";
    return validateMilestones(data.milestones);
  }

  if (type === "progress_0_50_100") {
    if (!data.duration || Number(data.duration) <= 0) {
      return "Duration (number of days) is mandatory for 0/50/100 activities";
    }
    if (Number(data.totalBudget) <= 0) return "Total budget is required for 0/50/100 activities";
    const state = Number(data.progressState ?? 0);
    if (![0, 50, 100].includes(state)) {
      return "Progress state must be 0, 50, or 100";
    }
    return null;
  }

  return "Invalid activity type";
}

/** Global activity master — budget is assigned per project when the activity is used. */
export function validateGlobalActivityPayload(data: {
  activityType?: ProjectActivityType | string | null;
  name?: string;
  unitOfMeasure?: string | null;
  unitRate?: string | number | null;
  duration?: number | string | null;
  milestones?: Array<{ name?: string; weightPercent?: number; achieved?: boolean }> | null;
}): string | null {
  const type = (data.activityType ?? "units") as ProjectActivityType;

  if (!data.name?.trim()) return "Activity name is required";

  if (type === "lumpsum") {
    data.unitOfMeasure = "LOT";
    return null;
  }

  if (type === "units") {
    if (!data.unitOfMeasure?.trim()) return "Unit of measure is required for units activities";
    if (Number(data.unitRate) < 0) return "Unit rate must be zero or positive";
    return null;
  }

  if (type === "milestone" || type === "progress_0_50_100") {
    if (!data.duration || Number(data.duration) <= 0) {
      return "Duration (number of days) is mandatory for " + (type === "milestone" ? "milestone" : "0/50/100") + " activities";
    }
    if (type === "milestone") return validateMilestones(data.milestones);
    return null;
  }

  return "Invalid activity type";
}
