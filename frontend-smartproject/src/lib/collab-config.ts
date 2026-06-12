import {
  AlertTriangle,
  Award,
  ClipboardCheck,
  HardHat,
  Info,
  Laugh,
  Megaphone,
  Shield,
  FileText,
  type LucideIcon,
} from "lucide-react";

export type CollabCategory =
  | "quality"
  | "safety"
  | "evacuation"
  | "policy"
  | "casual"
  | "issue"
  | "info"
  | "announcement"
  | "awards"
  | "general";

export type CollabCriticality = "low" | "medium" | "high" | "critical";

export const SUBJECT_PRESETS = [
  "Quality & Policy",
  "Safety Regulations at Site",
  "Evacuation Plan",
  "Environmental Compliance",
  "Procurement Updates",
  "Site Logistics",
  "Work Memes & Banter",
  "General Discussion",
] as const;

export const categoryConfig: Record<
  CollabCategory,
  { label: string; icon: LucideIcon; color: string; bg: string }
> = {
  quality: { label: "Quality", icon: ClipboardCheck, color: "text-indigo-700", bg: "bg-indigo-50" },
  safety: { label: "Safety", icon: HardHat, color: "text-orange-700", bg: "bg-orange-50" },
  evacuation: { label: "Evacuation", icon: Shield, color: "text-red-700", bg: "bg-red-50" },
  policy: { label: "Policy", icon: FileText, color: "text-slate-700", bg: "bg-slate-100" },
  casual: { label: "Casual", icon: Laugh, color: "text-pink-700", bg: "bg-pink-50" },
  issue: { label: "Issue", icon: AlertTriangle, color: "text-red-700", bg: "bg-red-50" },
  info: { label: "Info", icon: Info, color: "text-blue-700", bg: "bg-blue-50" },
  announcement: { label: "Announcement", icon: Megaphone, color: "text-gray-700", bg: "bg-gray-100" },
  awards: { label: "Awards", icon: Award, color: "text-green-700", bg: "bg-green-50" },
  general: { label: "General", icon: Info, color: "text-teal-700", bg: "bg-teal-50" },
};

export const criticalityConfig: Record<
  CollabCriticality,
  { label: string; color: string; dot: string }
> = {
  low: { label: "Low", color: "text-gray-600", dot: "bg-gray-400" },
  medium: { label: "Medium", color: "text-amber-700", dot: "bg-amber-500" },
  high: { label: "High", color: "text-orange-700", dot: "bg-orange-500" },
  critical: { label: "Critical", color: "text-red-700", dot: "bg-red-600" },
};

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || "")
    .join("");
}

/** Full date + time for message bubbles (tiny meta line). */
export function formatMessageTimestamp(dateString: string): string {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "";

  const now = new Date();
  const time = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const isToday = date.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();

  if (isToday) return `Today, ${time}`;
  if (isYesterday) return `Yesterday, ${time}`;

  const sameYear = date.getFullYear() === now.getFullYear();
  const datePart = sameYear
    ? date.toLocaleDateString([], { month: "short", day: "numeric" })
    : date.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
  return `${datePart}, ${time}`;
}

export function formatChatTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "now";
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return date.toLocaleDateString([], { weekday: "short" });
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

export function formatExpiry(expiresAt: string | null | undefined): string | null {
  if (!expiresAt) return null;
  const d = new Date(expiresAt);
  if (Number.isNaN(d.getTime())) return null;
  const days = Math.ceil((d.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
  if (days < 0) return "Expired";
  if (days === 0) return "Expires today";
  if (days === 1) return "Expires tomorrow";
  if (days <= 7) return `Expires in ${days}d`;
  return `Expires ${d.toLocaleDateString()}`;
}
