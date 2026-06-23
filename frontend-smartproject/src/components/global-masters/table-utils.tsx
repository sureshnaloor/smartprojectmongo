import { useMemo } from "react";
import type { FilterState } from "./global-master-filter-bar";

export function useFilteredRows<T>(
  rows: T[],
  filters: FilterState,
  matchers: {
    search: (row: T, q: string) => boolean;
    type?: (row: T, type: string) => boolean;
    category?: (row: T, category: string) => boolean;
    status?: (row: T, status: string) => boolean;
  }
): T[] {
  return useMemo(() => {
    return rows.filter((row) => {
      if (filters.search && !matchers.search(row, filters.search.toLowerCase())) return false;
      if (filters.type !== "all" && matchers.type && !matchers.type(row, filters.type)) return false;
      if (filters.category !== "all" && matchers.category && !matchers.category(row, filters.category)) return false;
      if (filters.status !== "all" && matchers.status && !matchers.status(row, filters.status)) return false;
      return true;
    });
  }, [rows, filters, matchers]);
}

export function statusBadgeClass(status: string): string {
  const s = status.toLowerCase();
  if (s === "inactive" || s === "archived") return "bg-slate-100 text-slate-600";
  return "bg-emerald-50 text-emerald-700";
}

export function typeBadgeStyle(label: string): { bg: string; text: string } {
  const map: Record<string, { bg: string; text: string }> = {
    Skilled: { bg: "rgba(59,130,246,0.12)", text: "#2563eb" },
    "Semi-Skilled": { bg: "rgba(20,184,166,0.12)", text: "#0d9488" },
    Unskilled: { bg: "rgba(100,116,139,0.12)", text: "#64748b" },
    Supervisor: { bg: "rgba(249,115,22,0.12)", text: "#ea580c" },
    manpower: { bg: "rgba(59,130,246,0.12)", text: "#2563eb" },
    equipment: { bg: "rgba(30,58,95,0.12)", text: "#1e3a5f" },
    Heavy: { bg: "rgba(30,58,95,0.12)", text: "#1e3a5f" },
    Light: { bg: "rgba(100,116,139,0.12)", text: "#64748b" },
    Direct: { bg: "rgba(16,185,129,0.12)", text: "#059669" },
    Indirect: { bg: "rgba(249,115,22,0.12)", text: "#ea580c" },
    Standard: { bg: "rgba(59,130,246,0.12)", text: "#2563eb" },
    Custom: { bg: "rgba(249,115,22,0.12)", text: "#ea580c" },
    Supplier: { bg: "rgba(16,185,129,0.12)", text: "#059669" },
    Own: { bg: "rgba(16,185,129,0.12)", text: "#059669" },
    Template: { bg: "rgba(59,130,246,0.12)", text: "#2563eb" },
  };
  return map[label] ?? { bg: "rgba(148,163,184,0.12)", text: "#64748b" };
}

export function TypeBadge({ label }: { label: string }) {
  const { bg, text } = typeBadgeStyle(label);
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[0.6875rem] font-semibold"
      style={{ backgroundColor: bg, color: text }}
    >
      {label}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const active = status.toLowerCase() === "active";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[0.6875rem] font-semibold ${
        active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"
      }`}
    >
      {active ? "Active" : "Inactive"}
    </span>
  );
}
