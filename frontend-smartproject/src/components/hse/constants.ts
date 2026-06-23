import {
  AlertTriangle,
  BookOpen,
  Leaf,
  MessageCircleWarning,
  MoreHorizontal,
  ShieldAlert,
} from "lucide-react";

export const HSE_TABS = [
  { id: "risk", label: "Risk Register", Icon: AlertTriangle, badgeKey: "risks" as const },
  { id: "lesson", label: "Lesson Learnt", Icon: BookOpen, badgeKey: null },
  { id: "safety", label: "Safety Incidents", Icon: ShieldAlert, badgeKey: "openSafety" as const },
  { id: "toolbox", label: "Safety Toolbox Talk", Icon: MessageCircleWarning, badgeKey: null },
  { id: "environmental", label: "Environmental Incidents", Icon: Leaf, badgeKey: null },
  { id: "others", label: "Others", Icon: MoreHorizontal, badgeKey: null },
] as const;

export type HseTabId = (typeof HSE_TABS)[number]["id"];

export type ApiProbability = "High" | "Moderate" | "Low";
export type ApiImpact = "High" | "Moderate" | "Low";
export type ApiRiskType = "Risk" | "Opportunity";
export type ApiStatus = "Open" | "In Progress" | "Closed";

export const PROBABILITY_FILTER_OPTIONS = [
  { value: "all", label: "All Probabilities" },
  { value: "Low", label: "Low" },
  { value: "Moderate", label: "Medium" },
  { value: "High", label: "High" },
] as const;

export const IMPACT_FILTER_OPTIONS = [
  { value: "all", label: "All Impacts" },
  { value: "Low", label: "Low" },
  { value: "Moderate", label: "Medium" },
  { value: "High", label: "Critical" },
] as const;

export const STATUS_FILTER_OPTIONS = [
  { value: "all", label: "All Statuses" },
  { value: "Open", label: "Open" },
  { value: "In Progress", label: "Mitigated" },
  { value: "Closed", label: "Closed" },
] as const;

export const TYPE_FILTER_OPTIONS = [
  { value: "all", label: "All Types" },
  { value: "Risk", label: "Risk" },
  { value: "Opportunity", label: "Opportunity" },
] as const;

export const FIVE_LEVELS = [
  { level: 1, label: "Very Low", api: "Low" as ApiProbability },
  { level: 2, label: "Low", api: "Low" as ApiProbability },
  { level: 3, label: "Medium", api: "Moderate" as ApiProbability },
  { level: 4, label: "High", api: "High" as ApiProbability },
  { level: 5, label: "Very High", api: "High" as ApiProbability },
] as const;

export function levelFromApi(value: string): number {
  if (value === "Low") return 2;
  if (value === "Moderate") return 3;
  if (value === "High") return 5;
  return 1;
}

export function apiFromLevel(level: number): ApiProbability {
  if (level <= 2) return "Low";
  if (level === 3) return "Moderate";
  return "High";
}

export function riskScore(probability: string, impact: string): number {
  return levelFromApi(probability) * levelFromApi(impact);
}

export function scoreBadgeStyle(score: number): { backgroundColor: string; color: string } {
  if (score <= 4) return { backgroundColor: "var(--status-success)", color: "#fff" };
  if (score <= 9) return { backgroundColor: "var(--status-warning)", color: "#fff" };
  if (score <= 16) return { backgroundColor: "var(--status-danger)", color: "#fff" };
  return { backgroundColor: "#7F1D1D", color: "#fff" };
}

export function dotColorForLevel(level: number): string {
  if (level <= 2) return "var(--status-success)";
  if (level === 3) return "var(--status-warning)";
  return "var(--status-danger)";
}

export function statusDisplay(status: string): string {
  if (status === "In Progress") return "Mitigated";
  return status;
}

export function statusBadgeClass(status: string): string {
  switch (status) {
    case "Open":
      return "bg-orange-100 text-orange-800";
    case "In Progress":
      return "bg-blue-100 text-blue-800";
    case "Closed":
      return "bg-green-100 text-green-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
}

export function typeBadgeClass(type: string): string {
  if (type === "Opportunity") return "bg-green-100 text-green-800";
  return "bg-orange-100 text-orange-800";
}
