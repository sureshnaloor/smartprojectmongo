import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";
import { Thread } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";
import {
  SUBJECT_PRESETS,
  categoryConfig,
  criticalityConfig,
  type CollabCategory,
  type CollabCriticality,
} from "@/lib/collab-config";
import { ChannelSidebar } from "./channel-sidebar";
import { ChatHeader } from "./chat-header";
import { MessageFeed } from "./message-feed";
import { MessageComposer } from "./message-composer";
import { channelFromHash, HASH_TO_FILTER, type CollabChannelHash } from "./constants";
import type { Message } from "@/types";

interface ProjectCollabHubProps {
  initialThreadId?: number;
}

export function ProjectCollabHub({ initialThreadId }: ProjectCollabHubProps) {
  const [, projectParams] = useRoute<{ projectId: string }>("/projects/:projectId/collab");
  const projectId = projectParams?.projectId ?? "";
  const { user } = useAuth();
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [activeChannel, setActiveChannel] = useState<CollabChannelHash>("all");
  const [threads, setThreads] = useState<Thread[]>([]);
  const [selectedThreadId, setSelectedThreadId] = useState<number | null>(initialThreadId ?? null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [threadsLoading, setThreadsLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const [formData, setFormData] = useState({
    subject: SUBJECT_PRESETS[0],
    customSubject: "",
    title: "",
    category: "general" as CollabCategory,
    criticality: "medium" as CollabCriticality,
    initialMessage: "",
    isPinned: false,
    expiryMode: "none" as "none" | "days" | "date",
    expiryDays: "3",
    expiryDate: "",
  });

  const { data: project } = useQuery<{ name: string }>({
    queryKey: [`/api/projects/${projectId}`],
    enabled: !!projectId,
  });

  const selectedThread = useMemo(
    () => threads.find((t) => t.id === selectedThreadId) ?? null,
    [threads, selectedThreadId]
  );

  const currentUserId = user ? String(user.id) : null;

  const fetchThreads = useCallback(async () => {
    if (!projectId) return;
    try {
      setThreadsLoading(true);
      const params = new URLSearchParams();
      if (user?.id) params.set("viewerUserId", String(user.id));
      const res = await fetch(`/api/projects/${projectId}/collaboration/threads?${params}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setThreads(data);
    } catch {
      toast({ title: "Error", description: "Failed to load chats", variant: "destructive" });
    } finally {
      setThreadsLoading(false);
    }
  }, [projectId, user?.id, toast]);

  const fetchMessages = useCallback(async (threadId: number) => {
    if (!projectId) return;
    try {
      setMessagesLoading(true);
      const res = await fetch(`/api/projects/${projectId}/collaboration/threads/${threadId}/messages`);
      if (!res.ok) throw new Error("Failed to fetch messages");
      setMessages(await res.json());
      if (user?.id) {
        fetch(`/api/projects/${projectId}/collaboration/threads/${threadId}/read`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: user.id }),
        }).catch(() => {});
      }
    } catch {
      toast({ title: "Error", description: "Failed to load messages", variant: "destructive" });
    } finally {
      setMessagesLoading(false);
    }
  }, [projectId, user?.id, toast]);

  useEffect(() => {
    fetchThreads();
  }, [fetchThreads]);

  useEffect(() => {
    const updateFromHash = () => {
      const hash = (window.location.hash || "#all").slice(1).toLowerCase();
      setActiveChannel(channelFromHash(hash));
    };
    updateFromHash();
    window.addEventListener("hashchange", updateFromHash);
    return () => window.removeEventListener("hashchange", updateFromHash);
  }, []);

  useEffect(() => {
    if (initialThreadId) setSelectedThreadId(initialThreadId);
  }, [initialThreadId]);

  useEffect(() => {
    if (!selectedThreadId) {
      setMessages([]);
      return;
    }
    fetchMessages(selectedThreadId);
  }, [selectedThreadId, fetchMessages]);

  useEffect(() => {
    if (!selectedThreadId || !projectId) return;
    const target = `/projects/${projectId}/collab/thread/${selectedThreadId}`;
    if (window.location.pathname !== target) {
      window.history.replaceState(null, "", target + window.location.hash);
    }
  }, [selectedThreadId, projectId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleChannelChange = (hash: CollabChannelHash) => {
    window.location.hash = hash;
    setActiveChannel(hash);
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  };

  const filteredThreads = useMemo(() => {
    const filter = HASH_TO_FILTER[activeChannel];
    return threads.filter((t) => {
      const cat = t.category || t.type;
      if (filter === "all") return true;
      if (filter === "pinned") return t.isPinned || cat === "issue" || t.criticality === "critical";
      return cat === filter;
    }).sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());
  }, [threads, activeChannel]);

  const handleSend = async (content: string, mentions: { userId: number; userName: string }[]) => {
    if (!selectedThreadId || selectedThread?.isClosed) {
      toast({ title: "Chat closed", description: "Cannot send messages.", variant: "destructive" });
      return;
    }
    try {
      setIsSubmitting(true);
      const res = await fetch(`/api/projects/${projectId}/collaboration/threads/${selectedThreadId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content,
          authorId: user ? String(user.id) : `user_${Date.now()}`,
          authorName: user?.name || user?.email || "Anonymous",
          mentions,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      const newMsg = await res.json();
      setMessages((prev) => [...prev, newMsg]);
      fetchThreads();
    } catch {
      toast({ title: "Error", description: "Failed to send message", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateThread = async (e: React.FormEvent) => {
    e.preventDefault();
    const subject =
      formData.subject === "custom" ? formData.customSubject.trim() : formData.subject;
    if (!subject || !formData.title.trim()) {
      toast({ title: "Validation", description: "Subject and title required.", variant: "destructive" });
      return;
    }
    const authorName = user?.name || user?.email || "Anonymous";
    const authorId = user ? String(user.id) : `user_${Date.now()}`;

    try {
      setIsCreating(true);
      const body: Record<string, unknown> = {
        subject,
        title: formData.title.trim(),
        category: formData.category,
        criticality: formData.criticality,
        createdById: authorId,
        createdByName: authorName,
        isPinned: formData.isPinned,
      };
      if (formData.expiryMode === "days") body.expiryDays = parseInt(formData.expiryDays, 10);
      if (formData.expiryMode === "date" && formData.expiryDate) body.expiryDate = formData.expiryDate;

      const threadRes = await fetch(`/api/projects/${projectId}/collaboration/threads`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!threadRes.ok) throw new Error("Failed to create");
      const newThread = await threadRes.json();

      if (formData.initialMessage.trim()) {
        await fetch(`/api/projects/${projectId}/collaboration/threads/${newThread.id}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content: formData.initialMessage.trim(),
            authorId,
            authorName,
            mentions: [],
          }),
        });
      }

      toast({ title: "Chat started" });
      setIsModalOpen(false);
      setFormData((f) => ({ ...f, title: "", initialMessage: "", isPinned: false, expiryMode: "none" }));
      await fetchThreads();
      setSelectedThreadId(newThread.id);
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Could not create chat",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-10rem)] min-h-[560px] overflow-hidden bg-[var(--bg-cream)]">
      <div className="flex min-w-0 flex-1 flex-col border-r border-[var(--border-subtle)]">
        <ChatHeader thread={selectedThread} projectId={projectId} />
        <MessageFeed
          thread={selectedThread}
          messages={messages}
          currentUserId={currentUserId}
          loading={messagesLoading}
        />
        <div ref={messagesEndRef} />
        {selectedThread && (
          <MessageComposer
            disabled={selectedThread.isClosed}
            isSubmitting={isSubmitting}
            onSend={handleSend}
          />
        )}
      </div>

      <ChannelSidebar
        projectId={projectId}
        projectName={project?.name}
        activeChannel={activeChannel}
        onChannelChange={handleChannelChange}
        threads={filteredThreads}
        selectedThreadId={selectedThreadId}
        onSelectThread={setSelectedThreadId}
        onNewChat={() => setIsModalOpen(true)}
        loading={threadsLoading}
        userName={user?.name || user?.email}
      />

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
          <form onSubmit={handleCreateThread}>
            <DialogHeader>
              <DialogTitle>Start a new chat</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Subject area</Label>
                <Select value={formData.subject} onValueChange={(v) => setFormData({ ...formData, subject: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SUBJECT_PRESETS.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                    <SelectItem value="custom">Custom subject…</SelectItem>
                  </SelectContent>
                </Select>
                {formData.subject === "custom" && (
                  <Input
                    placeholder="e.g. Crane lift plan review"
                    value={formData.customSubject}
                    onChange={(e) => setFormData({ ...formData, customSubject: e.target.value })}
                  />
                )}
              </div>
              <div className="grid gap-2">
                <Label>Chat title *</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <Label>Type</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(v) => setFormData({ ...formData, category: v as CollabCategory })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(categoryConfig).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Priority</Label>
                  <Select
                    value={formData.criticality}
                    onValueChange={(v) => setFormData({ ...formData, criticality: v as CollabCriticality })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(criticalityConfig).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <Label>Pin at top</Label>
                <Switch
                  checked={formData.isPinned}
                  onCheckedChange={(c) => setFormData({ ...formData, isPinned: c })}
                />
              </div>
              <div className="grid gap-2">
                <Label>Opening message (optional)</Label>
                <Textarea
                  value={formData.initialMessage}
                  onChange={(e) => setFormData({ ...formData, initialMessage: e.target.value })}
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} disabled={isCreating}>
                Cancel
              </Button>
              <Button type="submit" disabled={isCreating}>
                {isCreating ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating…</> : "Start Chat"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
