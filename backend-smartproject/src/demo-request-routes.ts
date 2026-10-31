import { Router, Request, Response, NextFunction } from "express";
import { ObjectId } from "mongodb";
import { db } from "./db";

const router = Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MAX_FIELD = 500;
const STATUSES = ["new", "contacted", "closed"] as const;
const INTERESTS = ["demo", "trial", "sales"] as const;

function clean(value: unknown): string {
  return typeof value === "string" ? value.trim().slice(0, MAX_FIELD) : "";
}

// Admin-only guard: full "admin" or the dedicated "demorequest-admin" role
const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  const role = (req.user as { role?: string } | undefined)?.role;
  if (role !== "admin" && role !== "demorequest-admin") {
    return res.status(403).json({ message: "Demo-request admin access required" });
  }
  next();
};

// POST /api/demo-requests — public lead-capture endpoint for the landing page
router.post("/", async (req: Request, res: Response) => {
  try {
    const name = clean(req.body?.name);
    const email = clean(req.body?.email).toLowerCase();
    const company = clean(req.body?.company);
    const teamSize = clean(req.body?.teamSize);
    const message = clean(req.body?.message);
    const rawInterest = clean(req.body?.interest);
    const interest = (INTERESTS as readonly string[]).includes(rawInterest) ? rawInterest : "demo";

    const errors: Record<string, string> = {};
    if (!name) errors.name = "Name is required";
    if (!email || !EMAIL_RE.test(email)) errors.email = "A valid work email is required";
    if (!company) errors.company = "Company is required";
    if (Object.keys(errors).length > 0) {
      return res.status(400).json({ message: "Validation failed", errors });
    }

    const doc = {
      name,
      email,
      company,
      teamSize,
      message,
      interest,
      source: "landing-page",
      status: "new",
      createdAt: new Date(),
    };

    const result = await db.collection("demoRequests").insertOne(doc);
    console.log(`Demo request captured: ${email} (${company})`);
    return res.status(201).json({ success: true, id: result.insertedId });
  } catch (err) {
    console.error("Failed to save demo request:", err);
    return res.status(500).json({ message: "Could not save your request. Please try again." });
  }
});

// GET /api/demo-requests — admin: list leads, optionally filtered by ?status=
router.get("/", requireAdmin, async (req: Request, res: Response) => {
  try {
    const status = clean(req.query.status);
    const query: Record<string, unknown> = {};
    if (status && (STATUSES as readonly string[]).includes(status)) {
      query.status = status;
    }
    const leads = await db
      .collection("demoRequests")
      .find(query)
      .sort({ createdAt: -1 })
      .limit(500)
      .toArray();
    return res.json(leads);
  } catch (err) {
    console.error("Failed to list demo requests:", err);
    return res.status(500).json({ message: "Could not load demo requests" });
  }
});

// PATCH /api/demo-requests/:id — admin: update status (and optional internal note)
router.patch("/:id", requireAdmin, async (req: Request, res: Response) => {
  try {
    if (!ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid id" });
    }
    const status = clean(req.body?.status);
    if (!status || !(STATUSES as readonly string[]).includes(status)) {
      return res.status(400).json({ message: `Status must be one of: ${STATUSES.join(", ")}` });
    }
    const update: Record<string, unknown> = { status };
    const note = clean(req.body?.note);
    if (note) update.note = note;
    update.updatedAt = new Date();

    const result = await db
      .collection("demoRequests")
      .findOneAndUpdate(
        { _id: new ObjectId(req.params.id) },
        { $set: update },
        { returnDocument: "after" }
      );
    if (!result) {
      return res.status(404).json({ message: "Demo request not found" });
    }
    return res.json(result);
  } catch (err) {
    console.error("Failed to update demo request:", err);
    return res.status(500).json({ message: "Could not update demo request" });
  }
});

// DELETE /api/demo-requests/:id — admin: remove a lead (e.g. spam)
router.delete("/:id", requireAdmin, async (req: Request, res: Response) => {
  try {
    if (!ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid id" });
    }
    const result = await db
      .collection("demoRequests")
      .deleteOne({ _id: new ObjectId(req.params.id) });
    if (result.deletedCount === 0) {
      return res.status(404).json({ message: "Demo request not found" });
    }
    return res.json({ success: true });
  } catch (err) {
    console.error("Failed to delete demo request:", err);
    return res.status(500).json({ message: "Could not delete demo request" });
  }
});

export default router;
