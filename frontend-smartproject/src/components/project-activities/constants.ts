import { ACTIVITY_TYPE_LABELS, type ProjectActivityType } from "@shared/activity-types";
import type { SortKey } from "@/components/materials-resources/constants";

export type ActivityCatalogTab = "global" | "project" | "custom";

export const ACTIVITY_CATALOG_TABS: { key: ActivityCatalogTab; label: string }[] = [
  { key: "global", label: "Global Activities" },
  { key: "project", label: "Project Activities" },
  { key: "custom", label: "Custom Activities" },
];

export type { SortKey };

export const ACTIVITY_SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "name", label: "Name" },
  { value: "rate", label: "Rate (High → Low)" },
  { value: "recent", label: "Recently Added" },
];

export interface GlobalActivityItem {
  id: number;
  name: string;
  description: string | null;
  unitOfMeasure: string;
  unitRate: string;
  remarks: string | null;
  activityType?: ProjectActivityType | string | null;
  category?: string | null;
  createdAt?: string;
}

export interface ProjectActivityAssignment {
  id: number;
  projectId: number;
  wpId: number;
  globalActivityId: number | null;
  name: string;
  description: string | null;
  unitOfMeasure: string;
  unitRate: string;
  quantity: string;
  remarks: string | null;
  plannedFromDate: string | null;
  plannedToDate: string | null;
  duration: number | null;
}

export function activityCategoryLabel(item: GlobalActivityItem): string {
  if (item.category?.trim()) return item.category.trim();
  const type = item.activityType;
  if (type && type in ACTIVITY_TYPE_LABELS) {
    return ACTIVITY_TYPE_LABELS[type as ProjectActivityType];
  }
  return "General";
}

export function activityStatus(
  activityId: number,
  allocatedIds: Set<number>
): { label: string; color: string } {
  if (allocatedIds.has(activityId)) {
    return { label: "Allocated", color: "var(--status-info)" };
  }
  return { label: "Available", color: "var(--status-success)" };
}

export { fetchProjectWorkPackages, type WorkPackageItem } from "@/components/materials-resources/constants";
