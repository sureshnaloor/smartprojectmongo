import { Link, useLocation } from "wouter";
import { GLOBAL_MASTER_TABS } from "./constants";

export function GlobalMastersHubHeader() {
  return (
    <header className="mb-6">
      <nav className="text-xs text-[var(--text-secondary)]">
        <Link href="/global-masters/company" className="hover:text-[var(--copper-500)]">
          Global Masters
        </Link>
        <span className="mx-2">/</span>
        <span>Resource hub</span>
      </nav>
      <h1 className="cp-display-lg text-[var(--text-primary)] mt-1">Global resources hub</h1>
      <p className="text-sm text-[var(--text-secondary)] mt-1">
        Manage your organization&apos;s master data — resources, people, vendors, and activities.
      </p>
    </header>
  );
}

export function GlobalMasterTypeTabs() {
  const [location] = useLocation();

  return (
    <nav className="cp-tab-underline flex gap-0 overflow-x-auto mb-6 border-b border-[var(--border-subtle)] scrollbar-thin">
      {GLOBAL_MASTER_TABS.map(({ key, label, href, Icon }) => {
        const active = location === href || location.startsWith(`${href}/`);
        return (
          <Link
            key={key}
            href={href}
            className={`cp-tab-underline-item flex items-center gap-2 px-5 py-3 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors ${
              active
                ? "border-[var(--copper-500)] text-[var(--text-primary)]"
                : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            <Icon
              className={`h-[18px] w-[18px] ${active ? "text-[var(--copper-500)]" : "text-[var(--text-muted)]"}`}
            />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
