import {
  ACTIVITY_TYPE_LABELS,
  ACTIVITY_CATEGORY_TAG_LABELS,
  type ProjectActivityType,
  type ActivityCategoryTag,
} from "@shared/activity-types";
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
  categoryTag?: ActivityCategoryTag | string | null;
  category?: string | null;
  createdAt?: string;
}

export interface ProjectActivityAssignment {
  id: number;
  projectId: number;
  wpId: number;
  globalActivityId: number | null;
  activityType?: ProjectActivityType | string | null;
  categoryTag?: ActivityCategoryTag | string | null;
  name: string;
  description: string | null;
  unitOfMeasure: string;
  unitRate: string;
  quantity: string;
  totalBudget?: string | number | null;
  remarks: string | null;
  plannedFromDate: string | null;
  plannedToDate: string | null;
  duration: number | null;
}

export function getCategoryTagBadge(tag?: string | null): { label: string; className: string; icon: string } | null {
  if (!tag) return null;
  switch (tag) {
    case "materials-heavy":
      return {
        label: "Materials Heavy",
        className: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800",
        icon: "📦",
      };
    case "subcontract-heavy":
      return {
        label: "Subcontract Heavy",
        className: "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800",
        icon: "🤝",
      };
    case "resource-heavy":
      return {
        label: "Resource Heavy",
        className: "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800",
        icon: "🚜",
      };
    default:
      return {
        label: tag,
        className: "bg-gray-100 text-gray-800 border-gray-200",
        icon: "🏷️",
      };
  }
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
