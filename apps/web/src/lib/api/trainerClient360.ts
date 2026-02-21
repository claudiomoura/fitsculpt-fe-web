import { requestJson, type ServiceResult } from "@/lib/api/serviceResult";
import { findTrainerClient, type TrainerClient } from "@/lib/trainerClients";

type UnknownRecord = Record<string, unknown>;

type TrainerClientDetailPayload = UnknownRecord;
type TrainerClientNotePayload = UnknownRecord;

type TrainerClientNotesListPayload = {
  items?: unknown;
  notes?: unknown;
  data?: unknown;
};

export type TrainerClient360Detail = TrainerClient & {
  lastLoginAt: string | null;
  role: string | null;
  plans?: unknown;
};

export type TrainerClientInternalNote = {
  id: string;
  content: string;
  createdAt: string;
  raw: UnknownRecord;
};

export type CreateTrainerClientInternalNoteInput = {
  clientId: string;
  content: string;
};

export type AssignTrainerClientPlanInput = {
  clientId: string;
  trainingPlanId: string;
};

export type AssignTrainerClientPlanResult = {
  assignment: unknown;
};

export const trainerClient360EndpointInventory = {
  detail: { path: "/api/trainer/clients/:id", exists: true },
  listNotes: { path: "/api/trainer/clients/:id/notes", exists: false },
  createNote: { path: "/api/trainer/clients/:id/notes", exists: false },
  assignPlan: { path: "/api/trainer/clients/:id/assigned-plan", exists: true },
} as const;

function asRecord(value: unknown): UnknownRecord {
  return typeof value === "object" && value !== null ? (value as UnknownRecord) : {};
}

function asText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function asIdentifier(value: unknown): string | null {
  if (typeof value === "string") return asText(value);
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return null;
}

function notAvailable(status = 404): ServiceResult<never> {
  return {
    ok: false,
    reason: "notSupported",
    status,
    message: "NOT_AVAILABLE",
  };
}

function normalizeClientNote(source: unknown): TrainerClientInternalNote | null {
  const record = asRecord(source);
  const id = asIdentifier(record.id) ?? asIdentifier(record.noteId) ?? asIdentifier(record._id);
  const content = asText(record.content) ?? asText(record.note) ?? asText(record.text);
  const createdAt = asText(record.createdAt) ?? asText(record.created_at) ?? asText(record.date);

  if (!id || !content || !createdAt) return null;

  return {
    id,
    content,
    createdAt,
    raw: record,
  };
}

function extractNotes(payload: TrainerClientNotesListPayload): TrainerClientInternalNote[] {
  const candidates: unknown[] = [];
  if (Array.isArray(payload.items)) candidates.push(...payload.items);
  if (Array.isArray(payload.notes)) candidates.push(...payload.notes);

  const dataRecord = asRecord(payload.data);
  if (Array.isArray(dataRecord.items)) candidates.push(...dataRecord.items);
  if (Array.isArray(dataRecord.notes)) candidates.push(...dataRecord.notes);

  return candidates.map(normalizeClientNote).filter((note): note is TrainerClientInternalNote => Boolean(note));
}

export async function getTrainerClient360Detail(clientId: string): Promise<ServiceResult<TrainerClient360Detail | null>> {
  const normalizedClientId = clientId.trim();
  if (!normalizedClientId) {
    return {
      ok: false,
      reason: "validation",
      status: 400,
      message: "CLIENT_ID_REQUIRED",
      fieldErrors: { clientId: "CLIENT_ID_REQUIRED" },
    };
  }

  const result = await requestJson<TrainerClientDetailPayload>(`/api/trainer/clients/${normalizedClientId}`);
  if (!result.ok) return result;

  const source = asRecord(result.data);
  const normalizedClient =
    findTrainerClient(result.data, normalizedClientId) ?? findTrainerClient({ clients: [source] }, normalizedClientId);

  if (!normalizedClient) return { ok: true, data: null };

  return {
    ok: true,
    data: {
      ...normalizedClient,
      lastLoginAt: asText(source.lastLoginAt),
      role: asText(source.role),
      plans: source.plans,
    },
  };
}

export async function listTrainerClientInternalNotes(clientId: string): Promise<ServiceResult<TrainerClientInternalNote[]>> {
  const normalizedClientId = clientId.trim();
  if (!normalizedClientId) {
    return {
      ok: false,
      reason: "validation",
      status: 400,
      message: "CLIENT_ID_REQUIRED",
      fieldErrors: { clientId: "CLIENT_ID_REQUIRED" },
    };
  }

  if (!trainerClient360EndpointInventory.listNotes.exists) return notAvailable();

  const result = await requestJson<TrainerClientNotesListPayload>(`/api/trainer/clients/${normalizedClientId}/notes`);
  if (!result.ok) return result;

  return { ok: true, data: extractNotes(result.data) };
}

export async function createTrainerClientInternalNote(
  payload: CreateTrainerClientInternalNoteInput,
): Promise<ServiceResult<TrainerClientInternalNote>> {
  const clientId = payload.clientId.trim();
  const content = payload.content.trim();

  if (!clientId || !content) {
    return {
      ok: false,
      reason: "validation",
      status: 400,
      message: "INVALID_NOTE_PAYLOAD",
      fieldErrors: {
        ...(!clientId ? { clientId: "CLIENT_ID_REQUIRED" } : {}),
        ...(!content ? { content: "CONTENT_REQUIRED" } : {}),
      },
    };
  }

  if (!trainerClient360EndpointInventory.createNote.exists) return notAvailable();

  const result = await requestJson<TrainerClientNotePayload>(`/api/trainer/clients/${clientId}/notes`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ content }),
  });
  if (!result.ok) return result;

  const normalized = normalizeClientNote(result.data);
  if (!normalized) {
    return {
      ok: false,
      reason: "invalidResponse",
      message: "INVALID_NOTE_RESPONSE",
    };
  }

  return { ok: true, data: normalized };
}

export async function assignPlanToTrainerClient360(
  payload: AssignTrainerClientPlanInput,
): Promise<ServiceResult<AssignTrainerClientPlanResult>> {
  const clientId = payload.clientId.trim();
  const trainingPlanId = payload.trainingPlanId.trim();

  if (!clientId || !trainingPlanId) {
    return {
      ok: false,
      reason: "validation",
      status: 400,
      message: "INVALID_ASSIGNMENT_PAYLOAD",
      fieldErrors: {
        ...(!clientId ? { clientId: "CLIENT_ID_REQUIRED" } : {}),
        ...(!trainingPlanId ? { trainingPlanId: "TRAINING_PLAN_ID_REQUIRED" } : {}),
      },
    };
  }

  const result = await requestJson<unknown>(`/api/trainer/clients/${clientId}/assigned-plan`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ trainingPlanId }),
  });
  if (!result.ok) return result;

  return { ok: true, data: { assignment: result.data } };
}
