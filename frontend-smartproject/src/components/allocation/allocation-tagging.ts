import type { AssignmentCalendarItem } from "@/components/allocation/assignment-month-calendar";

type LookupEntry = {
  index: number;
  requiredLabel: string;
};

export type AssignmentTagLookup = Map<string, LookupEntry>;

function parseQuantity(value: string): number | null {
  const n = Number.parseFloat(String(value ?? "").trim());
  return Number.isFinite(n) ? n : null;
}

function formatQuantityLabel(value: string): string {
  const n = parseQuantity(value);
  if (n == null) return String(value ?? "").trim() || "0";
  if (Number.isInteger(n)) return String(n);
  return n.toFixed(2).replace(/\.?0+$/, "");
}

export function buildAssignmentTagLookup<T>(args: {
  rows: T[];
  getEntityId: (row: T) => number;
  getResourceId: (row: T) => number | null;
  getAssignments: (row: T) => AssignmentCalendarItem[];
}): AssignmentTagLookup {
  const { rows, getEntityId, getResourceId, getAssignments } = args;
  const byResource = new Map<number, T[]>();

  for (const row of rows) {
    const resourceId = getResourceId(row);
    if (resourceId == null) continue;
    const list = byResource.get(resourceId) ?? [];
    list.push(row);
    byResource.set(resourceId, list);
  }

  const lookup: AssignmentTagLookup = new Map();

  for (const [resourceId, resourceRows] of byResource.entries()) {
    const sortedRows = [...resourceRows].sort((a, b) => getEntityId(a) - getEntityId(b));
    const entityIndexById = new Map<number, number>();
    sortedRows.forEach((row, idx) => entityIndexById.set(getEntityId(row), idx + 1));

    const requiredByProjectResourceId = new Map<number, string>();
    for (const row of sortedRows) {
      for (const assignment of getAssignments(row)) {
        if (!requiredByProjectResourceId.has(assignment.projectResourceId)) {
          requiredByProjectResourceId.set(
            assignment.projectResourceId,
            formatQuantityLabel(assignment.quantity)
          );
        }
      }
    }

    for (const row of sortedRows) {
      const entityId = getEntityId(row);
      const entityIndex = entityIndexById.get(entityId);
      if (!entityIndex) continue;
      for (const assignment of getAssignments(row)) {
        const requiredLabel = requiredByProjectResourceId.get(assignment.projectResourceId) ?? "0";
        lookup.set(`${resourceId}:${entityId}:${assignment.projectResourceId}`, {
          index: entityIndex,
          requiredLabel,
        });
      }
    }
  }

  return lookup;
}

export function resolveAssignmentTag(
  lookup: AssignmentTagLookup,
  resourceId: number | null,
  entityId: number,
  assignment: AssignmentCalendarItem
): string {
  if (resourceId == null) return "—";
  const key = `${resourceId}:${entityId}:${assignment.projectResourceId}`;
  const hit = lookup.get(key);
  if (!hit) return "—";
  return `${hit.index} of ${hit.requiredLabel}`;
}
