import {
  FilePlus,
  Users,
  DollarSign,
  Calendar,
  Package,
  Settings,
  type LucideIcon,
} from "lucide-react";

export type DashboardTabKey = "home" | "activities" | "register" | "cost" | "schedule" | "progress";

export const DASHBOARD_TABS: { key: DashboardTabKey; label: string; href: (projectId: string) => string }[] = [
  { key: "home", label: "Home", href: (id) => `/newproject/${id}` },
  { key: "activities", label: "Activities", href: (id) => `/projects/${id}` },
  { key: "register", label: "WP & Activities", href: (id) => `/projects/${id}#register` },
  { key: "cost", label: "Cost", href: (id) => `/projects/${id}/costs` },
  { key: "schedule", label: "Schedule", href: (id) => `/projects/${id}/schedule` },
  { key: "progress", label: "Progress", href: (id) => `/projects/${id}/project-daily-progress` },
];

export interface QuickActionItem {
  icon: LucideIcon;
  label: string;
  action: "import-wbs" | "team" | "budget" | "schedule" | "add-wp" | "settings";
}

export const QUICK_ACTIONS: QuickActionItem[] = [
  { icon: FilePlus, label: "Import WBS", action: "import-wbs" },
  { icon: Users, label: "Manage Team", action: "team" },
  { icon: DollarSign, label: "Update Budget", action: "budget" },
  { icon: Calendar, label: "Edit Schedule", action: "schedule" },
  { icon: Package, label: "Add Work Package", action: "add-wp" },
  { icon: Settings, label: "Project Settings", action: "settings" },
];

export const RECENT_ACTIVITIES = [
  { type: "wbs" as const, text: "Work package 'Procurement & Construction' created", time: "2 hours ago" },
  { type: "member" as const, text: "Suresh Naloor updated project budget", time: "5 hours ago" },
  { type: "wbs" as const, text: "Engineering & Design WBS approved", time: "1 day ago" },
  { type: "budget" as const, text: "3 new materials added to project", time: "2 days ago" },
];
