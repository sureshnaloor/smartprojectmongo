import type { Db } from "mongodb";

function resolveRole(email: string): "admin" | "user" {
  const adminEmails = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  // Local bypass account is admin so amendments can be tested without env setup
  if (email.toLowerCase() === "dev@example.com") return "admin";
  if (adminEmails.includes(email.toLowerCase())) return "admin";
  return "user";
}

export async function findOrCreateOAuthUser(
  db: Db,
  params: {
    email: string;
    name: string;
    provider: string;
    providerId: string;
    picture?: string | null;
  }
) {
  const role = resolveRole(params.email);
  const existingUser = await db.collection("users").findOne({ email: params.email });
  if (existingUser) {
    // Keep role in sync with ADMIN_EMAILS for existing accounts
    if (existingUser.role !== role) {
      await db.collection("users").updateOne(
        { id: existingUser.id },
        { $set: { role, updatedAt: new Date() } }
      );
      return { ...existingUser, role };
    }
    return existingUser;
  }

  const counter = await db
    .collection<{ _id: string; seq: number }>("counters")
    .findOneAndUpdate(
      { _id: "users" },
      { $inc: { seq: 1 } },
      { upsert: true, returnDocument: "after" }
    );

  const c = counter;
  const nextId = c?.seq ?? 1;

  const newUser = {
    id: nextId,
    email: params.email,
    name: params.name,
    ...(params.picture != null ? { picture: params.picture } : {}),
    provider: params.provider,
    providerId: params.providerId,
    role,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await db.collection("users").insertOne(newUser);
  return newUser;
}
