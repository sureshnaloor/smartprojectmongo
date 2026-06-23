import { Pin, LayoutDashboard, Info, FileText, ClipboardList, PartyPopper, Award, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { GLOBAL_COLLAB_CATEGORIES } from "@/lib/global-collab-config";

const ICONS: Record<string, typeof Info> = {
  information: Info,
  policies: FileText,
  procedures: ClipboardList,
  events: PartyPopper,
  awards: Award,
  others: MessageCircle,
};

interface GlobalCollabTabsProps {
  activeHash: string;
  onTabChange: (hash: string) => void;
}

export function GlobalCollabTabs({ activeHash, onTabChange }: GlobalCollabTabsProps) {
  const active = activeHash || "all";

  const tabs = [
    { hash: "all", label: "All Chats", Icon: LayoutDashboard },
    { hash: "pinned", label: "Pinned", Icon: Pin },
    ...GLOBAL_COLLAB_CATEGORIES.map((c) => ({
      hash: c.hash,
      label: c.label,
      Icon: ICONS[c.hash] ?? MessageCircle,
    })),
  ];

  return (
    <div className="mb-4 w-full border-b border-[var(--border-subtle)] bg-[var(--bg-white)] -mx-4 px-4 md:-mx-6 md:px-6">
      <nav className="cp-tabs-underline flex flex-wrap gap-x-1 gap-y-1 overflow-x-auto py-1">
        {tabs.map((tab) => {
          const Icon = tab.Icon;
          const isActive = active === tab.hash;
          return (
            <button
              key={tab.hash}
              type="button"
              onClick={() => onTabChange(tab.hash)}
              className={cn(
                "cp-tab-underline inline-flex shrink-0 items-center gap-1.5 !px-3 !py-2.5",
                isActive && "cp-tab-underline--active"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
