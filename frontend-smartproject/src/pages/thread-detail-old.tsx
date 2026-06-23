import { useState, useEffect, useRef } from "react";
import { useRoute, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Loader2,
  Lock,
  Pin,
  Clock,
  AlertTriangle,
} from "lucide-react";
import { Thread, Message } from "@/types";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";
import {
  categoryConfig,
  criticalityConfig,
  formatMessageTimestamp,
  formatExpiry,
  initials,
  type CollabCategory,
} from "@/lib/collab-config";
import {
  globalCategoryConfig,
  isGlobalCollabCategory,
} from "@/lib/global-collab-config";
import { ChatInput, renderMessageContent } from "@/components/collab/chat-input";
import { CollabNotifications } from "@/components/collab/collab-notifications";

export default function ThreadDetail() {
  const [, projectParams] = useRoute<{ projectId: string; threadId: string }>(
    "/projects/:projectId/collab/thread/:threadId"
  );
  const [, globalParams] = useRoute<{ threadId: string }>("/collab/thread/:threadId");

  const projectId = projectParams?.projectId;
  const isGlobal = !projectId;
  const threadId = projectParams?.threadId || globalParams?.threadId;

  const [thread, setThread] = useState<Thread | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  const backUrl = projectId ? `/projects/${projectId}/collab` : "/collab";
  const currentUserId = user ? String(user.id) : null;

  useEffect(() => {
    if (!threadId) return;
    fetchThreadData();
  }, [threadId, projectId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!projectId || !threadId || !user?.id) return;
    fetch(`/api/projects/${projectId}/collaboration/threads/${threadId}/read`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user.id }),
    }).catch(() => {});
  }, [projectId, threadId, user?.id]);

  const fetchThreadData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const params = user?.id ? `?viewerUserId=${user.id}` : "";
      const messagesEndpoint = projectId
        ? `/api/projects/${projectId}/collaboration/threads/${threadId}/messages`
        : `/api/collaboration/threads/${threadId}/messages`;

      const messagesResponse = await fetch(messagesEndpoint);
      if (!messagesResponse.ok) throw new Error("Failed to fetch messages");
      setMessages(await messagesResponse.json());

      const threadsEndpoint = projectId
        ? `/api/projects/${projectId}/collaboration/threads${params}`
        : `/api/collaboration/threads${params}`;

      const threadsResponse = await fetch(threadsEndpoint);
      if (threadsResponse.ok) {
        const threadsData = await threadsResponse.json();
        const currentThread = threadsData.find((t: Thread) => t.id === parseInt(threadId!, 10));
        if (currentThread) setThread(currentThread);
      }
    } catch (err) {
      console.error(err);
      setError("Failed to load chat.");
      toast({ title: "Error", description: "Failed to load chat.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = async (content: string, mentions: { userId: number; userName: string }[]) => {
    if (thread?.isClosed) {
      toast({ title: "Chat closed", description: "Cannot add messages.", variant: "destructive" });
      return;
    }

    try {
      setIsSubmitting(true);
      const messageEndpoint = projectId
        ? `/api/projects/${projectId}/collaboration/threads/${threadId}/messages`
        : `/api/collaboration/threads/${threadId}/messages`;

      const response = await fetch(messageEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content,
          authorId: user ? String(user.id) : `user_${Date.now()}`,
          authorName: user?.name || user?.email || "Anonymous",
          mentions,
        }),
      });

      if (!response.ok) throw new Error("Failed to post message");
      const newMsg = await response.json();
      setMessages((prev) => [...prev, newMsg]);
      toast({ title: "Sent", description: mentions.length ? `Notified ${mentions.length} teammate(s)` : undefined });
    } catch (err) {
      toast({ title: "Error", description: "Failed to send message.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
      </div>
    );
  }

  if (error || !thread) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl text-center">
        <AlertTriangle className="h-10 w-10 text-red-500 mx-auto mb-3" />
        <p className="text-gray-600 mb-4">{error || "Chat not found."}</p>
        <Link href={backUrl}>
          <Button><ArrowLeft className="mr-2 h-4 w-4" />Back</Button>
        </Link>
      </div>
    );
  }

  const catKey = (thread.category || thread.type || (isGlobal ? "others" : "general")) as string;
  const catCfg = isGlobal
    ? isGlobalCollabCategory(catKey)
      ? globalCategoryConfig[catKey]
      : globalCategoryConfig.others
    : categoryConfig[catKey as CollabCategory] || categoryConfig.general;
  const critCfg = criticalityConfig[thread.criticality || "medium"];
  const expiry = formatExpiry(thread.expiresAt);
  const CatIcon = catCfg.icon;

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] max-w-2xl mx-auto">
      {/* WhatsApp-style header */}
      <div className="bg-[#f0f2f5] border-b px-4 py-3 flex items-center gap-3 shrink-0">
        <Link href={backUrl}>
          <Button variant="ghost" size="icon" className="shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div
          className={cn(
            "h-10 w-10 rounded-full flex items-center justify-center text-sm font-semibold shrink-0",
            catCfg.bg,
            catCfg.color
          )}
        >
          {initials(thread.title)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            {thread.isPinned && <Pin className="h-3 w-3 text-amber-600" />}
            <h1 className="font-semibold text-gray-900 truncate">{thread.title}</h1>
            {thread.isClosed && <Lock className="h-3.5 w-3.5 text-gray-400" />}
          </div>
          <p className="text-xs text-gray-500 truncate">{thread.subject}</p>
          <div className="flex flex-wrap gap-1.5 mt-1">
            <Badge variant="outline" className={cn("text-[10px] py-0 h-4", catCfg.bg, catCfg.color)}>
              <CatIcon className="h-2.5 w-2.5 mr-0.5" />
              {catCfg.label}
            </Badge>
            <span className={cn("text-[10px] flex items-center gap-1", critCfg.color)}>
              <span className={cn("h-1.5 w-1.5 rounded-full", critCfg.dot)} />
              {critCfg.label}
            </span>
            {expiry && (
              <span className="text-[10px] text-amber-600 flex items-center gap-0.5">
                <Clock className="h-2.5 w-2.5" />
                {expiry}
              </span>
            )}
          </div>
        </div>
        <CollabNotifications projectId={projectId} />
      </div>

      {/* Message trail — WhatsApp wallpaper + bubbles */}
      <div
        className="flex-1 overflow-y-auto px-3 py-4 space-y-2"
        style={{
          backgroundColor: "#e5ddd5",
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23d4cdc4' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
        }}
      >
        {messages.length === 0 ? (
          <div className="text-center py-12 text-gray-600 text-sm">No messages yet. Say hello!</div>
        ) : (
          messages.map((message) => {
            const isOwn = currentUserId != null && message.authorId === currentUserId;
            const mentionedMe =
              user?.id != null &&
              (message.mentions || []).some((m) => m.userId === user.id);
            const isRead =
              user?.id != null &&
              (message.readBy || []).some((r) => r.userId === user.id);

            return (
              <div
                key={message.id}
                className={cn("flex", isOwn ? "justify-end" : "justify-start")}
              >
                <div
                  className={cn(
                    "relative max-w-[82%] rounded-lg px-3 py-2 shadow-sm text-sm",
                    isOwn
                      ? "bg-[#d9fdd3] rounded-tr-none"
                      : "bg-white rounded-tl-none",
                    mentionedMe && !isRead && "ring-2 ring-sky-400"
                  )}
                >
                  <div className="flex items-baseline justify-between gap-2 mb-1">
                    <span
                      className={cn(
                        "text-[10px] font-semibold truncate",
                        isOwn ? "text-teal-800" : "text-teal-700"
                      )}
                    >
                      {message.authorName}
                    </span>
                    <span className="text-[9px] text-gray-500 shrink-0 tabular-nums">
                      {formatMessageTimestamp(message.createdAt)}
                    </span>
                  </div>
                  <p className="text-gray-900 whitespace-pre-wrap break-words leading-relaxed text-sm">
                    {renderMessageContent(message.content)}
                  </p>
                  {mentionedMe && (
                    <div className="flex justify-end mt-1">
                      <span className="text-[9px] text-sky-600 font-medium">@you</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input bar */}
      <div className="shrink-0 px-3 py-3 bg-[#f0f2f5] border-t">
        <ChatInput
          disabled={thread.isClosed}
          isSubmitting={isSubmitting}
          placeholder={thread.isClosed ? "This chat is closed" : "Message… @ to mention"}
          onSend={handleSend}
        />
      </div>
    </div>
  );
}
