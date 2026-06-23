import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { ChevronDown, ChevronUp } from "lucide-react";
import {
  KANBAN_PRIORITY_OPTIONS,
  NONE_PRIORITY,
  type PriorityFieldValue,
} from "./constants";

interface KanbanInlineAddProps {
  onSubmit: (title: string) => void;
  onCancel: () => void;
}

export function KanbanInlineAdd({ onSubmit, onCancel }: KanbanInlineAddProps) {
  const [title, setTitle] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<PriorityFieldValue>(NONE_PRIORITY);

  const handleSubmit = () => {
    if (!title.trim()) return;
    onSubmit(title.trim());
    setTitle("");
    setDescription("");
    setPriority(NONE_PRIORITY);
    setExpanded(false);
  };

  return (
    <div
      className="mb-2.5 rounded-[var(--radius-md)] border bg-[var(--bg-white)] p-3 shadow-[var(--shadow-sm)]"
      style={{ borderColor: "var(--border-subtle)" }}
    >
      <Input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Enter card title..."
        className="mb-2 h-8"
        onKeyDown={(e) => {
          if (e.key === "Enter" && !expanded) handleSubmit();
          if (e.key === "Escape") onCancel();
        }}
      />

      {expanded && (
        <div className="space-y-2 mb-2">
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description (optional)"
            rows={2}
            className="text-sm resize-none"
          />
          <div>
            <Label className="kanban-caption text-[var(--text-muted)]">Priority</Label>
            <Select value={priority} onValueChange={(v) => setPriority(v as PriorityFieldValue)}>
              <SelectTrigger className="h-8 mt-1">
                <SelectValue placeholder="Priority" />
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
        </div>
      )}

      <div className="flex items-center gap-2">
        <Button size="sm" className="h-7 bg-[var(--copper-600)] hover:bg-[var(--copper-400)]" onClick={handleSubmit}>
          Add card
        </Button>
        <Button variant="ghost" size="sm" className="h-7" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 ml-auto gap-1 text-[var(--text-muted)]"
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          {expanded ? "Less" : "More"}
        </Button>
      </div>
    </div>
  );
}
