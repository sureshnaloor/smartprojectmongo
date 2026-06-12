import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  Mail,
  Trash2,
  Plus,
  ChevronDown,
  ChevronUp,
  MessagesSquare,
  Eye,
  ListOrdered,
  type LucideIcon,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  MailTrailViewerModal,
  type MailViewerState,
} from "./mail-trail-viewer-modal";

export type MailProvider = "outlook" | "gmail" | "other";

export interface MailTrailEntry {
  link: string;
  provider?: MailProvider;
  sentAt?: string;
  from?: string;
  to?: string;
  body?: string;
  addedAt?: string;
}

export interface CorrespondenceThread {
  subject: string;
  description?: string;
  mailTrail: MailTrailEntry[];
}

interface CorrespondenceListItem {
  fileId: string;
  fileName: string;
  uploadTimestamp: number;
  fileInfo?: {
    correspondenceName?: string;
    correspondencename?: string;
    description?: string;
    linkUrl?: string;
    linkurl?: string;
    mailTrailCount?: string;
    mailtrailcount?: string;
    uploadedBy?: string;
    uploadedby?: string;
  };
}

export interface MailCorrespondenceConfig {
  title: string;
  subtitle: string;
  apiPath: string;
  emptyTitle: string;
  emptyHint: string;
  Icon: LucideIcon;
  iconClassName: string;
}

interface DraftEntry {
  link: string;
  provider: MailProvider;
  sentAt: string;
  from: string;
  to: string;
  body: string;
}

const emptyDraft = (): DraftEntry => ({
  link: "",
  provider: "outlook",
  sentAt: "",
  from: "",
  to: "",
  body: "",
});

function itemSubject(item: CorrespondenceListItem) {
  return item.fileInfo?.correspondenceName || item.fileInfo?.correspondencename || "Untitled";
}

function itemTrailCount(item: CorrespondenceListItem) {
  const raw = item.fileInfo?.mailTrailCount || item.fileInfo?.mailtrailcount;
  if (raw) return parseInt(raw, 10) || 1;
  return item.fileInfo?.linkUrl || item.fileInfo?.linkurl ? 1 : 0;
}

function providerLabel(provider?: MailProvider) {
  if (provider === "outlook") return "Outlook";
  if (provider === "gmail") return "Gmail";
  return "Email";
}

function entryPreview(entry: MailTrailEntry) {
  if (entry.body?.trim()) {
    const text = entry.body.trim();
    return text.length > 120 ? `${text.slice(0, 120)}…` : text;
  }
  return entry.link ? "Link saved — open to view in mail client" : "No content";
}

function toApiEntry(e: DraftEntry) {
  return {
    link: e.link.trim(),
    provider: e.provider,
    ...(e.sentAt ? { sentAt: e.sentAt } : {}),
    ...(e.from ? { from: e.from } : {}),
    ...(e.to ? { to: e.to } : {}),
    ...(e.body.trim() ? { body: e.body.trim() } : {}),
  };
}

export function ProjectMailCorrespondence({ config }: { config: MailCorrespondenceConfig }) {
  const { projectId } = useParams();
  const { toast } = useToast();
  const { title, subtitle, apiPath, emptyTitle, emptyHint, Icon, iconClassName } = config;

  const [submitting, setSubmitting] = useState(false);
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [mailTrail, setMailTrail] = useState<DraftEntry[]>([emptyDraft()]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [appendDraft, setAppendDraft] = useState<DraftEntry>(emptyDraft());
  const [viewer, setViewer] = useState<MailViewerState>(null);

  const listKey = `/api/projects/${projectId}/${apiPath}`;

  const { data: project } = useQuery({
    queryKey: [`/api/projects/${projectId}`],
  });

  const { data: items, isLoading } = useQuery<CorrespondenceListItem[]>({
    queryKey: [listKey],
  });

  const { data: expandedThread, isLoading: loadingThread } = useQuery<CorrespondenceThread>({
    queryKey: [`${listKey}/content`, expandedId],
    enabled: !!expandedId,
    queryFn: async () => {
      const res = await apiRequest("GET", `${listKey}/content?fileId=${expandedId}`);
      if (!res.ok) throw new Error("Failed to load mail trail");
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const trail = mailTrail.map(toApiEntry).filter((e) => e.link || e.body);

      const res = await apiRequest("POST", `${listKey}/create`, {
        subject,
        description,
        mailTrail: trail,
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to save mail trail");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [listKey] });
      toast({ title: "Success", description: "Mail trail saved successfully" });
      setSubmitting(false);
      setSubject("");
      setDescription("");
      setMailTrail([emptyDraft()]);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      setSubmitting(false);
    },
  });

  const appendMutation = useMutation({
    mutationFn: async ({
      fileId,
      fileName,
      entry,
    }: {
      fileId: string;
      fileName: string;
      entry: DraftEntry;
    }) => {
      const res = await apiRequest("POST", `${listKey}/append`, {
        fileId,
        fileName,
        entry: toApiEntry(entry),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to add email to trail");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [listKey] });
      if (expandedId) {
        queryClient.invalidateQueries({ queryKey: [`${listKey}/content`, expandedId] });
      }
      toast({ title: "Success", description: "Email added to mail trail" });
      setAppendDraft(emptyDraft());
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async ({ fileId, fileName }: { fileId: string; fileName: string }) => {
      const encodedFileName = encodeURIComponent(fileName);
      const res = await apiRequest(
        "DELETE",
        `${listKey}?fileId=${fileId}&fileName=${encodedFileName}`
      );
      if (!res.ok) throw new Error("Delete failed");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [listKey] });
      setExpandedId(null);
      setViewer(null);
      toast({ title: "Success", description: "Mail trail deleted" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete mail trail", variant: "destructive" });
    },
  });

  const updateTrailEntry = (index: number, patch: Partial<DraftEntry>) => {
    setMailTrail((prev) => prev.map((e, i) => (i === index ? { ...e, ...patch } : e)));
  };

  const handleSubmit = () => {
    const hasContent = mailTrail.some((e) => e.link.trim() || e.body.trim());
    if (!subject.trim() || !hasContent) {
      toast({
        title: "Validation Error",
        description: "Subject and at least one email link or message body are required",
        variant: "destructive",
      });
      return;
    }
    setSubmitting(true);
    createMutation.mutate();
  };

  const handleAppend = (fileId: string, fileName: string) => {
    if (!appendDraft.link.trim() && !appendDraft.body.trim()) {
      toast({
        title: "Validation Error",
        description: "Paste a link or message body to add to the trail",
        variant: "destructive",
      });
      return;
    }
    appendMutation.mutate({ fileId, fileName, entry: appendDraft });
  };

  const displayTrail: MailTrailEntry[] =
    expandedThread?.mailTrail ||
    (expandedId && items
      ? (() => {
          const item = items.find((i) => i.fileId === expandedId);
          const link = item?.fileInfo?.linkUrl || item?.fileInfo?.linkurl;
          if (!link) return [];
          return [{ link, provider: "other" as const }];
        })()
      : []);

  const openSingleMessage = (thread: CorrespondenceThread, messageIndex: number) => {
    setViewer({ mode: "single", thread, messageIndex });
  };

  const openCompleteTrail = (thread: CorrespondenceThread) => {
    setViewer({ mode: "trail", thread });
  };

  const loadThreadAndView = async (fileId: string, mode: "single" | "trail", messageIndex = 0) => {
    try {
      const res = await apiRequest("GET", `${listKey}/content?fileId=${fileId}`);
      if (!res.ok) throw new Error("Failed to load mail trail");
      const thread: CorrespondenceThread = await res.json();
      if (mode === "trail") openCompleteTrail(thread);
      else openSingleMessage(thread, messageIndex);
    } catch {
      toast({ title: "Error", description: "Could not load mail trail", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-8 p-6 bg-background min-h-screen">
      <MailTrailViewerModal
        viewer={viewer}
        onClose={() => setViewer(null)}
        onShowTrail={openCompleteTrail}
        onShowSingle={openSingleMessage}
      />

      <div className="relative flex items-center justify-center mb-8 p-6 rounded-xl bg-card border shadow-[0_10px_20px_rgba(0,0,0,0.1),0_6px_6px_rgba(0,0,0,0.1)]">
        <div className="text-center">
          <h1 className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            {title}
          </h1>
          <p className="text-muted-foreground mt-2">{subtitle}</p>
        </div>
        {project && (
          <div className="absolute right-6 top-1/2 -translate-y-1/2 hidden md:block">
            <div className="text-right">
              <span className="block text-xs text-muted-foreground uppercase tracking-wider">
                Project
              </span>
              <span className="text-xl font-serif font-bold text-primary">{project.name}</span>
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-center">
        <div className="w-full max-w-3xl">
          <Card className="border-2 border-dashed shadow-sm hover:border-primary/50 transition-colors">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <MessagesSquare className="h-5 w-5" />
                Add Mail Trail (same subject)
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Paste the Outlook/Gmail link and copy the email body text so it can be read in-app
                without opening your mail client.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="subject">Email subject (thread)</Label>
                  <Input
                    id="subject"
                    placeholder="RE: Site access approval"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Notes (optional)</Label>
                  <Input
                    id="description"
                    placeholder="Summary or context"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-3">
                <Label>Emails in this trail (oldest → newest)</Label>
                {mailTrail.map((entry, index) => (
                  <div
                    key={index}
                    className="space-y-2 p-3 rounded-lg border bg-muted/20"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-2">
                      <div className="md:col-span-2">
                        <Select
                          value={entry.provider}
                          onValueChange={(v) =>
                            updateTrailEntry(index, { provider: v as MailProvider })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="outlook">Outlook</SelectItem>
                            <SelectItem value="gmail">Gmail</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="md:col-span-4">
                        <Input
                          placeholder="Outlook/Gmail link (optional if body pasted)"
                          value={entry.link}
                          onChange={(e) => updateTrailEntry(index, { link: e.target.value })}
                        />
                      </div>
                      <div className="md:col-span-2">
                        <Input
                          type="date"
                          value={entry.sentAt}
                          onChange={(e) => updateTrailEntry(index, { sentAt: e.target.value })}
                        />
                      </div>
                      <div className="md:col-span-2">
                        <Input
                          placeholder="From"
                          value={entry.from}
                          onChange={(e) => updateTrailEntry(index, { from: e.target.value })}
                        />
                      </div>
                      <div className="md:col-span-1 flex items-center justify-end">
                        {mailTrail.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              setMailTrail((prev) => prev.filter((_, i) => i !== index))
                            }
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                    <Textarea
                      placeholder="Paste email message body here (copy from Outlook/Gmail)"
                      value={entry.body}
                      onChange={(e) => updateTrailEntry(index, { body: e.target.value })}
                      rows={4}
                      className="text-sm"
                    />
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setMailTrail((prev) => [...prev, emptyDraft()])}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add another email to trail
                </Button>
              </div>

              <div className="flex justify-end">
                <Button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="bg-primary hover:bg-primary/90"
                >
                  {submitting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Mail className="mr-2 h-4 w-4" />
                  )}
                  {submitting ? "Saving..." : "Save mail trail"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {items?.map((item) => {
            const isExpanded = expandedId === item.fileId;
            const count = itemTrailCount(item);
            const threadForCard: CorrespondenceThread | null = isExpanded && expandedThread
              ? expandedThread
              : null;

            return (
              <Card
                key={item.fileId}
                className="group overflow-hidden border shadow-sm hover:shadow-xl transition-all"
              >
                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2 bg-muted/30">
                  <div className="space-y-1 overflow-hidden flex-1">
                    <CardTitle className="text-base font-semibold truncate" title={itemSubject(item)}>
                      {itemSubject(item)}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">
                      {count} email{count === 1 ? "" : "s"} in trail ·{" "}
                      {new Date(item.uploadTimestamp).toLocaleDateString()}
                    </p>
                  </div>
                  <div className={`p-2 rounded-full ${iconClassName}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                </CardHeader>
                <CardContent className="pt-4 space-y-3">
                  {item.fileInfo?.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {item.fileInfo.description}
                    </p>
                  )}
                  <div className="text-xs text-muted-foreground">
                    <span className="font-medium">Added by:</span>{" "}
                    {item.fileInfo?.uploadedBy || item.fileInfo?.uploadedby || "Unknown"}
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => setExpandedId(isExpanded ? null : item.fileId)}
                    >
                      {isExpanded ? (
                        <ChevronUp className="mr-2 h-4 w-4" />
                      ) : (
                        <ChevronDown className="mr-2 h-4 w-4" />
                      )}
                      {isExpanded ? "Hide trail" : "View trail"}
                    </Button>
                    {count > 0 && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => loadThreadAndView(item.fileId, "trail")}
                      >
                        <ListOrdered className="mr-2 h-4 w-4" />
                        Full trail
                      </Button>
                    )}
                  </div>

                  {isExpanded && (
                    <div className="space-y-3 pt-2 border-t">
                      {loadingThread ? (
                        <div className="flex justify-center py-4">
                          <Loader2 className="h-6 w-6 animate-spin" />
                        </div>
                      ) : (
                        <>
                          <ol className="space-y-2">
                            {displayTrail.map((entry, idx) => (
                              <li key={idx}>
                                <button
                                  type="button"
                                  className="w-full text-left flex items-start gap-2 p-3 rounded-md bg-muted/30 text-sm hover:bg-muted/60 transition-colors border border-transparent hover:border-primary/20"
                                  onClick={() => {
                                    if (threadForCard) {
                                      openSingleMessage(threadForCard, idx);
                                    } else {
                                      loadThreadAndView(item.fileId, "single", idx);
                                    }
                                  }}
                                >
                                  <span className="text-xs font-mono text-muted-foreground mt-0.5 w-5 shrink-0">
                                    {idx + 1}.
                                  </span>
                                  <div className="flex-1 min-w-0 space-y-1">
                                    <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                                      <span className="font-medium">
                                        {providerLabel(entry.provider)}
                                      </span>
                                      {entry.from && <span>From: {entry.from}</span>}
                                      {entry.sentAt && (
                                        <span>
                                          {new Date(entry.sentAt).toLocaleDateString()}
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-sm line-clamp-2 text-foreground">
                                      {entryPreview(entry)}
                                    </p>
                                    <span className="inline-flex items-center text-xs text-primary">
                                      <Eye className="mr-1 h-3 w-3" />
                                      View message
                                    </span>
                                  </div>
                                </button>
                              </li>
                            ))}
                          </ol>

                          {threadForCard && threadForCard.mailTrail.length > 1 && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full"
                              onClick={() => openCompleteTrail(threadForCard)}
                            >
                              <ListOrdered className="mr-2 h-4 w-4" />
                              See as complete trail
                            </Button>
                          )}
                        </>
                      )}

                      <div className="space-y-2 p-3 rounded-lg border border-dashed">
                        <Label className="text-xs">Add email to this trail (same subject)</Label>
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-2">
                          <div className="md:col-span-3">
                            <Select
                              value={appendDraft.provider}
                              onValueChange={(v) =>
                                setAppendDraft((d) => ({ ...d, provider: v as MailProvider }))
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="outlook">Outlook</SelectItem>
                                <SelectItem value="gmail">Gmail</SelectItem>
                                <SelectItem value="other">Other</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="md:col-span-9">
                            <Input
                              placeholder="Outlook/Gmail link (optional)"
                              value={appendDraft.link}
                              onChange={(e) =>
                                setAppendDraft((d) => ({ ...d, link: e.target.value }))
                              }
                            />
                          </div>
                        </div>
                        <Textarea
                          placeholder="Paste email body text"
                          value={appendDraft.body}
                          onChange={(e) =>
                            setAppendDraft((d) => ({ ...d, body: e.target.value }))
                          }
                          rows={3}
                          className="text-sm"
                        />
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={appendMutation.isPending}
                          onClick={() => handleAppend(item.fileId, item.fileName)}
                        >
                          {appendMutation.isPending ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Plus className="mr-2 h-4 w-4" />
                          )}
                          Add to trail
                        </Button>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="destructive"
                      size="sm"
                      className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => {
                        if (confirm("Delete this entire mail trail?")) {
                          deleteMutation.mutate({ fileId: item.fileId, fileName: item.fileName });
                        }
                      }}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete trail
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {items?.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center p-12 text-muted-foreground border-2 border-dashed rounded-xl bg-muted/10">
              <Mail className="h-12 w-12 mb-4 opacity-50" />
              <p className="text-lg font-medium">{emptyTitle}</p>
              <p className="text-sm text-center max-w-md">{emptyHint}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
