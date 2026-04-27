import crypto from "node:crypto";
import { toPersistenceState } from "./bodyFatScanService.js";
import type { BodyFatScanResponse } from "./bodyFatScanSchemas.js";

type BodyFatScanPersistenceRecord = {
  id: string;
  capability: "body-scan";
  executionStatus: "completed" | "fallback";
  origin: string;
  state: "ready" | "low_confidence" | "insufficient_data";
  confidence: "low" | "medium" | "high";
  createdAt: string;
  updatedAt: string;
};

type StoredBodyFatScanRecord = BodyFatScanPersistenceRecord & {
  payload: BodyFatScanResponse;
};

type UserProfileRow = {
  tracking?: unknown;
};

type UserProfileModel = {
  findUnique?: (args: { where: { userId: string } }) => Promise<UserProfileRow | null>;
  create?: (args: { data: { userId: string; tracking: unknown; profile?: unknown } }) => Promise<unknown>;
  update?: (args: { where: { userId: string }; data: { tracking: unknown } }) => Promise<unknown>;
};

type PrismaLike = {
  userProfile?: UserProfileModel;
};

type SaveBodyFatScanPayload = {
  userId: string;
  origin: string;
  payload: BodyFatScanResponse;
};

type SaveBodyFatScanResult = {
  adapter: "tracking_json" | "memory";
  record: BodyFatScanPersistenceRecord;
};

type MemoryStore = Map<string, StoredBodyFatScanRecord[]>;

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function normalizeStoredRecords(value: unknown): StoredBodyFatScanRecord[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => {
      const record = asRecord(entry);
      if (!record) return null;
      const id = typeof record.id === "string" ? record.id : null;
      const createdAt = typeof record.createdAt === "string" ? record.createdAt : null;
      const updatedAt = typeof record.updatedAt === "string" ? record.updatedAt : null;
      const origin = typeof record.origin === "string" ? record.origin : null;
      const executionStatus =
        record.executionStatus === "completed" || record.executionStatus === "fallback"
          ? record.executionStatus
          : null;
      const confidence =
        record.confidence === "low" || record.confidence === "medium" || record.confidence === "high"
          ? record.confidence
          : null;
      const state =
        record.state === "ready" || record.state === "low_confidence" || record.state === "insufficient_data"
          ? record.state
          : null;
      const payload = asRecord(record.payload) as BodyFatScanResponse | null;
      if (!id || !createdAt || !updatedAt || !origin || !executionStatus || !confidence || !state || !payload) {
        return null;
      }

      return {
        id,
        capability: "body-scan" as const,
        executionStatus,
        origin,
        state,
        confidence,
        createdAt,
        updatedAt,
        payload,
      };
    })
    .filter((entry): entry is StoredBodyFatScanRecord => entry !== null);
}

function createRecord(args: SaveBodyFatScanPayload): StoredBodyFatScanRecord {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    capability: "body-scan",
    executionStatus: args.payload.executionStatus === "fallback" ? "fallback" : "completed",
    origin: args.origin,
    state: toPersistenceState(args.payload.confidence),
    confidence: args.payload.confidence,
    createdAt: now,
    updatedAt: now,
    payload: args.payload,
  };
}

function toPersistenceRecord(record: StoredBodyFatScanRecord): BodyFatScanPersistenceRecord {
  return {
    id: record.id,
    capability: record.capability,
    executionStatus: record.executionStatus,
    origin: record.origin,
    state: record.state,
    confidence: record.confidence,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

function appendToTracking(tracking: unknown, record: StoredBodyFatScanRecord): unknown {
  const trackingRecord = asRecord(tracking) ?? {};
  const existing = normalizeStoredRecords(trackingRecord.aiBodyFatScans);
  const next = [record, ...existing].slice(0, 30);
  return {
    ...trackingRecord,
    aiBodyFatScans: next,
  };
}

export const BODY_FAT_SCAN_PERSISTENCE_FOLLOW_UP =
  "Migrate tracking.aiBodyFatScans JSON snapshots to a dedicated table when migration window is available.";

export function createBodyFatScanRepository(params: { prisma?: PrismaLike }) {
  const memoryStore: MemoryStore = new Map();

  async function saveToMemory(payload: SaveBodyFatScanPayload): Promise<SaveBodyFatScanResult> {
    const record = createRecord(payload);
    const current = memoryStore.get(payload.userId) ?? [];
    memoryStore.set(payload.userId, [record, ...current].slice(0, 30));
    return {
      adapter: "memory",
      record: toPersistenceRecord(record),
    };
  }

  async function save(payload: SaveBodyFatScanPayload): Promise<SaveBodyFatScanResult> {
    const userProfile = params.prisma?.userProfile;
    if (!userProfile?.findUnique || !userProfile?.create || !userProfile?.update) {
      return saveToMemory(payload);
    }

    const record = createRecord(payload);
    try {
      const existing = await userProfile.findUnique({ where: { userId: payload.userId } });
      if (!existing) {
        await userProfile.create({
          data: {
            userId: payload.userId,
            tracking: appendToTracking({}, record),
          },
        });
      } else {
        await userProfile.update({
          where: { userId: payload.userId },
          data: {
            tracking: appendToTracking(existing.tracking, record),
          },
        });
      }

      return {
        adapter: "tracking_json",
        record: toPersistenceRecord(record),
      };
    } catch {
      return saveToMemory(payload);
    }
  }

  return {
    save,
  };
}

export type {
  BodyFatScanPersistenceRecord,
  SaveBodyFatScanPayload,
  SaveBodyFatScanResult,
};
