import { requestJson, type ServiceResult } from "@/lib/api/serviceResult";
import { extractTrainerClients, findTrainerClient, type TrainerClient } from "@/lib/trainerClients";

type UnknownRecord = Record<string, unknown>;

type TrainerClientsListPayload = {
  clients?: unknown[];
  data?: unknown;
};

export type TrainerClientDetail = TrainerClient & {
  lastLoginAt: string | null;
  role: string | null;
  plans?: unknown;
};

export type AssignTrainerPlanInput = {
  clientId: string;
  sourceTrainingPlanId: string;
};

export type AssignTrainerPlanResult = {
  assignment: unknown;
};

export type TrainerClientServiceCapabilities = {
  canListClients: boolean;
  canGetClientDetail: boolean;
  canAssignPlan: boolean;
  canUnassignPlan: boolean;
  canRemoveClient: boolean;
};

export const trainerClientServiceCapabilities: TrainerClientServiceCapabilities = {
  canListClients: true,
  canGetClientDetail: true,
  canAssignPlan: true,
  canUnassignPlan: false,
  canRemoveClient: false,
};

export type TrainerClientEndpointInventory = {
  endpoint: string;
  method: "GET" | "POST" | "DELETE";
  exists: boolean;
  notes: string;
};

export const trainerClientEndpointInventory: TrainerClientEndpointInventory[] = [
  {
    endpoint: "/api/trainer/clients",
    method: "GET",
    exists: true,
    notes: "List trainer clients through BFF proxy to backend /trainer/clients.",
  },
  {
    endpoint: "/api/trainer/clients/:id",
    method: "GET",
    exists: true,
    notes: "Get trainer client detail through BFF proxy to backend /trainer/clients/:id.",
  },
  {
    endpoint: "/api/trainer/assign-training-plan",
    method: "POST",
    exists: true,
    notes: "Assign plan through BFF; backend target /trainer/members/:id/training-plan-assignment.",
  },
  {
    endpoint: "/api/trainer/members/:id/training-plan-assignment",
    method: "DELETE",
    exists: false,
    notes: "Requiere implementación in BFF/backend contract to unassign a plan.",
  },
  {
    endpoint: "/api/trainer/clients/:id",
    method: "DELETE",
    exists: false,
    notes: "Requiere implementación in BFF/backend contract to remove trainer-client relationship.",
  },
];

function asRecord(value: unknown): UnknownRecord {
  return typeof value === "object" && value !== null ? (value as UnknownRecord) : {};
}

function asText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

export async function listTrainerClients(): Promise<ServiceResult<TrainerClient[]>> {
  const result = await requestJson<TrainerClientsListPayload>("/api/trainer/clients");
  if (!result.ok) return result;

  return {
    ok: true,
    data: extractTrainerClients(result.data),
  };
}

export async function getTrainerClientDetail(clientId: string): Promise<ServiceResult<TrainerClientDetail | null>> {
  const normalizedClientId = clientId.trim();
  if (!normalizedClientId) {
    return {
      ok: false,
      reason: "validation",
      status: 400,
      message: "Client id is required.",
      fieldErrors: { clientId: "Client id is required." },
    };
  }

  const result = await requestJson<unknown>(`/api/trainer/clients/${normalizedClientId}`);
  if (!result.ok) return result;

  const source = asRecord(result.data);
  const normalizedClient = findTrainerClient(result.data, normalizedClientId) ?? findTrainerClient({ clients: [source] }, normalizedClientId);
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

export async function assignTrainingPlanToTrainerClient(
  payload: AssignTrainerPlanInput,
): Promise<ServiceResult<AssignTrainerPlanResult>> {
  const clientId = payload.clientId.trim();
  const sourceTrainingPlanId = payload.sourceTrainingPlanId.trim();
  if (!clientId || !sourceTrainingPlanId) {
    return {
      ok: false,
      reason: "validation",
      status: 400,
      message: "Client and training plan are required.",
      fieldErrors: {
        ...(!clientId ? { clientId: "Client is required." } : {}),
        ...(!sourceTrainingPlanId ? { sourceTrainingPlanId: "Training plan is required." } : {}),
      },
    };
  }

  const result = await requestJson<unknown>("/api/trainer/assign-training-plan", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ clientId, sourceTrainingPlanId }),
  });

  if (!result.ok) return result;

  return {
    ok: true,
    data: {
      assignment: result.data,
    },
  };
}

export async function unassignTrainingPlanFromTrainerClient(): Promise<ServiceResult<null>> {
  return {
    ok: false,
    reason: "notSupported",
    status: 405,
    message: "Unassigning a trainer client's plan is not supported by the current API.",
  };
}

export async function removeTrainerClientRelationship(): Promise<ServiceResult<null>> {
  return {
    ok: false,
    reason: "notSupported",
    status: 405,
    message: "Removing a trainer-client relationship is not supported by the current API.",
  };
}

// Backward-compatible aliases for external imports.
export const assignTrainerPlan = assignTrainingPlanToTrainerClient;
export const unassignTrainerPlan = unassignTrainingPlanFromTrainerClient;
export const removeTrainerClient = removeTrainerClientRelationship;
