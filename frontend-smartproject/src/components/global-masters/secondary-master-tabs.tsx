import { Link, useLocation } from "wouter";
import type { LucideIcon } from "lucide-react";

export interface SecondaryTab {
  label: string;
  href: string;
  Icon?: LucideIcon;
}

export function SecondaryMasterTabs({ tabs }: { tabs: SecondaryTab[] }) {
  const [location] = useLocation();

  return (
    <nav className="flex flex-wrap gap-2 mb-5 pb-4 border-b border-[var(--border-subtle)]">
      {tabs.map(({ label, href, Icon }) => {
        const active = location === href;
        return (
          <Link
            key={href}
            href={href}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              active
                ? "bg-[var(--copper-50)] text-[var(--copper-500)] border border-[var(--copper-500)]/30"
                : "bg-[var(--bg-warm-gray)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            {Icon && <Icon className="h-3.5 w-3.5" />}
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
