import type { ReactNode } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";

const triggerBase =
  "cp-topnav-link inline-flex items-center gap-0.5 rounded-md px-2 py-1.5 cp-focus-ring hover:bg-[var(--navy-800)]";

const GLOBAL_TOOLS: { label: string; href: string }[] = [
  { label: "Collaboration Hub", href: "/collab" },
  { label: "Activity Master", href: "/activity-master" },
  { label: "Task Master", href: "/task-master" },
  { label: "Resource Master", href: "/resource-master" },
  { label: "Material Master", href: "/material-master" },
  { label: "Service Master", href: "/service-master" },
  { label: "Vendor Master", href: "/vendor-master" },
  { label: "Employee Master", href: "/employee-master" },
  { label: "Equipment Master", href: "/equipment-master" },
  { label: "Tool Master", href: "/tool-master" },
];

const GLOBAL_MASTERS: { label: string; href: string }[] = [
  { label: "Regional & currency defaults", href: "/global-masters/defaults" },
  { label: "Default work calendar", href: "/global-masters/calendar" },
];

const ALLOCATION: { label: string; href: string }[] = [
  { label: "Materials", href: "/allocation/materials" },
  { label: "Manpower", href: "/allocation/manpower" },
  { label: "Equipment", href: "/allocation/equipment" },
  { label: "Rental Manpower", href: "/allocation/rental-manpower" },
  { label: "Rental Equipment", href: "/allocation/rental-equipment" },
  { label: "Tools", href: "/allocation/tools" },
  { label: "Timesheets", href: "/timesheets" },
];

function NewTabLink({
  href,
  children,
  className,
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
      {children}
    </a>
  );
}

export function AppWorkbenchNav({ className }: { className?: string }) {
  return (
    <nav
      className={cn(
        "flex flex-wrap items-center gap-0.5 sm:gap-1 max-w-[min(100%,52rem)]",
        className
      )}
      aria-label="Workbench"
    >
      <DropdownMenu>
        <DropdownMenuTrigger className={triggerBase}>
          Global tools
          <ChevronDown className="h-3 w-3 opacity-70" aria-hidden />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="max-h-[min(70vh,24rem)] overflow-y-auto">
          {GLOBAL_TOOLS.map(({ label, href }) => (
            <DropdownMenuItem key={href} asChild>
              <NewTabLink href={href} className="cursor-pointer">
                {label}
              </NewTabLink>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger className={triggerBase}>
          Global masters
          <ChevronDown className="h-3 w-3 opacity-70" aria-hidden />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {GLOBAL_MASTERS.map(({ label, href }) => (
            <DropdownMenuItem key={href} asChild>
              <NewTabLink href={href} className="cursor-pointer">
                {label}
              </NewTabLink>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger className={triggerBase}>
          Allocation
          <ChevronDown className="h-3 w-3 opacity-70" aria-hidden />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {ALLOCATION.map(({ label, href }) => (
            <DropdownMenuItem key={href} asChild>
              <NewTabLink href={href} className="cursor-pointer">
                {label}
              </NewTabLink>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger className={triggerBase}>
          Charts
          <ChevronDown className="h-3 w-3 opacity-70" aria-hidden />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="min-w-[10rem]">
          <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
            No items yet
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem disabled className="text-xs text-muted-foreground">
            Coming soon
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger className={triggerBase}>
          Analytics
          <ChevronDown className="h-3 w-3 opacity-70" aria-hidden />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="min-w-[10rem]">
          <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
            No items yet
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem disabled className="text-xs text-muted-foreground">
            Coming soon
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </nav>
  );
}

const mobileSectionTitle = "text-[10px] font-extrabold uppercase tracking-widest text-slate-400 px-2 pt-3 pb-1";

export function AppWorkbenchNavMobile() {
  return (
    <div className="border-t border-slate-700 pt-2 mt-2 space-y-1">
      <p className={mobileSectionTitle}>Global tools</p>
      <div className="flex flex-col gap-0.5">
        {GLOBAL_TOOLS.map(({ label, href }) => (
          <NewTabLink
            key={href}
            href={href}
            className="block py-2 px-2 text-sm text-slate-200 hover:bg-slate-800 rounded-md"
          >
            {label}
          </NewTabLink>
        ))}
      </div>
      <p className={mobileSectionTitle}>Global masters</p>
      <div className="flex flex-col gap-0.5">
        {GLOBAL_MASTERS.map(({ label, href }) => (
          <NewTabLink
            key={href}
            href={href}
            className="block py-2 px-2 text-sm text-slate-200 hover:bg-slate-800 rounded-md"
          >
            {label}
          </NewTabLink>
        ))}
      </div>
      <p className={mobileSectionTitle}>Allocation</p>
      <div className="flex flex-col gap-0.5">
        {ALLOCATION.map(({ label, href }) => (
          <NewTabLink
            key={href}
            href={href}
            className="block py-2 px-2 text-sm text-slate-200 hover:bg-slate-800 rounded-md"
          >
            {label}
          </NewTabLink>
        ))}
      </div>
      <p className={mobileSectionTitle}>Charts</p>
      <p className="px-2 py-1.5 text-xs text-slate-500">Coming soon</p>
      <p className={mobileSectionTitle}>Analytics</p>
      <p className="px-2 py-1.5 text-xs text-slate-500">Coming soon</p>
    </div>
  );
}
