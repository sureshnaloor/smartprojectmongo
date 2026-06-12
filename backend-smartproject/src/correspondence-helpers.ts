import type { Express, Request, Response } from "express";
import type { Db } from "mongodb";
import { insertFileUploadRecord } from "./file-upload-helpers";

export type MailProvider = "outlook" | "gmail" | "other";

export interface MailTrailEntry {
  link: string;
  provider?: MailProvider;
  sentAt?: string;
  from?: string;
  to?: string;
  body?: string;
  addedAt: string;
}

export interface CorrespondenceThread {
  subject: string;
  description?: string;
  mailTrail: MailTrailEntry[];
  createdAt: string;
  updatedAt: string;
}

export type CorrespondenceStorageCategory =
  | "correspondence"
  | "supplier-correspondence"
  | "subcontract-correspondence"
  | "internal-correspondence";

function storagePrefix(projectId: number, category: CorrespondenceStorageCategory) {
  return `projects/${projectId}/${category}/`;
}

function normalizeMailTrailEntry(
  entry: {
    link?: string;
    provider?: string;
    sentAt?: string;
    from?: string;
    to?: string;
    body?: string;
  },
  fallbackLink?: string
): MailTrailEntry | null {
  const link = (entry.link || fallbackLink || "").trim();
  const body = entry.body ? String(entry.body).trim() : "";
  if (!link && !body) return null;
  const provider =
    entry.provider === "outlook" || entry.provider === "gmail" ? entry.provider : "other";
  return {
    link: link || "",
    provider,
    ...(entry.sentAt ? { sentAt: entry.sentAt } : {}),
    ...(entry.from ? { from: String(entry.from).trim() } : {}),
    ...(entry.to ? { to: String(entry.to).trim() } : {}),
    ...(body ? { body } : {}),
    addedAt: new Date().toISOString(),
  };
}

function parseCreateBody(body: Record<string, unknown>) {
  const subject = String(body.subject || body.name || "").trim();
  const description = String(body.description || "").trim();

  let mailTrail: MailTrailEntry[] = [];

  if (Array.isArray(body.mailTrail) && body.mailTrail.length > 0) {
    mailTrail = body.mailTrail
      .map((e) => normalizeMailTrailEntry(e as Record<string, unknown>))
      .filter((e): e is MailTrailEntry => e !== null);
  } else if (body.link) {
    const legacy = normalizeMailTrailEntry(
      {
        link: String(body.link),
        provider: body.provider as string | undefined,
        sentAt: body.sentAt as string | undefined,
        from: body.from as string | undefined,
      },
      String(body.link)
    );
    if (legacy) mailTrail = [legacy];
  }

  return { subject, description, mailTrail };
}

function buildThread(subject: string, description: string, mailTrail: MailTrailEntry[]): CorrespondenceThread {
  const now = new Date().toISOString();
  return {
    subject,
    description: description || undefined,
    mailTrail,
    createdAt: now,
    updatedAt: now,
  };
}

function threadToFileInfo(thread: CorrespondenceThread, uploadedBy: string) {
  const latest = thread.mailTrail[thread.mailTrail.length - 1];
  return {
    correspondenceName: thread.subject,
    description: thread.description || "",
    linkUrl: latest?.link || "",
    mailTrailCount: String(thread.mailTrail.length),
    uploadedBy,
  };
}

function legacyThreadFromFileInfo(fileInfo: Record<string, string | undefined>): CorrespondenceThread | null {
  const subject = fileInfo.correspondenceName || fileInfo.correspondencename;
  const link = fileInfo.linkUrl || fileInfo.linkurl;
  if (!subject || !link) return null;
  const now = new Date().toISOString();
  return {
    subject,
    description: fileInfo.description || undefined,
    mailTrail: [
      {
        link,
        provider: "other",
        addedAt: now,
      },
    ],
    createdAt: now,
    updatedAt: now,
  };
}

export async function readCorrespondenceThread(fileId: string): Promise<CorrespondenceThread | null> {
  const { downloadFile } = await import("./b2");
  const { data } = await downloadFile(fileId);
  try {
    const parsed = JSON.parse(data.toString("utf8")) as Record<string, unknown>;
    if (parsed.mailTrail && Array.isArray(parsed.mailTrail)) {
      return {
        subject: String(parsed.subject || parsed.name || ""),
        description: parsed.description ? String(parsed.description) : undefined,
        mailTrail: parsed.mailTrail as MailTrailEntry[],
        createdAt: String(parsed.createdAt || new Date().toISOString()),
        updatedAt: String(parsed.updatedAt || parsed.createdAt || new Date().toISOString()),
      };
    }
    if (parsed.link && parsed.name) {
      const entry = normalizeMailTrailEntry({ link: String(parsed.link) }, String(parsed.link));
      if (!entry) return null;
      const now = String(parsed.createdAt || new Date().toISOString());
      return {
        subject: String(parsed.name),
        description: parsed.description ? String(parsed.description) : undefined,
        mailTrail: [entry],
        createdAt: now,
        updatedAt: now,
      };
    }
  } catch {
    return null;
  }
  return null;
}

async function uploadCorrespondenceThread(
  database: Db,
  projectId: number,
  category: CorrespondenceStorageCategory,
  thread: CorrespondenceThread,
  uploadedByName: string,
  uploadedById: number | null,
  uploadedByEmail: string | null,
  existingFileName?: string
) {
  const { uploadFile } = await import("./b2");
  const fileName =
    existingFileName ||
    `${storagePrefix(projectId, category)}${Date.now()}_thread.json`;
  const fileContent = JSON.stringify(thread);
  const fileInfo = threadToFileInfo(thread, uploadedByName);
  const result = await uploadFile(
    fileName,
    Buffer.from(fileContent),
    "application/json",
    fileInfo
  );

  if (!existingFileName) {
    await insertFileUploadRecord(database, {
      projectId,
      category,
      fileName: result.fileName || fileName,
      originalName: "thread.json",
      displayName: thread.subject,
      description: thread.description,
      fileSize: Buffer.from(fileContent).length,
      contentType: "application/json",
      b2FileId: result.fileId,
      uploadedById,
      uploadedByName,
      uploadedByEmail,
    });
  }

  return result;
}

export function registerCorrespondenceRoutes(
  app: Express,
  database: Db,
  apiPath: string,
  category: CorrespondenceStorageCategory,
  handleError: (err: unknown, res: Response) => void
) {
  app.post(`/api/projects/:projectId/${apiPath}/create`, async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.projectId);
      if (isNaN(projectId)) {
        return res.status(400).json({ message: "Invalid project ID" });
      }

      const user = (req as any).user;
      const uploadedByName = user?.name || req.body.uploadedBy || "Unknown User";
      const uploadedById = user?.id || null;
      const uploadedByEmail = user?.email || null;

      const { subject, description, mailTrail } = parseCreateBody(req.body);

      if (!subject) {
        return res.status(400).json({ message: "Subject is required." });
      }
      if (mailTrail.length === 0) {
        return res.status(400).json({
          message: "At least one email with a link or message content is required.",
        });
      }

      const thread = buildThread(subject, description, mailTrail);
      const result = await uploadCorrespondenceThread(
        database,
        projectId,
        category,
        thread,
        uploadedByName,
        uploadedById,
        uploadedByEmail
      );

      res.status(201).json(result);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.post(`/api/projects/:projectId/${apiPath}/append`, async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.projectId);
      if (isNaN(projectId)) {
        return res.status(400).json({ message: "Invalid project ID" });
      }

      const { fileId, fileName, entry } = req.body as {
        fileId?: string;
        fileName?: string;
        entry?: Record<string, unknown>;
      };

      if (!fileId || !fileName || !entry) {
        return res.status(400).json({ message: "fileId, fileName, and entry are required." });
      }

      const newEntry = normalizeMailTrailEntry(entry);
      if (!newEntry) {
        return res.status(400).json({ message: "A valid email link is required." });
      }

      const user = (req as any).user;
      const uploadedByName = user?.name || req.body.uploadedBy || "Unknown User";

      let thread = await readCorrespondenceThread(fileId);
      if (!thread) {
        return res.status(404).json({ message: "Correspondence thread not found." });
      }

      thread = {
        ...thread,
        mailTrail: [...thread.mailTrail, newEntry],
        updatedAt: new Date().toISOString(),
      };

      const { deleteFile } = await import("./b2");
      await deleteFile(fileId, fileName);

      const result = await uploadCorrespondenceThread(
        database,
        projectId,
        category,
        thread,
        uploadedByName,
        user?.id || null,
        user?.email || null,
        fileName
      );

      res.status(200).json(result);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.get(`/api/projects/:projectId/${apiPath}/content`, async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.projectId);
      if (isNaN(projectId)) {
        return res.status(400).json({ message: "Invalid project ID" });
      }

      const fileId = req.query.fileId as string;
      if (!fileId) {
        return res.status(400).json({ message: "fileId is required" });
      }

      const thread = await readCorrespondenceThread(fileId);
      if (!thread) {
        return res.status(404).json({ message: "Thread content not found" });
      }

      res.json(thread);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.get(`/api/projects/:projectId/${apiPath}`, async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.projectId);
      if (isNaN(projectId)) {
        return res.status(400).json({ message: "Invalid project ID" });
      }

      const { listFiles } = await import("./b2");
      const prefix = storagePrefix(projectId, category);
      const files = await listFiles(prefix);

      res.json(files);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.delete(`/api/projects/:projectId/${apiPath}`, async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.projectId);
      if (isNaN(projectId)) {
        return res.status(400).json({ message: "Invalid project ID" });
      }

      const fileId = req.query.fileId as string;
      const fileName = req.query.fileName as string;

      if (!fileId || !fileName) {
        return res.status(400).json({ message: "fileId and fileName are required" });
      }

      const { deleteFile } = await import("./b2");
      await deleteFile(fileId, fileName);

      res.status(200).json({ message: "Correspondence deleted successfully" });
    } catch (err) {
      handleError(err, res);
    }
  });
}

export { legacyThreadFromFileInfo };
