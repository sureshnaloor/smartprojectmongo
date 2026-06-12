import type { Db } from "mongodb";
import { fileUploads } from "./schema";

export interface FileUploadRecordInput {
  projectId: number;
  category: string;
  fileName: string;
  originalName: string;
  displayName?: string | null;
  description?: string | null;
  fileSize?: number | null;
  contentType?: string | null;
  b2FileId?: string | null;
  uploadedById?: number | null;
  uploadedByName: string;
  uploadedByEmail?: string | null;
}

/** Persist upload metadata in MongoDB (listing still comes from B2 by path prefix). */
export async function insertFileUploadRecord(db: Db, data: FileUploadRecordInput) {
  const counter = await db
    .collection<{ _id: string; seq: number }>("counters")
    .findOneAndUpdate(
      { _id: fileUploads },
      { $inc: { seq: 1 } },
      { upsert: true, returnDocument: "after" }
    );

  const id = counter?.seq ?? 1;
  const now = new Date();
  const doc = { id, ...data, createdAt: now, updatedAt: now };
  await db.collection(fileUploads).insertOne(doc);
  return doc;
}
