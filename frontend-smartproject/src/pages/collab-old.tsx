import { useState, useEffect, useMemo } from "react";
import { Link, useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import {
  Search,
  Plus,
  Loader2,
  Pin,
  AlertTriangle,
  Clock,
  MessageSquare,
} from "lucide-react";
import { Thread, ThreadType } from "@/types";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";
import {
  SUBJECT_PRESETS,
  categoryConfig,
  criticalityConfig,
  formatChatTime,
  formatExpiry,
  initials,
  type CollabCategory,
  type CollabCriticality,
} from "@/lib/collab-config";
import {
  GLOBAL_COLLAB_CATEGORIES,
  GLOBAL_COLLAB_HASH_TO_CATEGORY,
  globalCategoryConfig,
  globalCategoryFromSubject,
  isGlobalCollabCategory,
  type GlobalCollabCategory,
} from "@/lib/global-collab-config";
import { CollabNotifications } from "@/components/collab/collab-notifications";
import { GlobalCollabTabs } from "@/components/collab/global-collab-tabs";

type ProjectFilterTab = "all" | "pinned" | ThreadType;
type GlobalFilterTab = "all" | "pinned" | GlobalCollabCategory;
type FilterTab = ProjectFilterTab | GlobalFilterTab;

export default function CollabPage() {
  const [, projectParams] = useRoute<{ projectId: string }>("/projects/:projectId/collab");
  const projectId = projectParams?.projectId;
  const isGlobal = !projectId;
  const { user } = useAuth();

  const [searchTerm, setSearchTerm] = useState("");
  const [filterTab, setFilterTab] = useState<FilterTab>("all");
  const [threads, setThreads] = useState<Thread[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const [globalHash, setGlobalHash] = useState("all");

  const [formData, setFormData] = useState({
    subject: isGlobal ? GLOBAL_COLLAB_CATEGORIES[0].label : SUBJECT_PRESETS[0],
    customSubject: "",
    title: "",
    category: (isGlobal ? "information" : "general") as CollabCategory | GlobalCollabCategory,
    criticality: "medium" as CollabCriticality,
    initialMessage: "",
    isPinned: false,
    expiryMode: "none" as "none" | "days" | "date",
    expiryDays: "3",
    expiryDate: "",
  });

  useEffect(() => {
    fetchThreads();
  }, [projectId, user?.id]);

  useEffect(() => {
    const updateFromHash = () => {
      if (typeof window === "undefined") return;
      const hash = (window.location.hash || "#all").slice(1).toLowerCase();
      if (isGlobal) {
        setGlobalHash(hash);
        const mapped = GLOBAL_COLLAB_HASH_TO_CATEGORY[hash] ?? "all";
        setFilterTab(mapped as FilterTab);
      } else {
        const map: Record<string, FilterTab> = {
          all: "all",
          pinned: "pinned",
          issues: "issue",
          safety: "safety",
          quality: "quality",
          casual: "casual",
          awards: "awards",
          info: "info",
          announcements: "announcement",
        };
        setFilterTab(map[hash] ?? "all");
      }
    };
    updateFromHash();
    window.addEventListener("hashchange", updateFromHash);
    return () => window.removeEventListener("hashchange", updateFromHash);
  }, [isGlobal]);

  const fetchThreads = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (user?.id) params.set("viewerUserId", String(user.id));
      const endpoint = projectId
        ? `/api/projects/${projectId}/collaboration/threads?${params}`
        : `/api/collaboration/threads?${params}`;
      const response = await fetch(endpoint);
      if (!response.ok) throw new Error("Failed to fetch threads");
      setThreads(await response.json());
    } catch (err) {
      console.error(err);
      setError("Failed to load chats. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateThread = async (e: React.FormEvent) => {
    e.preventDefault();
    const subject = isGlobal
      ? formData.subject
      : formData.subject === "custom"
        ? formData.customSubject.trim()
        : formData.subject;
    if (!subject || !formData.title.trim()) {
      toast({ title: "Validation", description: "Subject and title are required.", variant: "destructive" });
      return;
    }

    const category = isGlobal
      ? globalCategoryFromSubject(subject)
      : (formData.category as CollabCategory);

    const authorName = user?.name || user?.email || "Anonymous";
    const authorId = user ? String(user.id) : `user_${Date.now()}`;

    try {
      setIsSubmitting(true);
      const threadEndpoint = projectId
        ? `/api/projects/${projectId}/collaboration/threads`
        : "/api/collaboration/threads";

      const body: Record<string, unknown> = {
        subject,
        title: formData.title.trim(),
        category,
        criticality: formData.criticality,
        createdById: authorId,
        createdByName: authorName,
        isPinned: formData.isPinned,
      };
      if (formData.expiryMode === "days") body.expiryDays = parseInt(formData.expiryDays, 10);
      if (formData.expiryMode === "date" && formData.expiryDate) body.expiryDate = formData.expiryDate;

      const threadRes = await fetch(threadEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!threadRes.ok) {
        const err = await threadRes.json().catch(() => ({}));
        throw new Error(err.message || "Failed to create chat");
      }
      const newThread = await threadRes.json();

      if (formData.initialMessage.trim()) {
        const msgEndpoint = projectId
          ? `/api/projects/${projectId}/collaboration/threads/${newThread.id}/messages`
          : `/api/collaboration/threads/${newThread.id}/messages`;
        await fetch(msgEndpoint, {
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

      toast({ title: "Chat started", description: "Your trail is ready." });
      setIsModalOpen(false);
      setFormData((f) => ({
        ...f,
        title: "",
        initialMessage: "",
        isPinned: false,
        expiryMode: "none",
      }));
      fetchThreads();
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Could not create chat",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredThreads = useMemo(() => {
    return threads.filter((thread) => {
      const cat = thread.category || thread.type;
      const matchesSearch =
        thread.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (thread.subject || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        thread.createdByName.toLowerCase().includes(searchTerm.toLowerCase());

      let matchesTab = true;
      if (filterTab === "pinned") {
        matchesTab = isGlobal
          ? Boolean(thread.isPinned)
          : Boolean(thread.isPinned) || cat === "issue" || thread.criticality === "critical";
      } else if (filterTab !== "all") {
        matchesTab = cat === filterTab;
      }

      return matchesSearch && matchesTab;
    });
  }, [threads, searchTerm, filterTab, isGlobal]);

  const pinnedThreads = useMemo(
    () => filteredThreads.filter((t) => t.isPinned).slice(0, 3),
    [filteredThreads]
  );

  const threadsBySubject = useMemo(() => {
    const nonPinned = filteredThreads.filter((t) => !t.isPinned);
    const groups = new Map<string, Thread[]>();
    for (const t of nonPinned) {
      const key = t.subject || t.title;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(t);
    }
    return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [filteredThreads]);

  const ChatRow = ({ thread }: { thread: Thread }) => {
    const catKey = (thread.category || thread.type || (isGlobal ? "others" : "general")) as string;
    const config = isGlobal
      ? isGlobalCollabCategory(catKey)
        ? globalCategoryConfig[catKey]
        : globalCategoryConfig.others
      : categoryConfig[catKey as CollabCategory] || categoryConfig.general;
    const crit = criticalityConfig[thread.criticality || "medium"];
    const Icon = config.icon;
    const threadUrl = projectId
      ? `/projects/${projectId}/collab/thread/${thread.id}`
      : `/collab/thread/${thread.id}`;
    const expiry = formatExpiry(thread.expiresAt);
    const unread = thread.unreadMentionCount || 0;

    return (
      <Link href={threadUrl}>
        <div className="flex items-center gap-3 px-4 py-3 hover:bg-[#f0f2f5] cursor-pointer border-b border-gray-100 transition-colors">
          <div
            className={cn(
              "h-12 w-12 rounded-full flex items-center justify-center text-sm font-semibold shrink-0",
              config.bg,
              config.color
            )}
          >
            {initials(thread.title)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                {thread.isPinned && <Pin className="h-3 w-3 text-amber-600 shrink-0" />}
                <span className="font-semibold text-gray-900 truncate">{thread.title}</span>
              </div>
              <span className="text-[11px] text-gray-500 shrink-0">{formatChatTime(thread.lastMessageAt)}</span>
            </div>
            <div className="flex items-center justify-between gap-2 mt-0.5">
              <p className="text-sm text-gray-500 truncate">
                {thread.lastMessagePreview || `${thread.messageCount} message${thread.messageCount !== 1 ? "s" : ""}`}
              </p>
              {unread > 0 && (
                <span className="bg-teal-600 text-white text-[10px] font-bold rounded-full h-5 min-w-5 px-1.5 flex items-center justify-center shrink-0">
                  {unread}
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
              <Badge variant="outline" className={cn("text-[10px] py-0 h-5", config.bg, config.color)}>
                <Icon className="h-2.5 w-2.5 mr-0.5" />
                {config.label}
              </Badge>
              <span className={cn("flex items-center gap-1 text-[10px]", crit.color)}>
                <span className={cn("h-1.5 w-1.5 rounded-full", crit.dot)} />
                {crit.label}
              </span>
              {expiry && (
                <span className="text-[10px] text-amber-600 flex items-center gap-0.5">
                  <Clock className="h-2.5 w-2.5" />
                  {expiry}
                </span>
              )}
              {thread.isClosed && (
                <Badge variant="secondary" className="text-[10px] py-0 h-5">Closed</Badge>
              )}
            </div>
          </div>
        </div>
      </Link>
    );
  };

  const handleGlobalTabChange = (hash: string) => {
    window.location.hash = hash;
    setGlobalHash(hash);
    const mapped = GLOBAL_COLLAB_HASH_TO_CATEGORY[hash] ?? "all";
    setFilterTab(mapped as FilterTab);
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  };

  return (
    <div className="container mx-auto p-4 md:p-6 max-w-4xl">
      <div className="flex items-start justify-between gap-4 mb-2">
        <div>
          <h1 className="text-xl font-semibold text-stone-600">
            {isGlobal ? "Company Collaboration" : "Project Chats"}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {isGlobal
              ? "Company-wide chat trails — policies, procedures, events, awards, and more. Pin up to 3 featured chats."
              : "Subject-based trails — quality, safety, evacuation, or light banter. Pin up to 3 featured chats per project."}
          </p>
        </div>
        <CollabNotifications projectId={projectId} />
      </div>

      {isGlobal && (
        <GlobalCollabTabs activeHash={globalHash} onTabChange={handleGlobalTabChange} />
      )}

      <div className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search subjects or chats..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-white"
          />
        </div>
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTrigger asChild>
            <Button className="bg-teal-600 hover:bg-teal-700 shrink-0">
              <Plus className="w-4 h-4 mr-1" />
              New Chat
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[540px] max-h-[90vh] overflow-y-auto">
            <form onSubmit={handleCreateThread}>
              <DialogHeader>
                <DialogTitle>Start a chat trail</DialogTitle>
                <DialogDescription>
                  {isGlobal
                    ? "Choose a company topic and start a conversation. Use @mentions to notify colleagues."
                    : "Pick a subject area and start a WhatsApp-style conversation. Use @mentions in messages to notify teammates."}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label>{isGlobal ? "Topic" : "Subject area"}</Label>
                  <Select
                    value={formData.subject}
                    onValueChange={(v) =>
                      setFormData({
                        ...formData,
                        subject: v,
                        category: isGlobal ? globalCategoryFromSubject(v) : formData.category,
                      })
                    }
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {isGlobal
                        ? GLOBAL_COLLAB_CATEGORIES.map((c) => (
                            <SelectItem key={c.key} value={c.label}>
                              {c.label}
                            </SelectItem>
                          ))
                        : (
                          <>
                            {SUBJECT_PRESETS.map((s) => (
                              <SelectItem key={s} value={s}>{s}</SelectItem>
                            ))}
                            <SelectItem value="custom">Custom subject…</SelectItem>
                          </>
                        )}
                    </SelectContent>
                  </Select>
                  {!isGlobal && formData.subject === "custom" && (
                    <Input
                      placeholder="e.g. Crane lift plan review"
                      value={formData.customSubject}
                      onChange={(e) => setFormData({ ...formData, customSubject: e.target.value })}
                    />
                  )}
                </div>
                <div className="grid gap-2">
                  <Label>Chat title <span className="text-red-500">*</span></Label>
                  <Input
                    placeholder="e.g. ISO 9001 audit findings"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                  />
                </div>
                {!isGlobal && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="grid gap-2">
                      <Label>Type</Label>
                      <Select
                        value={formData.category as CollabCategory}
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
                      <Label>Criticality</Label>
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
                )}
                {isGlobal && (
                  <div className="grid gap-2">
                    <Label>Criticality</Label>
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
                )}
                <div className="grid gap-2">
                  <Label>Expiry</Label>
                  <Select
                    value={formData.expiryMode}
                    onValueChange={(v) => setFormData({ ...formData, expiryMode: v as "none" | "days" | "date" })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No expiry</SelectItem>
                      <SelectItem value="days">Expires after N days</SelectItem>
                      <SelectItem value="date">Expires on date</SelectItem>
                    </SelectContent>
                  </Select>
                  {formData.expiryMode === "days" && (
                    <Input
                      type="number"
                      min={1}
                      value={formData.expiryDays}
                      onChange={(e) => setFormData({ ...formData, expiryDays: e.target.value })}
                      placeholder="e.g. 3"
                    />
                  )}
                  {formData.expiryMode === "date" && (
                    <Input
                      type="date"
                      value={formData.expiryDate}
                      onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                    />
                  )}
                </div>
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <Label>Pin / feature at top</Label>
                    <p className="text-xs text-gray-500">
                      {isGlobal ? "Max 3 pinned chats" : "Max 3 pinned chats per project"}
                    </p>
                  </div>
                  <Switch
                    checked={formData.isPinned}
                    onCheckedChange={(c) => setFormData({ ...formData, isPinned: c })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Opening message (optional)</Label>
                  <Textarea
                    placeholder="Start the trail…"
                    value={formData.initialMessage}
                    onChange={(e) => setFormData({ ...formData, initialMessage: e.target.value })}
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} disabled={isSubmitting}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting} className="bg-teal-600 hover:bg-teal-700">
                  {isSubmitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creating…</> : "Start Chat"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <AlertTriangle className="w-10 h-10 text-red-500 mx-auto mb-3" />
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={fetchThreads} variant="outline">Retry</Button>
        </div>
      ) : filteredThreads.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border">
          <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-600">
            {isGlobal
              ? "No company chats yet. Start one on policies, events, or awards."
              : "No chats yet. Start one on quality, safety, or site banter."}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          {pinnedThreads.length > 0 && (
            <div>
              <div className="px-4 py-2 bg-amber-50 border-b flex items-center gap-2 text-xs font-semibold text-amber-800 uppercase tracking-wide">
                <Pin className="h-3.5 w-3.5" />
                Pinned & Featured ({pinnedThreads.length}/3)
              </div>
              {pinnedThreads.map((t) => (
                <ChatRow key={`pin-${t.id}`} thread={t} />
              ))}
            </div>
          )}

          {threadsBySubject.map(([subject, subjectThreads]) => (
            <div key={subject}>
              <div className="px-4 py-2 bg-[#f0f2f5] border-y border-gray-200 text-xs font-semibold text-gray-600 uppercase tracking-wide sticky top-0 z-10">
                {subject}
                <span className="ml-2 font-normal text-gray-400">({subjectThreads.length})</span>
              </div>
              {subjectThreads
                .sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime())
                .map((t) => (
                  <ChatRow key={t.id} thread={t} />
                ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
