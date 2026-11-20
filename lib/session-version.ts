import { getGFWLDatabase } from "@/lib/mongodb";
import { toObjectId } from "@/lib/mongo-sanitize";

export function getSessionVersion(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

export async function incrementSessionVersion(userId: string): Promise<void> {
  const objectId = toObjectId(userId);
  if (!objectId) {
    return;
  }

  const db = await getGFWLDatabase();
  await db.collection("users").updateOne(
    { _id: objectId },
    { $inc: { sessionVersion: 1 } }
  );
}
