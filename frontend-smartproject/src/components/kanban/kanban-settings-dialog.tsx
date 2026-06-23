import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { COLUMNS } from "./constants";
import type { AutomationRules, ColumnLimits } from "./types";

interface KanbanSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  limits: ColumnLimits;
  onLimitsChange: (limits: ColumnLimits) => void;
  automation: AutomationRules;
  onAutomationChange: (rules: AutomationRules) => void;
}

export function KanbanSettingsDialog({
  open,
  onOpenChange,
  limits,
  onLimitsChange,
  automation,
  onAutomationChange,
}: KanbanSettingsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="kanban-heading-lg">Board settings</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-2">
          <div>
            <h3 className="kanban-body-md font-semibold text-[var(--text-primary)] mb-3">
              Column WIP limits
            </h3>
            <div className="space-y-3">
              {COLUMNS.map((col) => (
                <div key={col.id} className="flex items-center justify-between gap-3">
                  <Label className="kanban-body-sm text-[var(--text-secondary)]">{col.title}</Label>
                  <Input
                    type="number"
                    min={0}
                    className="h-8 w-20"
                    placeholder="∞"
                    value={limits[col.id] ?? ""}
                    onChange={(e) => {
                      const v = e.target.value;
                      onLimitsChange({
                        ...limits,
                        [col.id]: v === "" ? undefined : Math.max(0, parseInt(v, 10) || 0),
                      });
                    }}
                  />
                </div>
              ))}
            </div>
            <p className="kanban-caption text-[var(--text-muted)] mt-2">
              When exceeded, column header pulses orange and shows count/limit.
            </p>
          </div>

          <div>
            <h3 className="kanban-body-md font-semibold text-[var(--text-primary)] mb-3">
              Automation rules
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <Label className="kanban-body-sm text-[var(--text-secondary)] flex-1">
                  When card moved to DONE → mark linked activity complete
                </Label>
                <Switch
                  checked={automation.markActivityCompleteOnDone}
                  onCheckedChange={(v) =>
                    onAutomationChange({ ...automation, markActivityCompleteOnDone: v })
                  }
                />
              </div>
              <div className="flex items-center justify-between gap-3">
                <Label className="kanban-body-sm text-[var(--text-secondary)] flex-1">
                  When card overdue → move to top of DOING
                </Label>
                <Switch
                  checked={automation.moveOverdueToTop}
                  onCheckedChange={(v) =>
                    onAutomationChange({ ...automation, moveOverdueToTop: v })
                  }
                />
              </div>
              <div className="flex items-center justify-between gap-3">
                <Label className="kanban-body-sm text-[var(--text-secondary)] flex-1">
                  When new activity created in WBS → auto-create card in WISH
                </Label>
                <Switch
                  checked={automation.autoCreateCardOnWbsActivity}
                  onCheckedChange={(v) =>
                    onAutomationChange({ ...automation, autoCreateCardOnWbsActivity: v })
                  }
                />
              </div>
            </div>
          </div>
        </div>

        <Button onClick={() => onOpenChange(false)} className="w-full bg-[var(--copper-600)] hover:bg-[var(--copper-400)]">
          Done
        </Button>
      </DialogContent>
    </Dialog>
  );
}
