import {
  Info,
  FileText,
  ClipboardList,
  PartyPopper,
  Award,
  MessageCircle,
  type LucideIcon,
} from "lucide-react";

/** Company-wide collaboration categories (global /collab only). */
export type GlobalCollabCategory =
  | "information"
  | "company_policies"
  | "company_procedures"
  | "events"
  | "awards"
  | "others";

export const GLOBAL_COLLAB_CATEGORIES: {
  key: GlobalCollabCategory;
  label: string;
  hash: string;
}[] = [
  { key: "information", label: "Information", hash: "information" },
  { key: "company_policies", label: "Company Policies", hash: "policies" },
  { key: "company_procedures", label: "Company Procedures", hash: "procedures" },
  { key: "events", label: "Events & Celebrations", hash: "events" },
  { key: "awards", label: "Awards & Recognitions", hash: "awards" },
  { key: "others", label: "Others", hash: "others" },
];

export const globalCategoryConfig: Record<
  GlobalCollabCategory,
  { label: string; icon: LucideIcon; color: string; bg: string }
> = {
  information: { label: "Information", icon: Info, color: "text-blue-700", bg: "bg-blue-50" },
  company_policies: {
    label: "Company Policies",
    icon: FileText,
    color: "text-slate-700",
    bg: "bg-slate-100",
  },
  company_procedures: {
    label: "Company Procedures",
    icon: ClipboardList,
    color: "text-indigo-700",
    bg: "bg-indigo-50",
  },
  events: {
    label: "Events & Celebrations",
    icon: PartyPopper,
    color: "text-purple-700",
    bg: "bg-purple-50",
  },
  awards: {
    label: "Awards & Recognitions",
    icon: Award,
    color: "text-green-700",
    bg: "bg-green-50",
  },
  others: {
    label: "Others",
    icon: MessageCircle,
    color: "text-teal-700",
    bg: "bg-teal-50",
  },
};

/** Map hash fragment → category filter key */
export const GLOBAL_COLLAB_HASH_TO_CATEGORY: Record<string, GlobalCollabCategory | "all" | "pinned"> = {
  all: "all",
  pinned: "pinned",
  information: "information",
  policies: "company_policies",
  procedures: "company_procedures",
  events: "events",
  awards: "awards",
  others: "others",
};

export function globalCategoryFromSubject(subject: string): GlobalCollabCategory {
  const match = GLOBAL_COLLAB_CATEGORIES.find((c) => c.label === subject);
  return match?.key ?? "others";
}

export function isGlobalCollabCategory(cat: string): cat is GlobalCollabCategory {
  return cat in globalCategoryConfig;
}
