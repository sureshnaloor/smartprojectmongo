import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ExternalLink, ListOrdered, Mail } from "lucide-react";
import type { CorrespondenceThread, MailProvider, MailTrailEntry } from "./project-mail-correspondence";

const TRAIL_FONT_FAMILIES = [
  'Georgia, "Times New Roman", serif',
  'Inter, system-ui, -apple-system, sans-serif',
  '"JetBrains Mono", ui-monospace, monospace',
  '"Palatino Linotype", Palatino, serif',
  'Cambria, "Hoefler Text", serif',
] as const;

function providerLabel(provider?: MailProvider) {
  if (provider === "outlook") return "Outlook";
  if (provider === "gmail") return "Gmail";
  return "Email";
}

function formatDate(sentAt?: string) {
  if (!sentAt) return null;
  const d = new Date(sentAt);
  return Number.isNaN(d.getTime()) ? sentAt : d.toLocaleString();
}

function MessageBlock({
  entry,
  index,
  subject,
  fontFamily,
}: {
  entry: MailTrailEntry;
  index: number;
  subject: string;
  fontFamily?: string;
}) {
  return (
    <article
      className="rounded-lg border bg-card p-4 shadow-sm"
      style={fontFamily ? { fontFamily } : undefined}
    >
      <header className="mb-3 space-y-1 border-b pb-3">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span className="rounded-full bg-primary/10 px-2 py-0.5 font-medium text-primary">
            Message {index + 1}
          </span>
          <span>{providerLabel(entry.provider)}</span>
          {entry.sentAt && <span>{formatDate(entry.sentAt)}</span>}
        </div>
        <h3 className="text-base font-semibold leading-snug">{subject}</h3>
        {entry.from && (
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">From:</span> {entry.from}
          </p>
        )}
        {entry.to && (
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">To:</span> {entry.to}
          </p>
        )}
      </header>
      <div className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
        {entry.body?.trim() ? (
          entry.body
        ) : (
          <p className="italic text-muted-foreground">
            No message text was saved for this email. Use &quot;Open in {providerLabel(entry.provider)}&quot;
            below to view it in your mail client.
          </p>
        )}
      </div>
    </article>
  );
}

export type MailViewerState =
  | { mode: "single"; thread: CorrespondenceThread; messageIndex: number }
  | { mode: "trail"; thread: CorrespondenceThread }
  | null;

interface MailTrailViewerModalProps {
  viewer: MailViewerState;
  onClose: () => void;
  onShowTrail: (thread: CorrespondenceThread) => void;
  onShowSingle: (thread: CorrespondenceThread, messageIndex: number) => void;
}

export function MailTrailViewerModal({
  viewer,
  onClose,
  onShowTrail,
  onShowSingle,
}: MailTrailViewerModalProps) {
  if (!viewer) return null;

  const { thread } = viewer;
  const singleEntry =
    viewer.mode === "single" ? thread.mailTrail[viewer.messageIndex] : undefined;

  const openExternal = (link?: string) => {
    if (link) window.open(link, "_blank", "noopener,noreferrer");
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col gap-0 p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0">
          <DialogTitle className="flex items-center gap-2 pr-8">
            <Mail className="h-5 w-5 text-primary" />
            {viewer.mode === "trail" ? "Complete mail trail" : "Email message"}
          </DialogTitle>
          <DialogDescription>
            {thread.subject}
            {viewer.mode === "trail" && (
              <span className="block mt-1">
                {thread.mailTrail.length} message{thread.mailTrail.length === 1 ? "" : "s"} — each
                shown in a distinct typeface
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-4">
          {viewer.mode === "single" && singleEntry && (
            <MessageBlock
              entry={singleEntry}
              index={viewer.messageIndex}
              subject={thread.subject}
            />
          )}

          {viewer.mode === "trail" &&
            thread.mailTrail.map((entry, idx) => (
              <MessageBlock
                key={idx}
                entry={entry}
                index={idx}
                subject={thread.subject}
                fontFamily={TRAIL_FONT_FAMILIES[idx % TRAIL_FONT_FAMILIES.length]}
              />
            ))}
        </div>

        <DialogFooter className="px-6 py-4 border-t shrink-0 flex-col sm:flex-row gap-2">
          {viewer.mode === "single" && singleEntry?.link && (
            <Button variant="outline" onClick={() => openExternal(singleEntry.link)}>
              <ExternalLink className="mr-2 h-4 w-4" />
              Open in {providerLabel(singleEntry.provider)}
            </Button>
          )}
          {viewer.mode === "single" && thread.mailTrail.length > 1 && (
            <Button variant="secondary" onClick={() => onShowTrail(thread)}>
              <ListOrdered className="mr-2 h-4 w-4" />
              See complete trail
            </Button>
          )}
          {viewer.mode === "trail" && (
            <Button
              variant="outline"
              onClick={() => onShowSingle(thread, thread.mailTrail.length - 1)}
            >
              View latest message only
            </Button>
          )}
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
