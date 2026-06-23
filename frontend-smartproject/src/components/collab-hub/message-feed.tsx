import { useMemo } from "react";
import { MessageSquare, MoreHorizontal, Reply, Smile } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { initials, formatMessageTimestamp } from "@/lib/collab-config";
import { renderMessageContent } from "@/components/collab/chat-input";
import type { Message, Thread } from "@/types";
import { formatDateDivider } from "./constants";

interface MessageFeedProps {
  thread: Thread | null;
  messages: Message[];
  currentUserId: string | null;
  loading?: boolean;
}

export function MessageFeed({ thread, messages, currentUserId, loading }: MessageFeedProps) {
  const grouped = useMemo(() => {
    const items: { type: "divider"; label: string } | { type: "message"; message: Message; showAvatar: boolean }[] = [];
    let lastDay = "";
    let lastAuthor = "";

    for (const msg of messages) {
      const dayKey = new Date(msg.createdAt).toDateString();
      if (dayKey !== lastDay) {
        items.push({ type: "divider", label: formatDateDivider(msg.createdAt) });
        lastDay = dayKey;
        lastAuthor = "";
      }
      const showAvatar = msg.authorId !== lastAuthor;
      items.push({ type: "message", message: msg, showAvatar });
      lastAuthor = msg.authorId;
    }
    return items;
  }, [messages]);

  if (!thread) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 bg-[var(--bg-cream)] px-6 py-12 text-center collab-feed-fade">
        <MessageSquare className="h-16 w-16 text-[var(--text-muted)] opacity-20" />
        <h3 className="kanban-heading-md text-[var(--text-primary)]">Welcome to Collaboration Hub</h3>
        <p className="max-w-sm kanban-body-sm text-[var(--text-secondary)]">
          Pick a channel and conversation from the sidebar, or start a new chat to get things going.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center bg-[var(--bg-cream)]">
        <p className="kanban-body-sm text-[var(--text-muted)]">Loading messages…</p>
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 bg-[var(--bg-cream)] px-6 py-12 text-center collab-feed-fade">
        <MessageSquare className="h-16 w-16 text-[var(--text-muted)] opacity-20" />
        <h3 className="kanban-heading-md text-[var(--text-primary)]">Welcome to #{thread.subject}</h3>
        <p className="max-w-sm kanban-body-sm text-[var(--text-secondary)]">
          This is the start of the conversation. Send a message to get things going.
        </p>
        <p className="kanban-caption text-[var(--text-muted)]">
          Set a topic and priority to help members understand the channel purpose.
        </p>
      </div>
    );
  }

  return (
    <div className="collab-feed-fade min-h-0 flex-1 overflow-y-auto bg-[var(--bg-cream)] px-6 py-6">
      {grouped.map((item, idx) => {
        if (item.type === "divider") {
          return (
            <div key={`d-${idx}`} className="relative my-6 flex items-center">
              <div className="flex-1 border-t border-[var(--border-subtle)]" />
              <span
                className="mx-3 kanban-caption text-[var(--text-muted)] px-3"
                style={{ backgroundColor: "var(--bg-cream)" }}
              >
                {item.label}
              </span>
              <div className="flex-1 border-t border-[var(--border-subtle)]" />
            </div>
          );
        }

        const { message, showAvatar } = item;
        const isOwn = currentUserId != null && message.authorId === currentUserId;
        const mentionedMe =
          currentUserId != null &&
          (message.mentions || []).some((m) => String(m.userId) === currentUserId);

        return (
          <div
            key={message.id}
            className={cn(
              "group collab-msg-enter flex gap-3 py-2",
              !showAvatar && "pl-[48px]"
            )}
            style={{ animationDelay: `${Math.min(idx * 30, 200)}ms` }}
          >
            {showAvatar && (
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full kanban-caption font-semibold"
                style={{ backgroundColor: "var(--bg-warm-gray)", color: "var(--copper-600)" }}
              >
                {initials(message.authorName)}
              </div>
            )}
            <div className="min-w-0 flex-1 max-w-[720px]">
              {showAvatar && (
                <div className="mb-1 flex items-baseline gap-2">
                  <span className="kanban-body-sm font-semibold text-[var(--text-primary)]">
                    {message.authorName}
                  </span>
                  <span className="kanban-caption text-[var(--text-muted)]">
                    {formatMessageTimestamp(message.createdAt)}
                  </span>
                </div>
              )}
              <div
                className={cn(
                  "relative rounded-lg px-3 py-2 kanban-body-md leading-relaxed",
                  isOwn
                    ? "ml-auto bg-[var(--copper-50)] text-[var(--text-primary)]"
                    : "bg-[var(--bg-white)] text-[var(--text-primary)] shadow-[var(--shadow-sm)]",
                  mentionedMe && "ring-2 ring-[var(--copper-400)]"
                )}
                style={isOwn ? { maxWidth: "85%", marginLeft: "auto" } : undefined}
              >
                <p className="whitespace-pre-wrap break-words">{renderMessageContent(message.content)}</p>
              </div>
            </div>
            <div className="flex shrink-0 items-start gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <Smile className="h-3.5 w-3.5 text-[var(--text-muted)]" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <Reply className="h-3.5 w-3.5 text-[var(--text-muted)]" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <MoreHorizontal className="h-3.5 w-3.5 text-[var(--text-muted)]" />
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
