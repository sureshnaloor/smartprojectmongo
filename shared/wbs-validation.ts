/** Maximum WBS depth (including project root at level 1). */
export const MAX_WBS_LEVEL = 9;

export interface WbsValidationItem {
  id: number;
  parentId: number | null;
  name: string;
  code: string;
  level: number;
  type: string;
  isTopLevel?: boolean;
}

export interface WbsValidationWorkPackage {
  id: number;
  wbsItemId: number;
}

export interface WbsValidationIssue {
  wbsId: number;
  code: string;
  name: string;
  reason: string;
}

export interface WbsValidationResult {
  valid: boolean;
  issues: WbsValidationIssue[];
  invalidWbsIds: number[];
}

function isStructuralWbs(item: WbsValidationItem): boolean {
  return item.type === "Summary" || item.type === "WBS";
}

function isLegacyWpWbsItem(item: WbsValidationItem): boolean {
  return item.type === "WorkPackage";
}

export function validateWbsStructure(
  wbsItems: WbsValidationItem[],
  workPackages: WbsValidationWorkPackage[]
): WbsValidationResult {
  const issues: WbsValidationIssue[] = [];

  const wpCountByWbsId = new Map<number, number>();
  for (const wp of workPackages) {
    wpCountByWbsId.set(wp.wbsItemId, (wpCountByWbsId.get(wp.wbsItemId) ?? 0) + 1);
  }

  const wbsChildrenByParent = new Map<number, WbsValidationItem[]>();
  const legacyWpChildrenByParent = new Map<number, WbsValidationItem[]>();

  for (const item of wbsItems) {
    if (item.parentId == null) continue;
    if (isStructuralWbs(item)) {
      const list = wbsChildrenByParent.get(item.parentId) ?? [];
      list.push(item);
      wbsChildrenByParent.set(item.parentId, list);
    } else if (isLegacyWpWbsItem(item)) {
      const list = legacyWpChildrenByParent.get(item.parentId) ?? [];
      list.push(item);
      legacyWpChildrenByParent.set(item.parentId, list);
    }
  }

  const roots = wbsItems.filter(
    (i) => i.parentId == null && (i.isTopLevel || i.type === "Summary")
  );

  if (roots.length === 0) {
    issues.push({
      wbsId: -1,
      code: "",
      name: "Project",
      reason: "At least one root WBS (project root) is required",
    });
  }

  const anyRootHasWbsChild = roots.some(
    (r) => (wbsChildrenByParent.get(r.id)?.length ?? 0) > 0
  );
  if (roots.length > 0 && !anyRootHasWbsChild) {
    for (const root of roots) {
      issues.push({
        wbsId: root.id,
        code: root.code,
        name: root.name,
        reason: "Add at least one child WBS below the project root",
      });
    }
  }

  const structuralNodes = wbsItems.filter(
    (i) => isStructuralWbs(i) || isLegacyWpWbsItem(i)
  );

  for (const node of structuralNodes) {
    if (!isStructuralWbs(node)) continue;

    if (node.level > MAX_WBS_LEVEL) {
      issues.push({
        wbsId: node.id,
        code: node.code,
        name: node.name,
        reason: `Exceeds maximum WBS depth of ${MAX_WBS_LEVEL} levels`,
      });
    }

    const wbsChildren = wbsChildrenByParent.get(node.id) ?? [];
    const legacyWpChildren = legacyWpChildrenByParent.get(node.id) ?? [];
    const tableWpCount = wpCountByWbsId.get(node.id) ?? 0;
    const hasWbsChildren = wbsChildren.length > 0;
    const hasWpChildren = tableWpCount > 0 || legacyWpChildren.length > 0;

    if (node.isTopLevel && hasWpChildren) {
      issues.push({
        wbsId: node.id,
        code: node.code,
        name: node.name,
        reason: "Root WBS cannot have work packages — add child WBS first",
      });
    }

    if (hasWbsChildren && hasWpChildren) {
      issues.push({
        wbsId: node.id,
        code: node.code,
        name: node.name,
        reason: "Cannot mix WBS and work package children — end the branch with one type only",
      });
    }

    const isLeaf = !hasWbsChildren;

    if (isLeaf && !node.isTopLevel) {
      if (!hasWpChildren) {
        issues.push({
          wbsId: node.id,
          code: node.code,
          name: node.name,
          reason: "Lowest-level WBS must have at least one work package",
        });
      }
    }

    if (node.isTopLevel && !hasWbsChildren && !hasWpChildren) {
      const already = issues.some((i) => i.wbsId === node.id);
      if (!already) {
        issues.push({
          wbsId: node.id,
          code: node.code,
          name: node.name,
          reason: "Root WBS must have child WBS items",
        });
      }
    }
  }

  const invalidWbsIds = [
    ...new Set(issues.map((i) => i.wbsId).filter((id) => id >= 0)),
  ];

  return {
    valid: issues.length === 0,
    issues,
    invalidWbsIds,
  };
}
