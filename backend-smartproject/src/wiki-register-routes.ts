import type { Express, Request, Response } from "express";
import {
  environmentalIncidents,
  insertWikiRecordSchema,
  safetyIncidents,
  safetyToolboxTalks,
  wikiOthers,
} from "./schema";
import { storage } from "./storage";

const WIKI_API_ROUTES: Record<string, string> = {
  "safety-incidents": safetyIncidents,
  "safety-toolbox-talk": safetyToolboxTalks,
  "environmental-incidents": environmentalIncidents,
  "wiki-others": wikiOthers,
};

export function registerWikiRecordRoutes(
  app: Express,
  handleError: (err: unknown, res: Response) => void
) {
  for (const [apiPath, collection] of Object.entries(WIKI_API_ROUTES)) {
    app.get(`/api/projects/:projectId/${apiPath}`, async (req: Request, res: Response) => {
      try {
        const projectId = parseInt(req.params.projectId);
        if (isNaN(projectId)) {
          return res.status(400).json({ message: "Invalid project ID" });
        }
        const data = await storage.getWikiRecords(collection, projectId);
        res.json(data ?? []);
      } catch (err) {
        handleError(err, res);
      }
    });

    app.post(`/api/projects/:projectId/${apiPath}`, async (req: Request, res: Response) => {
      try {
        const projectId = parseInt(req.params.projectId);
        if (isNaN(projectId)) {
          return res.status(400).json({ message: "Invalid project ID" });
        }
        const bodyWithId = { ...req.body, projectId };
        const entryData = insertWikiRecordSchema.parse(bodyWithId);
        const entry = await storage.createWikiRecord(collection, entryData);
        res.json(entry);
      } catch (err) {
        handleError(err, res);
      }
    });

    app.put(`/api/projects/:projectId/${apiPath}/:id`, async (req: Request, res: Response) => {
      try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
          return res.status(400).json({ message: "Invalid record ID" });
        }
        const updateData = insertWikiRecordSchema.partial().parse(req.body);
        const updated = await storage.updateWikiRecord(collection, id, updateData);
        if (!updated) {
          return res.status(404).json({ message: "Record not found" });
        }
        res.json(updated);
      } catch (err) {
        handleError(err, res);
      }
    });

    app.delete(`/api/projects/:projectId/${apiPath}/:id`, async (req: Request, res: Response) => {
      try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
          return res.status(400).json({ message: "Invalid record ID" });
        }
        await storage.deleteWikiRecord(collection, id);
        res.sendStatus(204);
      } catch (err) {
        handleError(err, res);
      }
    });
  }
}
