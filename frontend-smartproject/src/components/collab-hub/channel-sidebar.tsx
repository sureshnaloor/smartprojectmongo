import { useQuery } from "@tanstack/react-query";
import { Building2, ChevronDown, Plus, Settings, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { initials, formatChatTime } from "@/lib/collab-config";
import type { Thread } from "@/types";
import { COLLAB_CHANNELS, type CollabChannelHash } from "./constants";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ChannelSidebarProps {
  projectId: string;
  projectName?: string;
  activeChannel: CollabChannelHash;
  onChannelChange: (hash: CollabChannelHash) => void;
  threads: Thread[];
  selectedThreadId: number | null;
  onSelectThread: (id: number) => void;
  onNewChat: () => void;
  loading?: boolean;
  userName?: string;
}

export function ChannelSidebar({
  projectId,
  projectName,
  activeChannel,
  onChannelChange,
  threads,
  selectedThreadId,
  onSelectThread,
  onNewChat,
  loading,
  userName,
}: ChannelSidebarProps) {
  const { data: projects = [] } = useQuery<{ id: number; name: string }[]>({
    queryKey: ["/api/projects"],
  });

  const issueCount = threads.filter((t) => (t.category || t.type) === "issue" && !t.isClosed).length;
  const safetyUnread = threads.some((t) => (t.category || t.type) === "safety" && (t.unreadMentionCount ?? 0) > 0);

  return (
    <aside className="flex h-full w-[280px] shrink-0 flex-col border-l border-stone-200 bg-stone-100 shadow-[-4px_0_16px_rgba(0,0,0,0.04)]">
      <div className="border-b border-stone-200 p-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex w-full items-center gap-2 rounded-md border border-stone-200 bg-white px-3.5 py-2.5 text-left transition-colors hover:bg-stone-50"
            >
              <Building2 className="h-4 w-4 shrink-0 text-[var(--copper-500)]" />
              <span className="kanban-body-md flex-1 truncate font-medium text-stone-800">
                {projectName ?? `Project ${projectId}`}
              </span>
              <ChevronDown className="h-4 w-4 shrink-0 text-stone-400" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            {projects.length > 0 ? (
              projects.map((p) => (
                <DropdownMenuItem key={p.id} asChild>
                  <a href={`/projects/${p.id}/collab`}>{p.name}</a>
                </DropdownMenuItem>
              ))
            ) : (
              <DropdownMenuItem disabled>{projectName ?? "Current project"}</DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto py-3">
        <p className="kanban-caption px-5 pb-2 font-semibold uppercase tracking-wider text-stone-500">
          Channels
        </p>
        <nav className="space-y-0.5 px-3">
          {COLLAB_CHANNELS.map((ch) => {
            const Icon = ch.icon;
            const isActive = activeChannel === ch.hash;
            const badge =
              ch.hash === "issues" && issueCount > 0
                ? issueCount
                : ch.hash === "safety" && safetyUnread
                  ? "!"
                  : null;
            return (
              <button
                key={ch.hash}
                type="button"
                onClick={() => onChannelChange(ch.hash)}
                className={cn(
                  "flex h-9 w-full items-center gap-2.5 rounded-md px-3 kanban-body-sm transition-colors",
                  isActive
                    ? "bg-[var(--copper-50)] font-medium text-[var(--copper-600)]"
                    : "text-stone-600 hover:bg-stone-200/60 hover:text-stone-800"
                )}
              >
                <span className="relative">
                  <Icon className={cn("h-4 w-4", isActive ? "text-[var(--copper-500)]" : "text-stone-400")} />
                  {ch.hash === "safety" && safetyUnread && (
                    <span className="collab-unread-dot absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-[var(--status-danger)]" />
                  )}
                </span>
                <span className="flex-1 text-left">{ch.label}</span>
                {badge != null && (
                  <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[var(--status-danger)] px-1 kanban-caption font-semibold text-white">
                    {badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="mt-4 px-3">
          <div className="mb-2 flex items-center justify-between px-2">
            <p className="kanban-caption font-semibold uppercase tracking-wider text-stone-500">Conversations</p>
            <button
              type="button"
              onClick={onNewChat}
              className="rounded p-1 hover:bg-stone-200/60"
              title="New chat"
            >
              <Plus className="h-3.5 w-3.5 text-stone-500" />
            </button>
          </div>
          {loading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-stone-400" />
            </div>
          ) : threads.length === 0 ? (
            <p className="px-2 py-3 kanban-caption text-stone-500">No chats in this channel</p>
          ) : (
            <ul className="space-y-0.5">
              {threads.map((t) => {
                const unread = t.unreadMentionCount ?? 0;
                const isSelected = selectedThreadId === t.id;
                return (
                  <li key={t.id}>
                    <button
                      type="button"
                      onClick={() => onSelectThread(t.id)}
                      className={cn(
                        "flex w-full items-start gap-2.5 rounded-md px-2 py-2 text-left transition-colors",
                        isSelected ? "bg-white shadow-sm ring-1 ring-stone-200" : "hover:bg-stone-200/50"
                      )}
                    >
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-stone-200 kanban-caption font-semibold text-[var(--copper-600)]">
                        {initials(t.title)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <span className={cn("truncate kanban-body-sm", unread > 0 ? "font-semibold text-stone-900" : "text-stone-700")}>
                            {t.title}
                          </span>
                          <span className="shrink-0 kanban-caption text-stone-400">{formatChatTime(t.lastMessageAt)}</span>
                        </div>
                        <p className="truncate kanban-caption text-stone-500">{t.lastMessagePreview || t.subject}</p>
                      </div>
                      {unread > 0 && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[var(--copper-500)]" />}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="mt-6 px-3">
          <p className="kanban-caption px-2 pb-2 font-semibold uppercase tracking-wider text-stone-500">
            Direct Messages
          </p>
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded-md px-2 py-2 kanban-body-sm text-stone-600 hover:bg-stone-200/50"
          >
            <Plus className="h-4 w-4" />
            Start a conversation
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2.5 border-t border-stone-200 bg-stone-100 p-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-stone-200 kanban-caption font-semibold text-[var(--copper-600)]">
          {initials(userName ?? "User")}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate kanban-body-sm font-medium text-stone-800">{userName ?? "User"}</p>
          <p className="kanban-caption text-[var(--status-success)]">Online</p>
        </div>
        <button type="button" className="rounded p-1.5 hover:bg-stone-200/60">
          <Settings className="h-4 w-4 text-stone-500" />
        </button>
      </div>
    </aside>
  );
}
