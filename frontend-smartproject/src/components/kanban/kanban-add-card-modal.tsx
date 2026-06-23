import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  KANBAN_PRIORITY_OPTIONS,
  NONE_ACTIVITY,
  NONE_PRIORITY,
  NONE_WBS,
  type PriorityFieldValue,
} from "./constants";
import type { WbsItem } from "@shared/schema";

interface ActivityChoice {
  id: number;
  label: string;
}

interface KanbanAddCardModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  onTitleChange: (v: string) => void;
  description: string;
  onDescriptionChange: (v: string) => void;
  priority: PriorityFieldValue;
  onPriorityChange: (v: PriorityFieldValue) => void;
  wbsId: string;
  onWbsIdChange: (v: string) => void;
  activityId: string;
  onActivityIdChange: (v: string) => void;
  wbsItems: WbsItem[];
  activityChoices: ActivityChoice[];
  activitiesLoading: boolean;
  onSubmit: () => void;
  isPending: boolean;
}

export function KanbanAddCardModal({
  open,
  onOpenChange,
  title,
  onTitleChange,
  description,
  onDescriptionChange,
  priority,
  onPriorityChange,
  wbsId,
  onWbsIdChange,
  activityId,
  onActivityIdChange,
  wbsItems,
  activityChoices,
  activitiesLoading,
  onSubmit,
  isPending,
}: KanbanAddCardModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="kanban-heading-lg">Create Card</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label htmlFor="kanban-add-title">Title</Label>
            <Input
              id="kanban-add-title"
              value={title}
              onChange={(e) => onTitleChange(e.target.value)}
              placeholder="Enter card title..."
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="kanban-add-desc">Description</Label>
            <Textarea
              id="kanban-add-desc"
              value={description}
              onChange={(e) => onDescriptionChange(e.target.value)}
              placeholder="Brief description"
              className="mt-1 resize-none"
              rows={3}
            />
          </div>
          <div>
            <Label>Priority</Label>
            <Select value={priority} onValueChange={(v) => onPriorityChange(v as PriorityFieldValue)}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Priority (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE_PRIORITY}>No priority</SelectItem>
                {KANBAN_PRIORITY_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.displayLabel}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>WBS link (optional)</Label>
            <Select
              value={wbsId}
              onValueChange={(v) => {
                onWbsIdChange(v);
                onActivityIdChange(NONE_ACTIVITY);
              }}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="No WBS" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE_WBS}>No WBS (standalone task)</SelectItem>
                {wbsItems
                  .slice()
                  .sort((a, b) => `${a.code}`.localeCompare(`${b.code}`, undefined, { numeric: true }))
                  .map((w) => (
                    <SelectItem key={w.id} value={String(w.id)}>
                      {w.code ? `${w.code} — ${w.name}` : w.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Activity (optional)</Label>
            <Select value={activityId} disabled={wbsId === NONE_WBS} onValueChange={onActivityIdChange}>
              <SelectTrigger className="mt-1">
                <SelectValue
                  placeholder={
                    wbsId === NONE_WBS
                      ? "Select WBS first"
                      : activitiesLoading
                        ? "Loading activities…"
                        : "No linked activity"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE_ACTIVITY}>No linked activity</SelectItem>
                {activityChoices.map((a) => (
                  <SelectItem key={a.id} value={String(a.id)}>
                    {a.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={onSubmit}
            disabled={!title.trim() || isPending}
            className="bg-[var(--copper-600)] hover:bg-[var(--copper-400)]"
          >
            {isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Create Card
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
