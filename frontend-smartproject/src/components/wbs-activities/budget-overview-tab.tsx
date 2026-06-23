import { Link } from "wouter";
import { formatCurrency, cn } from "@/lib/utils";
import type { WbsItem } from "@shared/schema";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface BudgetOverviewTabProps {
  projectId: number;
  currency: string;
  projectBudget: number;
  usedBudget: number;
  remainingBudget: number;
  usagePercent: number;
  allocationComplete: boolean;
  wbsItems: WbsItem[];
  onEditAllocation: () => void;
}

const CATEGORIES = ["Materials", "Services", "Manpower", "Equipment", "Contingency"] as const;

export function BudgetOverviewTab({
  projectId,
  currency,
  projectBudget,
  usedBudget,
  remainingBudget,
  usagePercent,
  allocationComplete,
  wbsItems,
  onEditAllocation,
}: BudgetOverviewTabProps) {
  const leafWbs = wbsItems.filter((w) => w.type === "WBS" || w.type === "Summary");

  return (
    <div className="wa-tab-content flex-1 overflow-auto p-6">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        {[
          { label: "Total Allocated", value: projectBudget, className: "text-[var(--text-primary)]" },
          { label: "Used Budget", value: usedBudget, className: "text-[var(--text-primary)]" },
          { label: "Remaining", value: remainingBudget, className: "text-[var(--status-success)]" },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-white)] p-5 shadow-[var(--shadow-sm)]"
          >
            <p className="kanban-body-sm font-medium uppercase tracking-wide text-[var(--text-secondary)]">{stat.label}</p>
            <p className={cn("mt-1 kanban-heading-lg font-mono", stat.className)}>
              {formatCurrency(stat.value, currency)}
            </p>
          </div>
        ))}
      </div>

      <div className="my-6 flex items-center gap-3">
        <span className="shrink-0 kanban-caption font-semibold uppercase tracking-[0.1em] text-[var(--text-muted)]">
          Usage
        </span>
        <div className="h-px flex-1 bg-[var(--border-subtle)]" />
      </div>

      <div className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-white)] p-5">
        <div className="h-3 overflow-hidden rounded-full bg-[var(--bg-warm-gray)]">
          <div
            className="wa-progress-bar h-full rounded-full bg-[var(--copper-500)]"
            style={{ width: `${Math.min(100, usagePercent)}%` }}
          />
        </div>
        <p className="mt-2 text-right kanban-heading-md font-mono text-[var(--text-primary)]">{usagePercent}%</p>

        <div className="mt-4 space-y-3">
          {CATEGORIES.map((cat) => (
            <div key={cat} className="flex items-center gap-4 py-2.5">
              <span className="w-40 shrink-0 kanban-body-md text-[var(--text-primary)]">{cat}</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--bg-warm-gray)]">
                <div className="h-full w-0 rounded-full bg-[var(--copper-500)]" />
              </div>
              <span className="w-24 shrink-0 text-right kanban-body-sm font-mono text-[var(--text-secondary)]">
                {formatCurrency(0, currency)}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-8">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="kanban-heading-lg text-[var(--text-primary)]">Budget by WBS</h3>
          <button type="button" className="kanban-body-sm text-[var(--copper-500)] hover:underline">
            View Detailed Report
          </button>
        </div>
        <div className="overflow-x-auto rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-white)]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>WBS Code</TableHead>
                <TableHead>WBS Name</TableHead>
                <TableHead className="text-right">Allocated</TableHead>
                <TableHead className="text-right">Used</TableHead>
                <TableHead className="text-right">Remaining</TableHead>
                <TableHead className="text-right">% Used</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leafWbs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center kanban-body-sm text-[var(--text-secondary)]">
                    Budget allocation pending.{" "}
                    <button type="button" className="text-[var(--copper-500)] hover:underline" onClick={onEditAllocation}>
                      Allocate budget to WBS nodes
                    </button>{" "}
                    to track spending.
                  </TableCell>
                </TableRow>
              ) : (
                leafWbs.slice(0, 12).map((w) => {
                  const allocated = Number(w.budgetedCost || 0);
                  const used = Number(w.actualCost || 0);
                  const hasAlloc = allocationComplete && allocated > 0;
                  return (
                    <TableRow key={w.id}>
                      <TableCell className="font-mono kanban-body-sm">{w.code}</TableCell>
                      <TableCell className="kanban-body-md">{w.name}</TableCell>
                      <TableCell className="text-right font-mono kanban-body-sm">
                        {hasAlloc ? formatCurrency(allocated, currency) : "—"}
                      </TableCell>
                      <TableCell className="text-right font-mono kanban-body-sm">
                        {hasAlloc ? formatCurrency(used, currency) : "—"}
                      </TableCell>
                      <TableCell className="text-right font-mono kanban-body-sm">
                        {hasAlloc ? formatCurrency(allocated - used, currency) : "—"}
                      </TableCell>
                      <TableCell className="text-right font-mono kanban-body-sm">
                        {hasAlloc && allocated > 0 ? `${Math.round((used / allocated) * 100)}%` : "—"}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
        {!allocationComplete && (
          <p className="mt-3 kanban-body-sm text-[var(--text-secondary)]">
            <Link href={`/newproject/${projectId}`} className="text-[var(--copper-500)] hover:underline">
              Go to project setup
            </Link>{" "}
            to allocate budget across WBS nodes.
          </p>
        )}
      </div>
    </div>
  );
}
