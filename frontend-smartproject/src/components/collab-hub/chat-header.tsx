import {
  Bell,
  MoreHorizontal,
  Search,
  Users,
  Pin,
  Lock,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  categoryConfig,
  criticalityConfig,
  formatExpiry,
  initials,
  type CollabCategory,
} from "@/lib/collab-config";
import type { Thread } from "@/types";
import { CollabNotifications } from "@/components/collab/collab-notifications";

interface ChatHeaderProps {
  thread: Thread | null;
  projectId: string;
  memberCount?: number;
  onSearch?: () => void;
  onMembers?: () => void;
}

export function ChatHeader({ thread, projectId, memberCount = 1, onSearch, onMembers }: ChatHeaderProps) {
  if (!thread) {
    return (
      <header className="flex h-[60px] shrink-0 items-center border-b border-[var(--border-subtle)] bg-[var(--bg-white)] px-6">
        <p className="kanban-body-md text-[var(--text-secondary)]">Select a conversation to start chatting</p>
      </header>
    );
  }

  const catKey = (thread.category || thread.type || "general") as CollabCategory;
  const catCfg = categoryConfig[catKey] || categoryConfig.general;
  const critCfg = criticalityConfig[thread.criticality || "medium"];
  const CatIcon = catCfg.icon;
  const expiry = formatExpiry(thread.expiresAt);

  return (
    <header className="flex h-[60px] shrink-0 items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--bg-white)] px-6">
      <div className="flex min-w-0 items-center gap-3">
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
          style={{ backgroundColor: "var(--copper-50)" }}
        >
          <CatIcon className="h-5 w-5" style={{ color: "var(--copper-500)" }} />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            {thread.isPinned && <Pin className="h-3.5 w-3.5 text-amber-600" />}
            <h2 className="kanban-heading-lg truncate text-[var(--text-primary)]">{thread.title}</h2>
            {thread.isClosed && <Lock className="h-3.5 w-3.5 text-[var(--text-muted)]" />}
          </div>
          <p className="truncate kanban-body-sm text-[var(--text-secondary)]">{thread.subject}</p>
          <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
            <span
              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 kanban-caption"
              style={{ backgroundColor: "var(--status-success-bg, #F0FDF4)", color: "var(--status-success)" }}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--status-success)]" />
              {catCfg.label}
            </span>
            <span
              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 kanban-caption"
              style={{ backgroundColor: "var(--bg-warm-gray)", color: "var(--text-secondary)" }}
            >
              <span className={cn("h-1.5 w-1.5 rounded-full", critCfg.dot)} />
              {critCfg.label}
            </span>
            {expiry && (
              <span className="flex items-center gap-0.5 kanban-caption text-amber-600">
                <Clock className="h-3 w-3" />
                {expiry}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        <Button variant="ghost" size="icon" className="h-9 w-9" onClick={onSearch}>
          <Search className="h-[18px] w-[18px] text-[var(--text-secondary)]" />
        </Button>
        <Button variant="ghost" size="sm" className="gap-1.5 h-9" onClick={onMembers}>
          <Users className="h-[18px] w-[18px] text-[var(--text-secondary)]" />
          <span className="kanban-caption text-[var(--text-secondary)]">{memberCount}</span>
        </Button>
        <Button variant="ghost" size="icon" className="h-9 w-9 relative">
          <Bell className="h-[18px] w-[18px] text-[var(--text-secondary)]" />
          {(thread.unreadMentionCount ?? 0) > 0 && (
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-[var(--status-danger)]" />
          )}
        </Button>
        <CollabNotifications projectId={projectId} />
        <Button variant="ghost" size="icon" className="h-9 w-9">
          <MoreHorizontal className="h-[18px] w-[18px] text-[var(--text-secondary)]" />
        </Button>
      </div>
    </header>
  );
}
