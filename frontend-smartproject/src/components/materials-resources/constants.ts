export type MsrTabKey = "materials" | "services" | "resources";

export const MSR_TABS: { key: MsrTabKey; label: string; href: (projectId: string) => string }[] = [
  { key: "materials", label: "Materials", href: (id) => `/projects/${id}/materials-services/materials` },
  { key: "services", label: "Services", href: (id) => `/projects/${id}/materials-services/services` },
  { key: "resources", label: "Manpower & Equipment", href: (id) => `/projects/${id}/materials-services/resources` },
];

export type ResourceType = "manpower" | "equipment" | "rental_manpower" | "rental_equipment" | "tools";

export const RESOURCE_TYPE_FILTERS: { key: ResourceType | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "manpower", label: "Manpower (Own)" },
  { key: "rental_manpower", label: "Manpower (Rental)" },
  { key: "equipment", label: "Equipment (Own)" },
  { key: "rental_equipment", label: "Equipment (Rental)" },
  { key: "tools", label: "Tools" },
];

export function resourceTypeLabel(type: string): string {
  return type.replace(/_/g, " ");
}

export type SortKey = "name" | "code" | "rate" | "recent";

export const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "name", label: "Name" },
  { value: "code", label: "Code" },
  { value: "rate", label: "Base Rate" },
  { value: "recent", label: "Recently Added" },
];

export function materialCategoryLabel(m: {
  materialType?: string;
  materialGroup?: string;
}): string {
  const t = m.materialType?.trim();
  const g = m.materialGroup?.trim();
  if (t && g) return `${t} / ${g}`;
  return t || g || "General";
}

export function materialStatus(
  materialId: number,
  allocatedIds: Set<number>
): { label: string; color: string } {
  if (allocatedIds.has(materialId)) {
    return { label: "Allocated", color: "var(--status-info)" };
  }
  return { label: "Available", color: "var(--status-success)" };
}

export interface MaterialItem {
  id: number;
  materialCode: string;
  materialDescription: string;
  uom: string;
  baseRate: string | number;
  materialType?: string;
  materialGroup?: string;
  materialClass?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ServiceItem {
  id: number;
  serviceCode: string;
  serviceDescription: string;
  uom: string;
  baseRate: string | number;
  serviceType?: string;
  serviceGroup?: string;
}

export interface WorkPackageItem {
  id: number;
  wbsItemId: number;
  projectId: number;
  name: string;
  code: string;
  description: string | null;
  budgetedCost: string;
}

export interface GlobalResourceItem {
  id: number;
  name: string;
  description: string | null;
  type: ResourceType;
  unitOfMeasure: string;
  unitRate: string;
  remarks: string | null;
}

export interface ProjectResourceAssignment {
  id: number;
  projectId: number;
  wpId: number;
  globalResourceId: number | null;
  name: string;
  description?: string | null;
  type: ResourceType;
  unitOfMeasure: string;
  unitRate: string;
  quantity: string;
  remarks?: string | null;
  plannedStartDate: string | null;
  plannedEndDate: string | null;
}

/** Fetch work packages for a project, with WBS fallback when the aggregate endpoint is empty. */
export async function fetchProjectWorkPackages(projectId: string): Promise<WorkPackageItem[]> {
  const res = await fetch(`/api/projects/${projectId}/work-packages`);
  if (res.ok) {
    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) return data;
  }
  const wbsRes = await fetch(`/api/projects/${projectId}/wbs`);
  if (!wbsRes.ok) return [];
  const wbsItems = await wbsRes.json();
  if (!Array.isArray(wbsItems)) return [];
  const allWps: WorkPackageItem[] = [];
  for (const wbs of wbsItems) {
    try {
      const wpRes = await fetch(`/api/wbs/${wbs.id}/work-packages`);
      if (wpRes.ok) {
        const wpData = await wpRes.json();
        if (Array.isArray(wpData)) allWps.push(...wpData);
      }
    } catch {
      /* skip */
    }
  }
  return allWps;
}
