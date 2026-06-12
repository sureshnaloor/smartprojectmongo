import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Send, Loader2, AtSign } from "lucide-react";
import { MentionableUser, CollabMention } from "@/types";
import { cn } from "@/lib/utils";

interface ChatInputProps {
  disabled?: boolean;
  isSubmitting?: boolean;
  placeholder?: string;
  onSend: (content: string, mentions: CollabMention[]) => void;
}

export function ChatInput({ disabled, isSubmitting, placeholder, onSend }: ChatInputProps) {
  const [text, setText] = useState("");
  const [users, setUsers] = useState<MentionableUser[]>([]);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionStart, setMentionStart] = useState<number | null>(null);
  const [selectedMentions, setSelectedMentions] = useState<CollabMention[]>([]);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    fetch("/api/collaboration/mentionable-users")
      .then((r) => (r.ok ? r.json() : []))
      .then(setUsers)
      .catch(() => setUsers([]));
  }, []);

  const filteredUsers =
    mentionQuery != null
      ? users.filter(
          (u) =>
            u.name.toLowerCase().includes(mentionQuery.toLowerCase()) ||
            u.email.toLowerCase().includes(mentionQuery.toLowerCase())
        )
      : [];

  const handleChange = (value: string) => {
    setText(value);
    const el = inputRef.current;
    if (!el) return;
    const pos = el.selectionStart ?? value.length;
    const before = value.slice(0, pos);
    const atMatch = before.match(/@([\w\s.]*)$/);
    if (atMatch) {
      setMentionQuery(atMatch[1]);
      setMentionStart(pos - atMatch[0].length);
    } else {
      setMentionQuery(null);
      setMentionStart(null);
    }
  };

  const insertMention = (user: MentionableUser) => {
    if (mentionStart == null || inputRef.current == null) return;
    const pos = inputRef.current.selectionStart ?? text.length;
    const before = text.slice(0, mentionStart);
    const after = text.slice(pos);
    const token = `@${user.name} `;
    const next = before + token + after;
    setText(next);
    setMentionQuery(null);
    setMentionStart(null);
    setSelectedMentions((prev) => {
      if (prev.some((m) => m.userId === user.id)) return prev;
      return [...prev, { userId: user.id, userName: user.name }];
    });
    setTimeout(() => {
      inputRef.current?.focus();
      const cursor = before.length + token.length;
      inputRef.current?.setSelectionRange(cursor, cursor);
    }, 0);
  };

  const syncMentionsFromText = (content: string): CollabMention[] => {
    const found: CollabMention[] = [];
    for (const u of users) {
      if (content.includes(`@${u.name}`)) {
        found.push({ userId: u.id, userName: u.name });
      }
    }
    for (const m of selectedMentions) {
      if (!found.some((f) => f.userId === m.userId)) found.push(m);
    }
    return found;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    const mentions = syncMentionsFromText(trimmed);
    onSend(trimmed, mentions);
    setText("");
    setSelectedMentions([]);
    setMentionQuery(null);
  };

  return (
    <form onSubmit={handleSubmit} className="relative">
      {mentionQuery != null && filteredUsers.length > 0 && (
        <div className="absolute bottom-full left-0 right-0 mb-1 bg-white border rounded-lg shadow-lg max-h-40 overflow-y-auto z-20">
          {filteredUsers.slice(0, 6).map((u) => (
            <button
              key={u.id}
              type="button"
              className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm flex items-center gap-2"
              onMouseDown={(e) => {
                e.preventDefault();
                insertMention(u);
              }}
            >
              <AtSign className="h-3 w-3 text-teal-600" />
              <span className="font-medium">{u.name}</span>
              <span className="text-gray-400 text-xs truncate">{u.email}</span>
            </button>
          ))}
        </div>
      )}
      <div className="flex items-end gap-2 bg-[#f0f2f5] rounded-2xl px-3 py-2">
        <textarea
          ref={inputRef}
          value={text}
          onChange={(e) => handleChange(e.target.value)}
          disabled={disabled || isSubmitting}
          placeholder={placeholder || "Type a message… use @ to mention"}
          rows={1}
          className={cn(
            "flex-1 resize-none bg-transparent border-0 outline-none text-sm py-2 max-h-32",
            disabled && "opacity-50 cursor-not-allowed"
          )}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSubmit(e);
            }
          }}
        />
        <Button
          type="submit"
          size="icon"
          disabled={disabled || isSubmitting || !text.trim()}
          className="rounded-full bg-teal-600 hover:bg-teal-700 h-10 w-10 shrink-0"
        >
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
    </form>
  );
}

export function renderMessageContent(content: string): React.ReactNode {
  const parts = content.split(/(@[\w][\w\s.]*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("@")) {
      return (
        <span key={i} className="text-sky-700 font-semibold bg-sky-50 px-0.5 rounded">
          {part}
        </span>
      );
    }
    return <span key={i}>{part}</span>;
  });
}
