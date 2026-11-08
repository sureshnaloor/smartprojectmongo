type BudgetNode = {
  id: number;
  parentId?: number | null;
  budgetedCost?: string | number | null;
};

type BudgetPackage = {
  wbsItemId: number;
  budgetedCost?: string | number | null;
};

function amount(value: string | number | null | undefined): number {
  const n = Number(value || 0);
  return Number.isFinite(n) ? n : 0;
}

/** Same figures as the allocation screen: direct children are the allocated amount, and slack is what remains on this WBS. */
export function wbsAllocation(
  wbs: BudgetNode,
  wbsItems: BudgetNode[],
  workPackages: BudgetPackage[],
): { budget: number; allocated: number; slack: number; hasChildren: boolean } {
  const budget = amount(wbs.budgetedCost);
  const childWbs = wbsItems.filter((item) => item.parentId === wbs.id);
  const packages = workPackages.filter((wp) => wp.wbsItemId === wbs.id);
  const hasChildren = childWbs.length > 0 || packages.length > 0;
  const allocated = childWbs.length
    ? childWbs.reduce((sum, item) => sum + amount(item.budgetedCost), 0)
    : packages.reduce((sum, wp) => sum + amount(wp.budgetedCost), 0);
  return { budget, allocated, slack: budget - allocated, hasChildren };
}
