export type ServiceErrorReason = "unauthorized" | "unsupported" | "http_error" | "network_error";

export type ServiceSuccess<T> = {
  ok: true;
  data: T;
};

export type ServiceFailure = {
  ok: false;
  reason: ServiceErrorReason;
  status?: number;
};

export type ServiceResult<T> = ServiceSuccess<T> | ServiceFailure;

export type MembershipStatus = "NONE" | "PENDING" | "ACTIVE" | "REJECTED" | "UNKNOWN";

export type GymMembership = {
  status: MembershipStatus;
  gymId: string | null;
  gymName: string | null;
  role: string | null;
};

export type GymListItem = {
  id: string;
  name: string;
};

export type JoinRequestListItem = {
  id: string;
  gymId?: string;
  gymName?: string;
  userId?: string;
  userName?: string;
  userEmail?: string;
  createdAt?: string;
};

const JSON_HEADERS = { "Content-Type": "application/json" };

function asString(value: unknown): string | null {
  if (typeof value === "string" && value.trim().length > 0) return value;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return null;
}

function normalize(value: string | null): string | null {
  return value ? value.trim().toUpperCase() : null;
}

async function readJsonResponse<T>(
  path: string,
  init?: RequestInit,
): Promise<ServiceResult<T>> {
  try {
    const response = await fetch(path, { cache: "no-store", credentials: "include", ...init });
    if (!response.ok) {
      if (response.status === 401) return { ok: false, reason: "unauthorized", status: 401 };
      if (response.status === 404 || response.status === 405) return { ok: false, reason: "unsupported", status: response.status };
      return { ok: false, reason: "http_error", status: response.status };
    }

    const data = (await response.json()) as T;
    return { ok: true, data };
  } catch {
    return { ok: false, reason: "network_error" };
  }
}

function parseMembership(payload: unknown): GymMembership {
  const source = typeof payload === "object" && payload !== null ? (payload as Record<string, unknown>) : {};
  const data = typeof source.data === "object" && source.data !== null ? (source.data as Record<string, unknown>) : source;
  const gym = typeof data.gym === "object" && data.gym !== null ? (data.gym as Record<string, unknown>) : null;

  const rawStatus = normalize(asString(data.state) ?? asString(data.status));
  const status: MembershipStatus =
    rawStatus === "NONE" || rawStatus === "PENDING" || rawStatus === "ACTIVE" || rawStatus === "REJECTED" ? rawStatus : "UNKNOWN";

  return {
    status,
    gymId: asString(data.gymId) ?? asString(data.tenantId) ?? asString(gym?.id),
    gymName: asString(data.gymName) ?? asString(data.tenantName) ?? asString(gym?.name),
    role: normalize(asString(data.role)),
  };
}

function parseGymList(payload: unknown): GymListItem[] {
  const source = typeof payload === "object" && payload !== null ? (payload as Record<string, unknown>) : {};
  const items = Array.isArray(source.data) ? source.data : Array.isArray(source.gyms) ? source.gyms : Array.isArray(payload) ? payload : [];

  return items
    .map((entry) => {
      const row = typeof entry === "object" && entry !== null ? (entry as Record<string, unknown>) : {};
      const id = asString(row.id) ?? asString(row.gymId);
      const name = asString(row.name) ?? asString(row.gymName);
      if (!id || !name) return null;
      return { id, name };
    })
    .filter((entry): entry is GymListItem => Boolean(entry));
}

function parseJoinRequestList(payload: unknown): JoinRequestListItem[] {
  if (!payload || typeof payload !== "object") return [];

  const source = payload as Record<string, unknown>;
  const items = Array.isArray(source.items)
    ? source.items
    : Array.isArray(source.requests)
      ? source.requests
      : Array.isArray(source.data)
        ? source.data
        : Array.isArray(payload)
          ? payload
          : [];

  const parsed: JoinRequestListItem[] = [];

  for (const entry of items) {
    if (!entry || typeof entry !== "object") continue;

    const row = entry as Record<string, unknown>;
    const gym = (row.gym as Record<string, unknown> | undefined) ?? undefined;
    const user = (row.user as Record<string, unknown> | undefined) ?? undefined;
    const id = asString(row.id) ?? asString(row.membershipId);
    if (!id) continue;

    parsed.push({
      id,
      gymId: asString(row.gymId) ?? asString(gym?.id) ?? undefined,
      gymName: asString(row.gymName) ?? asString(gym?.name) ?? undefined,
      userId: asString(row.userId) ?? asString(user?.id) ?? undefined,
      userName: asString(row.userName) ?? asString(user?.name) ?? undefined,
      userEmail: asString(row.userEmail) ?? asString(user?.email) ?? undefined,
      createdAt: asString(row.createdAt) ?? undefined,
    });
  }

  return parsed;
}

export async function fetchMyGymMembership(): Promise<ServiceResult<GymMembership>> {
  const response = await readJsonResponse<unknown>("/api/gym/me");
  if (!response.ok) return response;

  return { ok: true, data: parseMembership(response.data) };
}

export async function fetchGymsList(): Promise<ServiceResult<GymListItem[]>> {
  const response = await readJsonResponse<unknown>("/api/gyms");
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

export async function fetchPendingGymJoinRequests(): Promise<ServiceResult<JoinRequestListItem[]>> {
  const response = await readJsonResponse<unknown>("/api/admin/gym-join-requests");
  if (!response.ok) return response;

  return { ok: true, data: parseJoinRequestList(response.data) };
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
