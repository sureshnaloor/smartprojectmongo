import { Paperclip, Smile, AtSign, Mic, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChatInput } from "@/components/collab/chat-input";
import type { CollabMention } from "@/types";

interface MessageComposerProps {
  disabled?: boolean;
  isSubmitting?: boolean;
  onSend: (content: string, mentions: CollabMention[]) => void;
  typingHint?: string | null;
}

export function MessageComposer({ disabled, isSubmitting, onSend, typingHint }: MessageComposerProps) {
  return (
    <div className="shrink-0 border-t border-[var(--border-subtle)] bg-[var(--bg-white)] px-6 py-4">
      {typingHint && (
        <p className="mb-2 flex items-center gap-1 kanban-caption text-[var(--text-secondary)]">
          {typingHint}
          <span className="inline-flex gap-0.5 ml-1">
            <span className="collab-typing-dot inline-block h-1 w-1 rounded-full bg-[var(--copper-500)]" />
            <span className="collab-typing-dot inline-block h-1 w-1 rounded-full bg-[var(--copper-500)]" />
            <span className="collab-typing-dot inline-block h-1 w-1 rounded-full bg-[var(--copper-500)]" />
          </span>
        </p>
      )}
      <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-white)] shadow-[var(--shadow-sm)]">
        <div className="border-b border-[var(--border-subtle)] px-3 py-2">
          <ChatInput
            disabled={disabled}
            isSubmitting={isSubmitting}
            placeholder="Type a message..."
            onSend={onSend}
          />
        </div>
        <div className="flex items-center justify-between px-3 py-2">
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" disabled={disabled} title="Attach file">
              <Paperclip className="h-4 w-4 text-[var(--text-muted)]" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" disabled={disabled} title="Emoji">
              <Smile className="h-4 w-4 text-[var(--text-muted)]" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" disabled={disabled} title="Mention">
              <AtSign className="h-4 w-4 text-[var(--text-muted)]" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" disabled={disabled} title="Voice message">
              <Mic className="h-4 w-4 text-[var(--text-muted)]" />
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <span className="kanban-caption text-[var(--text-muted)]">Press Enter to send</span>
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin text-[var(--copper-500)]" />}
          </div>
        </div>
      </div>
    </div>
  );
}
