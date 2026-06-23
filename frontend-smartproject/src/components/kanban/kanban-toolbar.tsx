import { Filter, Plus, Search, Settings, Columns3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { GROUP_BY_OPTIONS, type GroupByValue } from "./constants";

interface KanbanToolbarProps {
  totalCards: number;
  search: string;
  onSearchChange: (v: string) => void;
  groupBy: GroupByValue;
  onGroupByChange: (v: GroupByValue) => void;
  priorityFilter: string;
  onPriorityFilterChange: (v: string) => void;
  onAddCard: () => void;
  onOpenSettings: () => void;
  columnsCollapsed: boolean;
  onToggleColumns: () => void;
}

export function KanbanToolbar({
  totalCards,
  search,
  onSearchChange,
  groupBy,
  onGroupByChange,
  priorityFilter,
  onPriorityFilterChange,
  onAddCard,
  onOpenSettings,
  columnsCollapsed,
  onToggleColumns,
}: KanbanToolbarProps) {
  return (
    <div
      className="sticky top-[49px] z-20 flex flex-col gap-3 border-b bg-[var(--bg-white)] px-6 py-4 sm:flex-row sm:items-center sm:justify-between lg:px-8"
      style={{ borderColor: "var(--border-subtle)" }}
    >
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="kanban-heading-lg text-[var(--text-primary)]">Kanban</h2>
        <span className="kanban-body-sm text-[var(--text-secondary)]">
          {totalCards} active card{totalCards === 1 ? "" : "s"} · drag to move · activity link optional
        </span>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-[var(--text-secondary)]">
              <Filter className="h-3.5 w-3.5" />
              Filter
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-56">
            <div className="space-y-3">
              <Label className="kanban-caption text-[var(--text-secondary)]">Priority</Label>
              <Select value={priorityFilter} onValueChange={onPriorityFilterChange}>
                <SelectTrigger className="h-8">
                  <SelectValue placeholder="All priorities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All priorities</SelectItem>
                  <SelectItem value="immediate_urgent">Critical</SelectItem>
                  <SelectItem value="before_end_of_today">High</SelectItem>
                  <SelectItem value="normal">Medium</SelectItem>
                  <SelectItem value="unset">Low / unset</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </PopoverContent>
        </Popover>

        <div className="flex items-center gap-2">
          <span className="kanban-caption text-[var(--text-muted)] hidden sm:inline">Group by</span>
          <Select value={groupBy} onValueChange={(v) => onGroupByChange(v as GroupByValue)}>
            <SelectTrigger className="h-8 w-[130px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {GROUP_BY_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="relative w-full sm:w-[200px]">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--text-muted)]" />
          <Input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search cards..."
            className="h-8 pl-8 text-sm"
          />
        </div>
      </div>

      <div className="flex items-center gap-2.5">
        <Button
          onClick={onAddCard}
          size="sm"
          className="gap-1.5 bg-[var(--copper-600)] hover:bg-[var(--copper-400)] text-white"
          style={{ boxShadow: "var(--shadow-copper)" }}
        >
          <Plus className="h-4 w-4" />
          Add card
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-[var(--text-secondary)]"
          onClick={onOpenSettings}
          aria-label="Board settings"
        >
          <Settings className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-[var(--text-secondary)]"
          onClick={onToggleColumns}
          aria-label={columnsCollapsed ? "Expand columns" : "Collapse columns"}
        >
          <Columns3 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
