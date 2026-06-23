import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { cn } from "@/lib/utils";
import {
  apiFromLevel,
  FIVE_LEVELS,
  levelFromApi,
  riskScore,
  scoreBadgeStyle,
} from "./constants";
import type { RiskFormData } from "./types";

interface RiskFormDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  form: RiskFormData;
  onChange: (form: RiskFormData) => void;
  onSubmit: () => void;
  isPending: boolean;
  submitLabel?: string;
}

function SegmentBar({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (level: number) => void;
}) {
  return (
    <div>
      <Label className="kanban-caption text-[var(--text-muted)]">{label}</Label>
      <div className="flex gap-1 mt-2">
        {FIVE_LEVELS.map((l) => (
          <button
            key={l.level}
            type="button"
            onClick={() => onChange(l.level)}
            className={cn(
              "flex-1 rounded-full py-1.5 kanban-caption font-medium transition-all",
              value === l.level
                ? "text-white shadow-sm"
                : "text-[var(--text-secondary)]"
            )}
            style={{
              backgroundColor:
                value === l.level
                  ? l.level <= 2
                    ? "var(--status-success)"
                    : l.level === 3
                      ? "var(--status-warning)"
                      : "var(--status-danger)"
                  : "var(--bg-warm-gray)",
            }}
          >
            {l.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function RiskFormDrawer({
  open,
  onOpenChange,
  title,
  form,
  onChange,
  onSubmit,
  isPending,
  submitLabel = "Add Entry",
}: RiskFormDrawerProps) {
  const probLevel = form.probability ? levelFromApi(form.probability) : 0;
  const impactLevel = form.impact ? levelFromApi(form.impact) : 0;
  const score = probLevel && impactLevel ? riskScore(form.probability, form.impact) : 0;
  const [scoreBounce, setScoreBounce] = useState(false);

  const setProbLevel = (level: number) => {
    onChange({ ...form, probability: apiFromLevel(level) });
    setScoreBounce(true);
    setTimeout(() => setScoreBounce(false), 300);
  };

  const setImpactLevel = (level: number) => {
    onChange({ ...form, impact: apiFromLevel(level) });
    setScoreBounce(true);
    setTimeout(() => setScoreBounce(false), 300);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-[560px] overflow-y-auto p-0">
        <SheetHeader className="border-b px-6 py-5 text-left" style={{ borderColor: "var(--border-subtle)" }}>
          <SheetTitle className="kanban-heading-lg">{title}</SheetTitle>
        </SheetHeader>

        <div className="space-y-4 px-6 py-5">
          <div>
            <Label className="kanban-caption text-[var(--text-muted)]">Type</Label>
            <div className="flex gap-3 mt-2">
              {(["Risk", "Opportunity"] as const).map((t) => (
                <label key={t} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="riskType"
                    checked={form.riskType === t}
                    onChange={() => onChange({ ...form, riskType: t })}
                    className="accent-[var(--copper-600)]"
                  />
                  <span className="kanban-body-sm">{t}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <Label htmlFor="risk-title">Title *</Label>
            <Input
              id="risk-title"
              value={form.risk}
              onChange={(e) => onChange({ ...form, risk: e.target.value })}
              placeholder="Enter risk title"
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="risk-desc">Description / context</Label>
            <Textarea
              id="risk-desc"
              value={form.remarks}
              onChange={(e) => onChange({ ...form, remarks: e.target.value })}
              placeholder="Describe the risk, its potential impact, and context..."
              rows={3}
              className="mt-1 resize-none"
            />
          </div>

          <SegmentBar label="Probability" value={probLevel} onChange={setProbLevel} />
          <SegmentBar label="Impact" value={impactLevel} onChange={setImpactLevel} />

          {score > 0 && (
            <div className="flex items-center gap-3">
              <Label className="kanban-caption text-[var(--text-muted)]">Risk Score</Label>
              <span
                className={cn(
                  "inline-flex h-10 w-10 items-center justify-center rounded-full font-bold font-mono",
                  scoreBounce && "hse-score-bounce"
                )}
                style={scoreBadgeStyle(score)}
              >
                {score}
              </span>
            </div>
          )}

          <div>
            <Label htmlFor="mitigation">Mitigation Strategy *</Label>
            <Textarea
              id="mitigation"
              value={form.actionTaken}
              onChange={(e) => onChange({ ...form, actionTaken: e.target.value })}
              placeholder="Describe planned mitigation actions..."
              rows={3}
              className="mt-1 resize-none"
            />
          </div>

          <div>
            <Label htmlFor="owner">Owner *</Label>
            <Input
              id="owner"
              value={form.userLogged}
              onChange={(e) => onChange({ ...form, userLogged: e.target.value })}
              placeholder="Responsible person"
              className="mt-1"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="dateLogged">Date Logged</Label>
              <Input
                id="dateLogged"
                type="date"
                value={form.dateLogged}
                onChange={(e) => onChange({ ...form, dateLogged: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Status</Label>
              <Select
                value={form.status}
                onValueChange={(v) => onChange({ ...form, status: v as RiskFormData["status"] })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Open">Open</SelectItem>
                  <SelectItem value="In Progress">Mitigated</SelectItem>
                  <SelectItem value="Closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div
          className="sticky bottom-0 flex gap-2 border-t bg-[var(--bg-white)] px-6 py-4"
          style={{ borderColor: "var(--border-subtle)" }}
        >
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button
            onClick={onSubmit}
            disabled={isPending}
            className="bg-[var(--copper-600)] hover:bg-[var(--copper-400)]"
          >
            {isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {submitLabel}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
