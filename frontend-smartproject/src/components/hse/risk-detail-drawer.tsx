import { Loader2, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  levelFromApi,
  riskScore,
  scoreBadgeStyle,
  statusBadgeClass,
  statusDisplay,
  typeBadgeClass,
} from "./constants";
import { RiskDotIndicator } from "./risk-dot-indicator";
import type { RiskEntry } from "./types";

interface RiskDetailDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  risk: RiskEntry | null;
  onEdit: () => void;
  onDelete: () => void;
  onStatusChange: (status: RiskEntry["status"]) => void;
  isDeleting: boolean;
}

export function RiskDetailDrawer({
  open,
  onOpenChange,
  risk,
  onEdit,
  onDelete,
  onStatusChange,
  isDeleting,
}: RiskDetailDrawerProps) {
  if (!risk) return null;

  const score = riskScore(risk.probability, risk.impact);
  const probLevel = levelFromApi(risk.probability);
  const impactLevel = levelFromApi(risk.impact);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-[520px] overflow-y-auto p-0">
        <SheetHeader className="border-b px-6 py-5 text-left" style={{ borderColor: "var(--border-subtle)" }}>
          <div className="flex items-start gap-3 pr-8">
            <SheetTitle className="kanban-heading-lg flex-1">{risk.risk}</SheetTitle>
            <Badge className={typeBadgeClass(risk.riskType)}>{risk.riskType}</Badge>
          </div>
        </SheetHeader>

        <div className="space-y-6 px-6 py-5">
          {/* Mini matrix */}
          <div>
            <Label className="kanban-caption text-[var(--text-muted)] mb-2 block">Risk position</Label>
            <div className="grid grid-cols-5 gap-0.5 rounded-[var(--radius-md)] overflow-hidden border" style={{ borderColor: "var(--border-subtle)" }}>
              {Array.from({ length: 25 }, (_, i) => {
                const row = Math.floor(i / 5);
                const col = i % 5;
                const p = 5 - row;
                const im = col + 1;
                const cellScore = p * im;
                const active = p === probLevel && im === impactLevel;
                const bg =
                  cellScore <= 4
                    ? "var(--status-success-bg)"
                    : cellScore <= 9
                      ? "var(--status-warning-bg)"
                      : cellScore <= 16
                        ? "rgba(220,38,38,0.15)"
                        : "var(--status-danger)";
                return (
                  <div
                    key={i}
                    className="aspect-square"
                    style={{
                      backgroundColor: active ? "var(--copper-400)" : bg,
                      outline: active ? "2px solid var(--copper-600)" : undefined,
                    }}
                  />
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="kanban-caption text-[var(--text-muted)]">Owner</Label>
              <p className="kanban-body-sm text-[var(--text-secondary)] mt-1">{risk.userLogged}</p>
            </div>
            <div>
              <Label className="kanban-caption text-[var(--text-muted)]">Date Logged</Label>
              <p className="kanban-body-sm text-[var(--text-secondary)] mt-1">
                {new Date(risk.dateLogged).toLocaleDateString()}
              </p>
            </div>
            <div>
              <Label className="kanban-caption text-[var(--text-muted)]">Probability</Label>
              <div className="mt-1"><RiskDotIndicator value={risk.probability} /></div>
            </div>
            <div>
              <Label className="kanban-caption text-[var(--text-muted)]">Impact</Label>
              <div className="mt-1"><RiskDotIndicator value={risk.impact} /></div>
            </div>
            <div>
              <Label className="kanban-caption text-[var(--text-muted)]">Risk Score</Label>
              <span
                className="inline-flex h-8 w-8 items-center justify-center rounded-full font-bold font-mono mt-1"
                style={scoreBadgeStyle(score)}
              >
                {score}
              </span>
            </div>
            <div>
              <Label className="kanban-caption text-[var(--text-muted)]">Status</Label>
              <div className="mt-1">
                <Badge className={statusBadgeClass(risk.status)}>{statusDisplay(risk.status)}</Badge>
              </div>
            </div>
          </div>

          <div>
            <Label className="kanban-caption text-[var(--text-muted)]">Description</Label>
            <p className="kanban-body-md text-[var(--text-secondary)] mt-1 whitespace-pre-wrap">
              {risk.remarks || "—"}
            </p>
          </div>

          <div>
            <Label className="kanban-caption text-[var(--text-muted)]">Mitigation</Label>
            <p className="kanban-body-md text-[var(--text-secondary)] mt-1 whitespace-pre-wrap">
              {risk.actionTaken}
            </p>
          </div>

          <div>
            <Label className="kanban-caption text-[var(--text-muted)]">History</Label>
            <p className="kanban-caption text-[var(--text-muted)] mt-2">
              Last updated {new Date(risk.updatedAt).toLocaleString()}
            </p>
          </div>

          <div>
            <Label className="kanban-caption text-[var(--text-muted)]">Comments</Label>
            <p className="kanban-body-sm text-[var(--text-muted)] mt-2 italic">No comments yet</p>
          </div>
        </div>

        <div
          className="sticky bottom-0 flex flex-wrap gap-2 border-t bg-[var(--bg-white)] px-6 py-4"
          style={{ borderColor: "var(--border-subtle)" }}
        >
          <Button variant="outline" onClick={onEdit} className="gap-1">
            <Pencil className="h-4 w-4" />
            Edit
          </Button>
          <Select value={risk.status} onValueChange={(v) => onStatusChange(v as RiskEntry["status"])}>
            <SelectTrigger className="w-[140px] h-9">
              <SelectValue placeholder="Change status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Open">Open</SelectItem>
              <SelectItem value="In Progress">Mitigated</SelectItem>
              <SelectItem value="Closed">Closed</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="ghost"
            className="text-[var(--status-danger)] hover:text-[var(--status-danger)] gap-1"
            onClick={onDelete}
            disabled={isDeleting}
          >
            {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            Delete
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
