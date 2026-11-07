export interface Portfolio {
  id: number;
  name: string;
  description: string;
  managerId: number | null;
  managerName: string | null;
  createdAt: string;
  updatedAt: string;
}

export function formatPortfolioDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}
