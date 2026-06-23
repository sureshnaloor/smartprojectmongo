import {
  MessageSquare,
  Pin,
  ShieldCheck,
  ShieldAlert,
  AlertCircle,
  Coffee,
  Info,
  type LucideIcon,
} from "lucide-react";

export type CollabChannelHash =
  | "all"
  | "pinned"
  | "quality"
  | "safety"
  | "issues"
  | "casual"
  | "info";

export const COLLAB_CHANNELS: {
  hash: CollabChannelHash;
  label: string;
  icon: LucideIcon;
  filter?: string;
}[] = [
  { hash: "all", label: "All Chats", icon: MessageSquare },
  { hash: "pinned", label: "Pinned", icon: Pin },
  { hash: "quality", label: "Quality", icon: ShieldCheck, filter: "quality" },
  { hash: "safety", label: "Safety", icon: ShieldAlert, filter: "safety" },
  { hash: "issues", label: "Issues", icon: AlertCircle, filter: "issue" },
  { hash: "casual", label: "Casual", icon: Coffee, filter: "casual" },
  { hash: "info", label: "Info", icon: Info, filter: "info" },
];

export const HASH_TO_FILTER: Record<CollabChannelHash, string> = {
  all: "all",
  pinned: "pinned",
  quality: "quality",
  safety: "safety",
  issues: "issue",
  casual: "casual",
  info: "info",
};

export function channelFromHash(hash: string): CollabChannelHash {
  const h = hash.toLowerCase() as CollabChannelHash;
  return COLLAB_CHANNELS.some((c) => c.hash === h) ? h : "all";
}

export function formatDateDivider(dateString: string): string {
  const d = new Date(dateString);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString([], { month: "long", day: "numeric", year: "numeric" });
}

export function isSameDay(a: string, b: string): boolean {
  const da = new Date(a);
  const db = new Date(b);
  return da.toDateString() === db.toDateString();
}
