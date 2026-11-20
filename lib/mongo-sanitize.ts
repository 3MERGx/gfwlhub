import { ObjectId } from "mongodb";
import {
  CORRECTION_FIELDS,
  GAME_UPDATE_FIELDS,
  type CorrectionField,
  type GameUpdateField,
} from "@/types/crowdsource";

const CORRECTION_FIELD_SET = new Set<string>(CORRECTION_FIELDS);
const GAME_UPDATE_FIELD_SET = new Set<string>(GAME_UPDATE_FIELDS);

export function isSafeMongoKey(key: string): boolean {
  return Boolean(key) && !key.startsWith("$") && !key.includes(".");
}

export function isCorrectionField(field: string): field is CorrectionField {
  return isSafeMongoKey(field) && CORRECTION_FIELD_SET.has(field);
}

export function isGameUpdateField(field: string): field is GameUpdateField {
  return isSafeMongoKey(field) && GAME_UPDATE_FIELD_SET.has(field);
}

const OBJECT_ID_HEX = /^[a-fA-F0-9]{24}$/;

export function toObjectId(id: unknown): ObjectId | null {
  if (id instanceof ObjectId) {
    return id;
  }
  if (typeof id !== "string" || !OBJECT_ID_HEX.test(id)) {
    return null;
  }
  return new ObjectId(id);
}

export function mustObjectId(id: string | undefined | null): ObjectId {
  const objectId = toObjectId(id);
  if (!objectId) {
    throw new Error("Invalid ID");
  }
  return objectId;
}

export function toObjectIds(ids: string[]): ObjectId[] {
  return ids
    .map((id) => toObjectId(id))
    .filter((id): id is ObjectId => id !== null);
}

function isSafeMongoValue(value: unknown): boolean {
  if (value === null || typeof value === "string" || typeof value === "boolean") {
    return true;
  }
  if (Array.isArray(value)) {
    return value.every((item) => typeof item === "string");
  }
  return false;
}

export function pickAllowedGameFields(
  data: Record<string, unknown>
): Partial<Record<GameUpdateField, unknown>> {
  const out: Partial<Record<GameUpdateField, unknown>> = {};
  for (const [key, value] of Object.entries(data)) {
    if (!isGameUpdateField(key) || value === undefined || value === null) {
      continue;
    }
    if (value === "") {
      continue;
    }
    if (!isSafeMongoValue(value)) {
      continue;
    }
    out[key] = value;
  }
  return out;
}
