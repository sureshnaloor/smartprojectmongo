import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  IMPACT_FILTER_OPTIONS,
  PROBABILITY_FILTER_OPTIONS,
  STATUS_FILTER_OPTIONS,
  TYPE_FILTER_OPTIONS,
} from "./constants";

interface RiskFilterBarProps {
  search: string;
  onSearchChange: (v: string) => void;
  filterType: string;
  onFilterTypeChange: (v: string) => void;
  filterProbability: string;
  onFilterProbabilityChange: (v: string) => void;
  filterImpact: string;
  onFilterImpactChange: (v: string) => void;
  filterStatus: string;
  onFilterStatusChange: (v: string) => void;
  onClear: () => void;
}

export function RiskFilterBar({
  search,
  onSearchChange,
  filterType,
  onFilterTypeChange,
  filterProbability,
  onFilterProbabilityChange,
  filterImpact,
  onFilterImpactChange,
  filterStatus,
  onFilterStatusChange,
  onClear,
}: RiskFilterBarProps) {
  const hasActive =
    search.trim() !== "" ||
    filterType !== "all" ||
    filterProbability !== "all" ||
    filterImpact !== "all" ||
    filterStatus !== "all";

  const selectClass = "h-8 bg-[var(--bg-warm-gray)] border-transparent kanban-body-sm";

  return (
    <div
      className="flex flex-wrap items-center gap-3 rounded-[var(--radius-md)] border bg-[var(--bg-white)] px-6 py-4 mb-6"
      style={{ borderColor: "var(--border-subtle)" }}
    >
      <div className="relative w-full sm:w-[220px]">
        <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--text-muted)]" />
        <Input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search risks..."
          className={cn("h-8 pl-8", search && "border-[var(--copper-400)]")}
        />
      </div>

      <Select value={filterType} onValueChange={onFilterTypeChange}>
        <SelectTrigger className={cn(selectClass, "w-[130px]", filterType !== "all" && "border-[var(--copper-400)]")}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {TYPE_FILTER_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={filterProbability} onValueChange={onFilterProbabilityChange}>
        <SelectTrigger className={cn(selectClass, "w-[150px]", filterProbability !== "all" && "border-[var(--copper-400)]")}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {PROBABILITY_FILTER_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={filterImpact} onValueChange={onFilterImpactChange}>
        <SelectTrigger className={cn(selectClass, "w-[130px]", filterImpact !== "all" && "border-[var(--copper-400)]")}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {IMPACT_FILTER_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={filterStatus} onValueChange={onFilterStatusChange}>
        <SelectTrigger className={cn(selectClass, "w-[130px]", filterStatus !== "all" && "border-[var(--copper-400)]")}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {STATUS_FILTER_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {hasActive && (
        <button
          type="button"
          onClick={onClear}
          className="kanban-body-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        >
          Clear Filters
        </button>
      )}
    </div>
  );
}
