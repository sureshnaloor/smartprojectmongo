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
    <div className="w-full border-b border-zinc-200 bg-zinc-50/80 -mx-4 md:-mx-6 px-4 md:px-6 mb-4">
      <nav className="-mb-px flex flex-wrap gap-x-1 gap-y-1 py-2">
        {tabs.map((tab) => {
          const Icon = tab.Icon;
          const isActive = active === tab.hash;
          return (
            <button
              key={tab.hash}
              type="button"
              onClick={() => onTabChange(tab.hash)}
              className={cn(
                "shrink-0 border-b-2 py-2 px-2 text-xs font-bold transition-all flex items-center gap-1.5",
                isActive
                  ? "border-zinc-900 text-zinc-900"
                  : "border-transparent text-zinc-500 hover:border-zinc-300 hover:text-zinc-700"
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
