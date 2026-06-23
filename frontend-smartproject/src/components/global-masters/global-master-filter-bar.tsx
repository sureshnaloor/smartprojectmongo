import { Search } from "lucide-react";
import type { MasterFilterConfig } from "./constants";

export interface FilterState {
  search: string;
  type: string;
  category: string;
  status: string;
}

interface GlobalMasterFilterBarProps {
  filters: MasterFilterConfig;
  value: FilterState;
  onChange: (next: FilterState) => void;
}

const STATUS_OPTIONS = [
  { value: "all", label: "All Statuses" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "archived", label: "Archived" },
];

export function GlobalMasterFilterBar({ filters, value, onChange }: GlobalMasterFilterBarProps) {
  const hasActive =
    value.search ||
    value.type !== "all" ||
    value.category !== "all" ||
    value.status !== "all";

  return (
    <div className="gm-filter-bar">
      <div className="relative flex-1 min-w-[200px] max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--text-muted)]" />
        <input
          type="search"
          placeholder="Search by name or code…"
          value={value.search}
          onChange={(e) => onChange({ ...value, search: e.target.value })}
          className="w-full pl-9"
        />
      </div>
      <select
        value={value.type}
        onChange={(e) => onChange({ ...value, type: e.target.value })}
      >
        {filters.typeOptions.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <select
        value={value.category}
        onChange={(e) => onChange({ ...value, category: e.target.value })}
      >
        {filters.categoryOptions.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <select
        value={value.status}
        onChange={(e) => onChange({ ...value, status: e.target.value })}
      >
        {STATUS_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {hasActive && (
        <button
          type="button"
          className="text-xs text-[var(--copper-500)] hover:underline"
          onClick={() =>
            onChange({ search: "", type: "all", category: "all", status: "all" })
          }
        >
          Clear
        </button>
      )}
    </div>
  );
}
