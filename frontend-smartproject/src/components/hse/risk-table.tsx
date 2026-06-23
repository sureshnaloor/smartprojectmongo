import { Loader2, Pencil, Plus, ShieldCheck, Trash2, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
  riskScore,
  scoreBadgeStyle,
  statusBadgeClass,
  statusDisplay,
  typeBadgeClass,
} from "./constants";
import { RiskDotIndicator } from "./risk-dot-indicator";
import type { RiskEntry } from "./types";

interface RiskTableProps {
  risks: RiskEntry[];
  isLoading: boolean;
  selectedId: number | null;
  onSelect: (risk: RiskEntry) => void;
  onEdit: (risk: RiskEntry) => void;
  onDelete: (id: number) => void;
  onAddFirst: () => void;
  sortKey: string;
  sortDir: "asc" | "desc";
  onSort: (key: string) => void;
}

function SortHead({
  label,
  sortKey,
  current,
  dir,
  onSort,
  className,
}: {
  label: string;
  sortKey: string;
  current: string;
  dir: "asc" | "desc";
  onSort: (k: string) => void;
  className?: string;
}) {
  return (
    <TableHead
      className={cn("cursor-pointer select-none uppercase tracking-wide kanban-body-sm text-[var(--text-secondary)]", className)}
      onClick={() => onSort(sortKey)}
    >
      {label}
      {current === sortKey && (dir === "asc" ? " ↑" : " ↓")}
    </TableHead>
  );
}

export function RiskTable({
  risks,
  isLoading,
  selectedId,
  onSelect,
  onEdit,
  onDelete,
  onAddFirst,
  sortKey,
  sortDir,
  onSort,
}: RiskTableProps) {
  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--text-muted)]" />
      </div>
    );
  }

  if (risks.length === 0) {
    return (
      <div
        className="flex min-h-[300px] flex-col items-center justify-center rounded-[var(--radius-md)] border bg-[var(--bg-white)] px-6 py-12 text-center"
        style={{ borderColor: "var(--border-subtle)" }}
      >
        <div
          className="mb-4 flex h-[100px] w-[100px] items-center justify-center rounded-full"
          style={{ backgroundColor: "var(--bg-warm-gray)" }}
        >
          <ShieldCheck className="h-12 w-12 text-[var(--text-muted)] opacity-20" />
        </div>
        <h3 className="kanban-heading-md text-[var(--text-primary)] mb-2">No risks or opportunities found</h3>
        <p className="kanban-body-sm text-[var(--text-secondary)] max-w-md mb-6">
          Your risk register is clean. Add your first risk or opportunity to start tracking.
        </p>
        <Button
          onClick={onAddFirst}
          className="gap-1.5 bg-[var(--copper-600)] hover:bg-[var(--copper-400)]"
          style={{ boxShadow: "var(--shadow-copper)" }}
        >
          <Plus className="h-4 w-4" />
          Add First Risk
        </Button>
      </div>
    );
  }

  return (
    <div
      className="overflow-x-auto rounded-[var(--radius-md)] border bg-[var(--bg-white)]"
      style={{ borderColor: "var(--border-subtle)" }}
    >
      <Table>
        <TableHeader>
          <TableRow style={{ backgroundColor: "var(--bg-warm-gray)" }}>
            <SortHead label="Date Logged" sortKey="dateLogged" current={sortKey} dir={sortDir} onSort={onSort} className="w-[120px]" />
            <SortHead label="Risk/Opportunity" sortKey="risk" current={sortKey} dir={sortDir} onSort={onSort} />
            <SortHead label="Type" sortKey="riskType" current={sortKey} dir={sortDir} onSort={onSort} className="w-[100px]" />
            <SortHead label="Probability" sortKey="probability" current={sortKey} dir={sortDir} onSort={onSort} className="w-[130px]" />
            <SortHead label="Impact" sortKey="impact" current={sortKey} dir={sortDir} onSort={onSort} className="w-[120px]" />
            <TableHead className="w-[60px] kanban-body-sm uppercase tracking-wide text-[var(--text-secondary)]">Score</TableHead>
            <SortHead label="User" sortKey="userLogged" current={sortKey} dir={sortDir} onSort={onSort} className="w-[140px]" />
            <SortHead label="Status" sortKey="status" current={sortKey} dir={sortDir} onSort={onSort} className="w-[110px]" />
            <TableHead className="w-[80px] kanban-body-sm uppercase tracking-wide text-[var(--text-secondary)]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {risks.map((risk) => {
            const score = riskScore(risk.probability, risk.impact);
            const badge = scoreBadgeStyle(score);
            const selected = selectedId === risk.id;
            return (
              <TableRow
                key={risk.id}
                className={cn(
                  "cursor-pointer transition-colors",
                  selected && "border-l-[3px]"
                )}
                style={{
                  backgroundColor: selected ? "var(--copper-50)" : undefined,
                  borderLeftColor: selected ? "var(--copper-500)" : undefined,
                }}
                onClick={() => onSelect(risk)}
                onMouseEnter={(e) => {
                  if (!selected) e.currentTarget.style.backgroundColor = "rgba(253, 246, 237, 0.4)";
                }}
                onMouseLeave={(e) => {
                  if (!selected) e.currentTarget.style.backgroundColor = "";
                }}
              >
                <TableCell className="kanban-body-sm text-[var(--text-secondary)]">
                  {new Date(risk.dateLogged).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  <p className="kanban-body-md font-medium text-[var(--text-primary)] line-clamp-1">{risk.risk}</p>
                  <p className="kanban-body-sm text-[var(--text-secondary)] line-clamp-1">{risk.actionTaken}</p>
                </TableCell>
                <TableCell>
                  <Badge className={typeBadgeClass(risk.riskType)}>{risk.riskType}</Badge>
                </TableCell>
                <TableCell>
                  <RiskDotIndicator value={risk.probability} />
                </TableCell>
                <TableCell>
                  <RiskDotIndicator value={risk.impact} />
                </TableCell>
                <TableCell>
                  <span
                    className="inline-flex h-7 w-7 items-center justify-center rounded-full kanban-caption font-bold"
                    style={badge}
                  >
                    {score}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span
                      className="flex h-7 w-7 items-center justify-center rounded-full"
                      style={{ backgroundColor: "var(--bg-warm-gray)" }}
                    >
                      <User className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                    </span>
                    <span className="kanban-body-sm text-[var(--text-secondary)] truncate max-w-[90px]">
                      {risk.userLogged}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge className={statusBadgeClass(risk.status)}>{statusDisplay(risk.status)}</Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-0.5" onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(risk)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 hover:text-[var(--status-danger)]"
                      onClick={() => onDelete(risk.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
