import {
  normalizeGymListPayload,
  normalizeJoinRequestPayload,
  normalizeMembershipPayload,
  type GymListItemDto,
  type GymMembershipDto,
  type JoinRequestListItemDto,
} from "@/lib/gym-contracts";

export type ServiceErrorReason = "unauthorized" | "forbidden" | "validation" | "unsupported" | "http_error" | "network_error";

export type ServiceSuccess<T> = {
  ok: true;
  data: T;
};

export type ServiceFailure = {
  ok: false;
  reason: ServiceErrorReason;
  status?: number;
  message?: string;
};

export type GymCreateField = "name" | "code";

export type AdminGymCreateValidationError = {
  fieldErrors: Partial<Record<GymCreateField, string>>;
  formError: string | null;
};

export type AdminGymCreateResult =
  | {
      ok: true;
      data: {
        id: string;
        name: string;
        code: string;
        activationCode: string;
      };
    }
  | {
      ok: false;
      status: number;
      error: AdminGymCreateValidationError;
    };

export type ServiceResult<T> = ServiceSuccess<T> | ServiceFailure;


export type GymServiceCapabilities = {
  supportsLeaveGym: boolean;
};

export const gymServiceCapabilities: GymServiceCapabilities = {
  supportsLeaveGym: false,
};

export type GymEndpointInventory = {
  endpoint: string;
  method: "GET" | "POST" | "PATCH" | "DELETE";
  exists: boolean;
  notes: string;
};

export const gymEndpointInventory: GymEndpointInventory[] = [
  {
    endpoint: "/api/gym/me",
    method: "GET",
    exists: true,
    notes: "Reads current gym membership.",
  },
  {
    endpoint: "/api/gyms/membership",
    method: "DELETE",
    exists: false,
    notes: "Leave gym is gated in FE and returns unsupported when backend does not expose the operation.",
  },
];
export type MembershipStatus = "NONE" | "PENDING" | "ACTIVE" | "REJECTED";

export type GymMembership = {
  status: MembershipStatus;
  gymId: string | null;
  gymName: string | null;
  role: string | null;
};

export type GymListItem = GymListItemDto;

export type JoinRequestListItem = JoinRequestListItemDto;

export type GymJoinRequest = {
  id: string;
  userName: string;
  email?: string;
};

export type GymMember = {
  id: string;
  name: string;
  email?: string;
  role?: string | null;
};

export type GymRole = "ADMIN" | "TRAINER" | "MEMBER";

const JSON_HEADERS = { "Content-Type": "application/json" };

function asString(value: unknown): string | null {
  if (typeof value === "string" && value.trim().length > 0) return value;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return null;
}

function normalize(value: string | null): string | null {
  return value ? value.trim().toUpperCase() : null;
}

type BffDataEnvelope<T> = {
  data: T;
};

type BffGymMembership = {
  state: MembershipStatus;
  gymId: string | null;
  gymName: string | null;
  role: string | null;
};

type BffGymListItem = {
  id: string;
  name: string;
};

type BffJoinRequest = {
  id: string;
  gymId?: string;
  gymName?: string;
  userId?: string;
  userName?: string;
  userEmail?: string;
  createdAt?: string;
};

type BffGymMember = {
  id: string;
  name: string;
  email?: string;
  role?: string | null;
};

function isMembershipStatus(value: unknown): value is MembershipStatus {
  return value === "NONE" || value === "PENDING" || value === "ACTIVE" || value === "REJECTED";
}

function unwrapDataEnvelope<T>(payload: T | BffDataEnvelope<T>): T {
  if (payload && typeof payload === "object" && "data" in (payload as Record<string, unknown>)) {
    return (payload as BffDataEnvelope<T>).data;
  }
  return payload as T;
}

async function readJsonResponse<T>(
  path: string,
  init?: RequestInit,
): Promise<ServiceResult<T>> {
  try {
    const response = await fetch(path, { cache: "no-store", credentials: "include", ...init });
    const payload = (await response.json().catch(() => null)) as unknown;
    const backendMessage = extractErrorMessage(payload);

    if (!response.ok) {
      if (response.status === 401) return { ok: false, reason: "unauthorized", status: 401, ...(backendMessage ? { message: backendMessage } : {}) };
      if (response.status === 403) return { ok: false, reason: "forbidden", status: 403, ...(backendMessage ? { message: backendMessage } : {}) };
      if (response.status === 400) return { ok: false, reason: "validation", status: 400, ...(backendMessage ? { message: backendMessage } : {}) };
      if (response.status === 404 || response.status === 405) {
        return { ok: false, reason: "unsupported", status: response.status, ...(backendMessage ? { message: backendMessage } : {}) };
      }
      return { ok: false, reason: "http_error", status: response.status, ...(backendMessage ? { message: backendMessage } : {}) };
    }

    const data = payload as T;
    return { ok: true, data };
  } catch (_err) {
    return { ok: false, reason: "network_error" };
  }
}

export function parseMembership(payload: BffGymMembership | BffDataEnvelope<BffGymMembership>): GymMembership {
  const membership = unwrapDataEnvelope(payload);
  const role = normalize(asString(membership.role));

  return {
    status: isMembershipStatus(membership.state) ? membership.state : "NONE",
    gymId: asString(membership.gymId),
    gymName: asString(membership.gymName),
    role,
  };
}

function parseGymMembers(payload: BffGymMember[] | BffDataEnvelope<BffGymMember[]>): GymMember[] {
  return unwrapDataEnvelope(payload).map((member) => ({
    id: member.id,
    name: member.name,
    ...(member.email ? { email: member.email } : {}),
    role: member.role ?? null,
  }));
}


function parseGymJoinRequests(payload: BffJoinRequest[] | BffDataEnvelope<BffJoinRequest[]>): GymJoinRequest[] {
  const parsed: GymJoinRequest[] = [];

  for (const item of parseJoinRequestList(payload)) {
    const id = asString(item.id);
    if (!id) continue;

    const email = asString(item.userEmail) ?? null;
    parsed.push({
      id,
      userName: asString(item.userName) ?? email ?? "-",
      ...(email ? { email } : {}),
    });
  }

  return parsed;
}


function parseGymList(payload: BffGymListItem[] | BffDataEnvelope<BffGymListItem[]>): GymListItem[] {
  return unwrapDataEnvelope(payload).map((gym) => ({ id: gym.id, name: gym.name }));
}

function parseJoinRequestList(payload: BffJoinRequest[] | BffDataEnvelope<BffJoinRequest[]>): JoinRequestListItem[] {
  return unwrapDataEnvelope(payload).map((request) => ({
    id: request.id,
    ...(request.gymId ? { gymId: request.gymId } : {}),
    ...(request.gymName ? { gymName: request.gymName } : {}),
    ...(request.userId ? { userId: request.userId } : {}),
    ...(request.userName ? { userName: request.userName } : {}),
    ...(request.userEmail ? { userEmail: request.userEmail } : {}),
    ...(request.createdAt ? { createdAt: request.createdAt } : {}),
  }));
}

export async function fetchMyGymMembership(): Promise<ServiceResult<GymMembership>> {
  const response = await readJsonResponse<BffGymMembership | BffDataEnvelope<BffGymMembership>>("/api/gym/me");
  if (!response.ok) return response;

  return { ok: true, data: parseMembership(response.data) };
}

export async function fetchGymsList(): Promise<ServiceResult<GymListItem[]>> {
  const response = await readJsonResponse<BffGymListItem[] | BffDataEnvelope<BffGymListItem[]>>("/api/gyms");
  if (!response.ok) return response;

  return { ok: true, data: parseGymList(response.data) };
}

export async function requestGymJoin(gymId: string): Promise<ServiceResult<null>> {
  const payload = JSON.stringify({ gymId });
  const primary = await readJsonResponse<unknown>("/api/gym/join-request", {
    method: "POST",
    headers: JSON_HEADERS,
    body: payload,
  });

  if (primary.ok) return { ok: true, data: null };
  if (primary.reason !== "unsupported") return primary;

  const legacy = await readJsonResponse<unknown>("/api/gyms/join", {
    method: "POST",
    headers: JSON_HEADERS,
    body: payload,
  });

  if (!legacy.ok) return legacy;
  return { ok: true, data: null };
}


export async function leaveGymMembership(): Promise<ServiceResult<null>> {
  if (!gymServiceCapabilities.supportsLeaveGym) {
    return { ok: false, reason: "unsupported", status: 405 };
  }

  const primary = await readJsonResponse<unknown>("/api/gym/me", {
    method: "DELETE",
    headers: JSON_HEADERS,
  });

  if (primary.ok) return { ok: true, data: null };
  if (primary.reason !== "unsupported") return primary;

  const legacy = await readJsonResponse<unknown>("/api/gyms/membership", {
    method: "DELETE",
    headers: JSON_HEADERS,
  });

  if (!legacy.ok) return legacy;
  return { ok: true, data: null };
}

export async function fetchPendingGymJoinRequests(): Promise<ServiceResult<JoinRequestListItem[]>> {
  const response = await readJsonResponse<BffJoinRequest[] | BffDataEnvelope<BffJoinRequest[]>>("/api/admin/gym-join-requests");
  if (!response.ok) return response;

  return { ok: true, data: parseJoinRequestList(response.data) };
}

// Compatibility exports used by gym/trainer client components.
export const parseGymMembership = parseMembership;
export const parseMembers = parseGymMembers;
export const parseJoinRequests = parseGymJoinRequests;

export async function fetchGymMembershipStatus(): Promise<Response> {
  return fetch("/api/gym/me", { cache: "no-store", credentials: "include" });
}

export async function fetchGymMembership(): Promise<Response> {
  return fetchGymMembershipStatus();
}

export async function fetchGymJoinRequests(): Promise<Response> {
  return fetch("/api/admin/gym-join-requests", { cache: "no-store", credentials: "include" });
}

export async function fetchGymMembers(gymId: string): Promise<Response> {
  return fetch(`/api/admin/gyms/${gymId}/members`, { cache: "no-store", credentials: "include" });
}

function asFirstError(value: unknown): string | null {
  if (!Array.isArray(value)) return null;
  for (const item of value) {
    if (typeof item === "string" && item.trim().length > 0) return item;
  }
  return null;
}

function parseGymCreateValidationError(payload: unknown): AdminGymCreateValidationError {
  const source = typeof payload === "object" && payload !== null ? (payload as Record<string, unknown>) : {};
  const details = typeof source.details === "object" && source.details !== null ? (source.details as Record<string, unknown>) : {};
  const fieldErrors =
    typeof details.fieldErrors === "object" && details.fieldErrors !== null
      ? (details.fieldErrors as Record<string, unknown>)
      : {};

  const nameError = asFirstError(fieldErrors.name);
  const codeError = asFirstError(fieldErrors.code);
  const formError = asFirstError(details.formErrors) ?? asString(source.message);

  return {
    fieldErrors: {
      ...(nameError ? { name: nameError } : {}),
      ...(codeError ? { code: codeError } : {}),
    },
    formError,
  };
}

function extractErrorMessage(payload: unknown): string | null {
  if (typeof payload === "string" && payload.trim().length > 0) return payload;
  if (!payload || typeof payload !== "object") return null;

  const source = payload as Record<string, unknown>;
  const directMessage = asString(source.message) ?? asString(source.error);
  if (directMessage) return directMessage;

  const details = typeof source.details === "object" && source.details !== null ? (source.details as Record<string, unknown>) : null;
  if (!details) return null;

  const detailMessage = asString(details.message) ?? asFirstError(details.formErrors);
  if (detailMessage) return detailMessage;

  const fieldErrors = typeof details.fieldErrors === "object" && details.fieldErrors !== null ? (details.fieldErrors as Record<string, unknown>) : null;
  if (!fieldErrors) return null;

  const nameError = asFirstError(fieldErrors.name);
  if (nameError) return nameError;
  const codeError = asFirstError(fieldErrors.code);
  if (codeError) return codeError;

  return null;
}

export async function createAdminGym(input: { name: string; code: string }): Promise<AdminGymCreateResult> {
  try {
    const response = await fetch("/api/admin/gyms", {
      method: "POST",
      headers: JSON_HEADERS,
      cache: "no-store",
      credentials: "include",
      body: JSON.stringify({
        name: input.name,
        code: input.code,
      }),
    });

    const payload = (await response.json().catch(() => null)) as unknown;

    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        error:
          response.status === 400
            ? parseGymCreateValidationError(payload)
            : { fieldErrors: {}, formError: extractErrorMessage(payload) },
      };
    }

    const created = typeof payload === "object" && payload !== null ? (payload as Record<string, unknown>) : {};
    return {
      ok: true,
      data: {
        id: asString(created.id) ?? "",
        name: asString(created.name) ?? "",
        code: asString(created.code) ?? "",
        activationCode: asString(created.activationCode) ?? "",
      },
    };
  } catch (_err) {
    return { ok: false, status: 0, error: { fieldErrors: {}, formError: null } };
  }
}

export async function reviewGymJoinRequest(
  membershipId: string,
  action: "accept" | "reject",
): Promise<ServiceResult<null>> {
  const response = await readJsonResponse<unknown>(`/api/admin/gym-join-requests/${membershipId}/${action}`, {
    method: "POST",
  });

  if (!response.ok) return response;
  return { ok: true, data: null };
}

export async function updateGymMemberRole(
  userId: string,
  role: Extract<GymRole, "TRAINER" | "MEMBER">,
): Promise<ServiceResult<null>> {
  const response = await readJsonResponse<unknown>(`/api/gym/admin/members/${userId}/role`, {
    method: "PATCH",
    headers: JSON_HEADERS,
    body: JSON.stringify({ role }),
  });

  if (!response.ok) return response;
  return { ok: true, data: null };
}


export async function leaveCurrentGym(): Promise<ServiceResult<null>> {
  const response = await readJsonResponse<unknown>("/api/gyms/membership", { method: "DELETE" });
  if (!response.ok) return response;
  return { ok: true, data: null };
}
