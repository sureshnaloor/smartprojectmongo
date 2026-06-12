import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Bell, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/auth-context";
import { formatChatTime } from "@/lib/collab-config";

export interface CollabNotification {
  id: number;
  userId: number;
  projectId?: number | null;
  threadId: number;
  messageId: number;
  type: "mention";
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
}

interface CollabNotificationsProps {
  projectId?: string;
}

export function CollabNotifications({ projectId }: CollabNotificationsProps) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<CollabNotification[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchNotifications = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ viewerUserId: String(user.id) });
      if (projectId) params.set("projectId", projectId);
      const res = await fetch(`/api/collaboration/notifications?${params}`);
      if (res.ok) {
        setNotifications(await res.json());
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [user?.id, projectId]);

  const unread = notifications.filter((n) => !n.read).length;

  const markRead = async (id: number) => {
    if (!user?.id) return;
    await fetch(`/api/collaboration/notifications/${id}/read?viewerUserId=${user.id}`, {
      method: "PATCH",
    });
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const threadHref = (n: CollabNotification) => {
    const pid = n.projectId ?? projectId;
    return pid ? `/projects/${pid}/collab/thread/${n.threadId}` : `/collab/thread/${n.threadId}`;
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" className="relative">
          <Bell className="h-4 w-4" />
          {unread > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 min-w-5 px-1 text-[10px] bg-red-500">
              {unread > 9 ? "9+" : unread}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Mentions</span>
          {loading && <Loader2 className="h-3 w-3 animate-spin" />}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {notifications.length === 0 ? (
          <div className="px-3 py-6 text-center text-sm text-muted-foreground">No notifications</div>
        ) : (
          notifications.slice(0, 8).map((n) => (
            <DropdownMenuItem key={n.id} className="flex flex-col items-start gap-1 p-3 cursor-pointer">
              <Link
                href={threadHref(n)}
                onClick={() => {
                  if (!n.read) markRead(n.id);
                }}
                className="w-full"
              >
                <div className="flex items-start justify-between gap-2 w-full">
                  <span className={`text-sm font-medium ${n.read ? "text-gray-600" : "text-gray-900"}`}>
                    {n.title}
                  </span>
                  <span className="text-[10px] text-gray-400 shrink-0">{formatChatTime(n.createdAt)}</span>
                </div>
                <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">{n.body}</p>
              </Link>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
