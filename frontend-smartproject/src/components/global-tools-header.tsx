import { useLocation, Link } from "wouter";
import type { LucideIcon } from "lucide-react";

export interface GlobalToolsTab {
  label: string;
  href: string;
  Icon: LucideIcon;
}

interface GlobalToolsHeaderProps {
  hubTitle: string;
  tabs: GlobalToolsTab[];
}

export function GlobalToolsHeader({ hubTitle, tabs }: GlobalToolsHeaderProps) {
  const [location] = useLocation();

  return (
    <div className="bg-zinc-100 border-b border-zinc-200 shadow-sm w-full min-w-0 flex-shrink-0">
      {/* Simple hub bar (no project details) */}
      <div className="px-4 py-4 sm:px-6 lg:px-8">
        <h1 className="text-lg font-extrabold tracking-tight text-zinc-900">
          {hubTitle}
        </h1>
      </div>

      {/* Tabs: same look as project nav – light strip, icon + text, active underline */}
      <div className="w-full min-w-0 px-4 sm:px-6 lg:px-8 border-t border-zinc-200 bg-zinc-50/50">
        <nav className="-mb-px flex flex-wrap gap-x-2 gap-y-1 py-2">
          {tabs.map((tab) => {
            const active = location === tab.href;
            const Icon = tab.Icon;
            return (
              <Link key={tab.href} href={tab.href}>
                <a
                  className={`shrink-0 border-b-2 py-2 px-1.5 text-[10px] sm:text-xs font-bold transition-all flex items-center gap-1 sm:gap-1.5 min-w-0 ${
                    active
                      ? "border-zinc-900 text-zinc-900"
                      : "border-transparent text-zinc-500 hover:border-zinc-300 hover:text-zinc-700"
                  }`}
                  title={tab.label}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="hidden sm:inline text-left leading-tight max-w-[4.5rem] sm:max-w-[5rem] break-words">
                    {tab.label}
                  </span>
                </a>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
