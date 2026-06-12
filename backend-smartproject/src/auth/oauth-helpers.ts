import type { Db } from "mongodb";

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
  const existingUser = await db.collection("users").findOne({ email: params.email });
  if (existingUser) {
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
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await db.collection("users").insertOne(newUser);
  return newUser;
}
