import type { Project, WbsItem, WorkPackage } from "./schema";
import type { DatabaseStorage } from "./storage";

const AMD_SUFFIX_RE = /_amd_(\d+)$/i;

/** Strip trailing `_amd_N` to get the amendment base name. */
export function getProjectBaseName(name: string): string {
  return name.replace(AMD_SUFFIX_RE, "");
}

export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Next amendment name: `{base}_amd_{n}` where n is one past the highest
 * existing `_amd_*` sibling for this base (across all projects).
 */
export function nextAmendmentName(baseName: string, existingNames: string[]): {
  name: string;
  amendmentNumber: number;
} {
  const prefixRe = new RegExp(`^${escapeRegExp(baseName)}_amd_(\\d+)$`, "i");
  let max = 0;
  for (const n of existingNames) {
    const m = n.match(prefixRe);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  const amendmentNumber = max + 1;
  return { name: `${baseName}_amd_${amendmentNumber}`, amendmentNumber };
}

export function isAdminUser(user: Express.User | undefined | null): boolean {
  if (!user) return false;
  if ((user as Express.User & { role?: string }).role === "admin") return true;
  const adminEmails = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return adminEmails.includes(user.email.toLowerCase());
}

export function canAmendProject(
  user: Express.User | undefined | null,
  project: { createdById?: number | null }
): boolean {
  if (!user) return false;
  if (isAdminUser(user)) return true;
  return project.createdById != null && project.createdById === user.id;
}

/** Copy project + WBS tree + work packages into a new amendment project. */
export async function copyProjectAsAmendment(
  storage: DatabaseStorage,
  source: Project,
  opts: {
    createdById: number | null;
    name: string;
    amendmentNumber: number;
  }
): Promise<{ project: Project; wbsCount: number; wpCount: number }> {
  const newProject = await storage.createProject({
    name: opts.name,
    description: source.description ?? null,
    budget: source.budget,
    currency: source.currency,
    projectType: source.projectType ?? null,
    status: source.status ?? "concept",
    startDate: source.startDate ?? null,
    endDate: source.endDate ?? null,
    allocationVersion: null,
    wbsFinalized: false,
    planVersion: 0,
    sequenceVersion: 0,
    createdById: opts.createdById,
    amendedFromId: source.id,
    amendmentNumber: opts.amendmentNumber,
  } as any);

  const sourceWbs = (await storage.getWbsItems(source.id)) as WbsItem[];
  const sourceWps = (await storage.getWorkPackagesByProject(source.id)) as WorkPackage[];

  // Copy in level order so parents exist before children
  const sorted = [...sourceWbs].sort((a, b) => a.level - b.level || a.id - b.id);
  const idMap = new Map<number, number>();

  for (const item of sorted) {
    const parentId =
      item.parentId == null ? null : (idMap.get(item.parentId) ?? null);
    if (item.parentId != null && parentId == null) {
      throw new Error(`Failed to remap parent for WBS ${item.code}`);
    }

    const created = await storage.createWbsItem({
      projectId: newProject.id,
      parentId,
      name: item.name,
      description: item.description ?? null,
      level: item.level,
      code: item.code,
      type: item.type,
      budgetedCost: item.budgetedCost,
      actualCost: "0",
      percentComplete: "0",
      isTopLevel: item.isTopLevel ?? false,
    } as any);

    idMap.set(item.id, created.id);
  }

  let wpCount = 0;
  for (const wp of sourceWps) {
    const newWbsId = idMap.get(wp.wbsItemId);
    if (newWbsId == null) continue;
    await storage.createWorkPackage({
      wbsItemId: newWbsId,
      projectId: newProject.id,
      name: wp.name,
      description: wp.description ?? null,
      code: wp.code,
      budgetedCost: wp.budgetedCost,
      actualCost: "0",
      percentComplete: "0",
    } as any);
    wpCount += 1;
  }

  return { project: newProject, wbsCount: sorted.length, wpCount };
}
