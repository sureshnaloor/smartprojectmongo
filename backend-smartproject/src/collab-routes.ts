import type { Express, Request, Response } from "express";
import { z } from "zod";
import { db } from "./db";
import { storage } from "./storage";
import {
  collaborationThreads,
  collaborationMessages,
  projectCollaborationThreads,
  projectCollaborationMessages,
  collabCategoryEnum,
  collabCriticalityEnum,
  collabMentionSchema,
} from "./schema";

function parseViewerUserId(req: Request): number | undefined {
  const fromQuery = req.query.viewerUserId;
  if (fromQuery != null && !Array.isArray(fromQuery)) {
    const n = parseInt(String(fromQuery), 10);
    if (!Number.isNaN(n)) return n;
  }
  const user = req.user as { id?: number } | undefined;
  if (user?.id != null) return Number(user.id);
  const bodyUserId = (req.body as { viewerUserId?: number })?.viewerUserId;
  if (bodyUserId != null) return Number(bodyUserId);
  return undefined;
}

function messagePreview(content: string, max = 80): string {
  const text = content.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

function serializeDates<T extends Record<string, unknown>>(obj: T): T {
  const out = { ...obj };
  for (const key of Object.keys(out)) {
    const val = out[key];
    if (val instanceof Date) {
      (out as Record<string, unknown>)[key] = val.toISOString();
    }
  }
  return out;
}

const createThreadBodySchema = z.object({
  title: z.string().min(1),
  subject: z.string().optional(),
  category: collabCategoryEnum.optional(),
  type: collabCategoryEnum.optional(),
  criticality: collabCriticalityEnum.default("medium"),
  createdById: z.string(),
  createdByName: z.string(),
  isClosed: z.boolean().default(false),
  isPinned: z.boolean().default(false),
  expiryDays: z.number().int().positive().optional().nullable(),
  expiryDate: z.string().optional().nullable(),
  projectId: z.number().optional().nullable(),
});

const updateThreadBodySchema = z.object({
  title: z.string().optional(),
  subject: z.string().optional(),
  category: collabCategoryEnum.optional(),
  type: collabCategoryEnum.optional(),
  criticality: collabCriticalityEnum.optional(),
  isClosed: z.boolean().optional(),
  isPinned: z.boolean().optional(),
  expiryDays: z.number().int().positive().optional().nullable(),
  expiryDate: z.string().optional().nullable(),
});

const createMessageBodySchema = z.object({
  content: z.string().min(1),
  authorId: z.string(),
  authorName: z.string(),
  mentions: z.array(collabMentionSchema).optional().default([]),
});

export function registerCollabRoutes(
  app: Express,
  handleError: (err: unknown, res: Response) => void
) {
  // --- Global collaboration ---
  app.get("/api/collaboration/threads", async (req: Request, res: Response) => {
    try {
      const viewerUserId = parseViewerUserId(req);
      const threads = await storage.getGlobalCollabThreads({
        search: typeof req.query.search === "string" ? req.query.search : undefined,
        category: typeof req.query.type === "string" ? req.query.type : undefined,
        includeExpired: req.query.includeExpired === "true",
        viewerUserId,
      });
      res.json(threads.map((t) => serializeDates(t as Record<string, unknown>)));
    } catch (err) {
      handleError(err, res);
    }
  });

  app.get("/api/collaboration/threads/:projectId", async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.projectId, 10);
      if (Number.isNaN(projectId)) {
        return res.status(400).json({ message: "Invalid project ID" });
      }
      const viewerUserId = parseViewerUserId(req);
      const threads = await storage.getCollabThreads(
        collaborationThreads,
        collaborationMessages,
        { projectId },
        {
          search: typeof req.query.search === "string" ? req.query.search : undefined,
          category: typeof req.query.type === "string" ? req.query.type : undefined,
          includeExpired: req.query.includeExpired === "true",
          viewerUserId,
        }
      );
      res.json(threads.map((t) => serializeDates(t as Record<string, unknown>)));
    } catch (err) {
      handleError(err, res);
    }
  });

  app.post("/api/collaboration/threads", async (req: Request, res: Response) => {
    try {
      const body = createThreadBodySchema.parse(req.body);
      if (body.projectId) {
        const project = await storage.getProject(body.projectId);
        if (!project) return res.status(404).json({ message: "Project not found" });
      } else if (body.isPinned) {
        await storage.enforceGlobalPinLimit(collaborationThreads, 3);
      }
      const thread = await storage.createCollabThread(collaborationThreads, {
        ...body,
        projectId: body.projectId ?? null,
      });
      res.status(201).json(serializeDates(thread as Record<string, unknown>));
    } catch (err) {
      handleError(err, res);
    }
  });

  app.patch("/api/collaboration/threads/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (Number.isNaN(id)) return res.status(400).json({ message: "Invalid thread ID" });
      const body = updateThreadBodySchema.parse(req.body);
      if (body.isPinned === true) {
        await storage.enforceGlobalPinLimit(collaborationThreads, 3);
      }
      const updated = await storage.updateCollabThread(collaborationThreads, id, body);
      if (!updated) return res.status(404).json({ message: "Thread not found" });
      res.json(serializeDates(updated as Record<string, unknown>));
    } catch (err) {
      handleError(err, res);
    }
  });

  app.delete("/api/collaboration/threads/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (Number.isNaN(id)) return res.status(400).json({ message: "Invalid thread ID" });
      await storage.deleteCollabThread(collaborationThreads, collaborationMessages, id);
      res.status(204).end();
    } catch (err) {
      handleError(err, res);
    }
  });

  app.get("/api/collaboration/threads/:threadId/messages", async (req: Request, res: Response) => {
    try {
      const threadId = parseInt(req.params.threadId, 10);
      if (Number.isNaN(threadId)) return res.status(400).json({ message: "Invalid thread ID" });
      const thread = await storage.getCollabThread(collaborationThreads, threadId);
      if (!thread) return res.status(404).json({ message: "Thread not found" });
      const messages = await storage.getCollabMessages(collaborationMessages, threadId);
      res.json(messages.map((m) => serializeDates(m as Record<string, unknown>)));
    } catch (err) {
      handleError(err, res);
    }
  });

  app.post("/api/collaboration/threads/:threadId/messages", async (req: Request, res: Response) => {
    try {
      const threadId = parseInt(req.params.threadId, 10);
      if (Number.isNaN(threadId)) return res.status(400).json({ message: "Invalid thread ID" });
      const thread = await storage.getCollabThread(collaborationThreads, threadId);
      if (!thread) return res.status(404).json({ message: "Thread not found" });
      const body = createMessageBodySchema.parse(req.body);
      const message = await storage.createCollabMessage(
        collaborationThreads,
        collaborationMessages,
        threadId,
        { ...body, threadId }
      );
      for (const mention of body.mentions || []) {
        await storage.createCollabNotification({
          userId: mention.userId,
          projectId: thread.projectId ?? null,
          threadId,
          messageId: message.id,
          type: "mention",
          title: `${body.authorName} mentioned you`,
          body: messagePreview(body.content),
          read: false,
        });
      }
      res.status(201).json(serializeDates(message as Record<string, unknown>));
    } catch (err) {
      handleError(err, res);
    }
  });

  app.delete("/api/collaboration/messages/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (Number.isNaN(id)) return res.status(400).json({ message: "Invalid message ID" });
      await db.collection(collaborationMessages).deleteOne({ id });
      res.status(204).end();
    } catch (err) {
      handleError(err, res);
    }
  });

  // --- Project collaboration ---
  app.get("/api/projects/:projectId/collaboration/threads", async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.projectId, 10);
      if (Number.isNaN(projectId)) return res.status(400).json({ message: "Invalid project ID" });
      const viewerUserId = parseViewerUserId(req);
      const threads = await storage.getProjectCollabThreads(projectId, {
        search: typeof req.query.search === "string" ? req.query.search : undefined,
        category: typeof req.query.type === "string" ? req.query.type : undefined,
        includeExpired: req.query.includeExpired === "true",
        viewerUserId,
      });
      res.json(threads.map((t) => serializeDates(t as Record<string, unknown>)));
    } catch (err) {
      handleError(err, res);
    }
  });

  app.post("/api/projects/:projectId/collaboration/threads", async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.projectId, 10);
      if (Number.isNaN(projectId)) return res.status(400).json({ message: "Invalid project ID" });
      const project = await storage.getProject(projectId);
      if (!project) return res.status(404).json({ message: "Project not found" });

      const body = createThreadBodySchema.parse({ ...req.body, projectId });
      if (body.isPinned) {
        await storage.enforcePinLimit(projectCollaborationThreads, projectId, 3);
      }
      const thread = await storage.createCollabThread(projectCollaborationThreads, {
        ...body,
        projectId,
      });
      res.status(201).json(serializeDates(thread as Record<string, unknown>));
    } catch (err) {
      handleError(err, res);
    }
  });

  app.patch("/api/projects/:projectId/collaboration/threads/:id", async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.projectId, 10);
      const id = parseInt(req.params.id, 10);
      if (Number.isNaN(projectId) || Number.isNaN(id)) {
        return res.status(400).json({ message: "Invalid project or thread ID" });
      }
      const body = updateThreadBodySchema.parse(req.body);
      if (body.isPinned === true) {
        await storage.enforcePinLimit(projectCollaborationThreads, projectId, 3);
      }
      const updated = await storage.updateCollabThread(projectCollaborationThreads, id, body);
      if (!updated) return res.status(404).json({ message: "Thread not found" });
      res.json(serializeDates(updated as Record<string, unknown>));
    } catch (err) {
      handleError(err, res);
    }
  });

  app.delete("/api/projects/:projectId/collaboration/threads/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (Number.isNaN(id)) return res.status(400).json({ message: "Invalid thread ID" });
      await storage.deleteCollabThread(
        projectCollaborationThreads,
        projectCollaborationMessages,
        id
      );
      res.status(204).end();
    } catch (err) {
      handleError(err, res);
    }
  });

  app.get(
    "/api/projects/:projectId/collaboration/threads/:threadId/messages",
    async (req: Request, res: Response) => {
      try {
        const threadId = parseInt(req.params.threadId, 10);
        if (Number.isNaN(threadId)) return res.status(400).json({ message: "Invalid thread ID" });
        const messages = await storage.getCollabMessages(projectCollaborationMessages, threadId);
        res.json(messages.map((m) => serializeDates(m as Record<string, unknown>)));
      } catch (err) {
        handleError(err, res);
      }
    }
  );

  app.post(
    "/api/projects/:projectId/collaboration/threads/:threadId/messages",
    async (req: Request, res: Response) => {
      try {
        const projectId = parseInt(req.params.projectId, 10);
        const threadId = parseInt(req.params.threadId, 10);
        if (Number.isNaN(projectId) || Number.isNaN(threadId)) {
          return res.status(400).json({ message: "Invalid project or thread ID" });
        }
        const thread = await storage.getCollabThread(projectCollaborationThreads, threadId);
        if (!thread) return res.status(404).json({ message: "Thread not found" });

        const body = createMessageBodySchema.parse(req.body);
        const message = await storage.createCollabMessage(
          projectCollaborationThreads,
          projectCollaborationMessages,
          threadId,
          { ...body, threadId }
        );

        const preview = messagePreview(body.content);
        for (const mention of body.mentions || []) {
          if (mention.userId === parseInt(body.authorId, 10)) continue;
          await storage.createCollabNotification({
            userId: mention.userId,
            projectId,
            threadId,
            messageId: message.id,
            type: "mention",
            title: `${body.authorName} mentioned you in ${thread.subject || thread.title}`,
            body: preview,
            read: false,
          });
        }

        res.status(201).json(serializeDates(message as Record<string, unknown>));
      } catch (err) {
        handleError(err, res);
      }
    }
  );

  app.post(
    "/api/projects/:projectId/collaboration/threads/:threadId/read",
    async (req: Request, res: Response) => {
      try {
        const threadId = parseInt(req.params.threadId, 10);
        const userId = parseViewerUserId(req) ?? parseInt(String(req.body?.userId), 10);
        if (Number.isNaN(threadId) || userId == null || Number.isNaN(userId)) {
          return res.status(400).json({ message: "Invalid thread or user ID" });
        }
        await storage.markCollabThreadRead(projectCollaborationMessages, threadId, userId);
        res.json({ ok: true });
      } catch (err) {
        handleError(err, res);
      }
    }
  );

  app.delete("/api/projects/:projectId/collaboration/messages/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (Number.isNaN(id)) return res.status(400).json({ message: "Invalid message ID" });
      await db.collection(projectCollaborationMessages).deleteOne({ id });
      res.status(204).end();
    } catch (err) {
      handleError(err, res);
    }
  });

  // --- Mention users & notifications ---
  app.get("/api/collaboration/mentionable-users", async (_req: Request, res: Response) => {
    try {
      const users = await storage.getMentionableUsers();
      res.json(users);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.get("/api/collaboration/notifications", async (req: Request, res: Response) => {
    try {
      const userId = parseViewerUserId(req);
      if (userId == null) return res.status(400).json({ message: "userId required" });
      const projectId =
        req.query.projectId != null ? parseInt(String(req.query.projectId), 10) : undefined;
      const notifications = await storage.getCollabNotifications(
        userId,
        projectId != null && !Number.isNaN(projectId) ? projectId : undefined
      );
      res.json(notifications.map((n) => serializeDates(n as Record<string, unknown>)));
    } catch (err) {
      handleError(err, res);
    }
  });

  app.patch("/api/collaboration/notifications/:id/read", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      const userId = parseViewerUserId(req);
      if (Number.isNaN(id) || userId == null) {
        return res.status(400).json({ message: "Invalid notification or user ID" });
      }
      await storage.markCollabNotificationRead(id, userId);
      res.json({ ok: true });
    } catch (err) {
      handleError(err, res);
    }
  });
}
