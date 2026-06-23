import { useLocation, Link } from "wouter";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

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
    <div className="cp-inline-page-header">
      <div className="cp-inline-page-header__body">
        <h1 className="cp-display-md">{hubTitle}</h1>
      </div>

      <div className="cp-inline-page-header__tabs">
        <nav className="cp-tabs-underline flex flex-wrap gap-x-1 overflow-x-auto py-1">
          {tabs.map((tab) => {
            const active = location === tab.href;
            const Icon = tab.Icon;
            return (
              <Link key={tab.href} href={tab.href}>
                <a
                  className={cn(
                    "cp-tab-underline inline-flex shrink-0 items-center gap-1.5 !py-2.5 !px-3",
                    active && "cp-tab-underline--active"
                  )}
                  title={tab.label}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="hidden text-left leading-tight sm:inline">{tab.label}</span>
                </a>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
