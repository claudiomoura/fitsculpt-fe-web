export type MembershipStatus = "NONE" | "PENDING" | "ACTIVE" | "REJECTED" | "UNKNOWN";

export type GymMembership = {
  status: MembershipStatus;
  gymId: string | null;
  gymName: string | null;
  role: string | null;
};

export type GymMember = {
  id: string;
  name: string;
  email: string | null;
  role: string | null;
};

export type GymJoinRequest = {
  id: string;
  userName: string;
  email: string | null;
};

export type GymListItem = {
  id: string;
  name: string;
};

export type JoinRequestListItem = {
  id: string;
  userName: string | null;
  userEmail: string | null;
  gymName: string | null;
};

type ServiceSuccess<T> = {
  ok: true;
  status: number;
  data: T;
};

type ServiceFailure = {
  ok: false;
  status: number;
  reason?: "unsupported" | "unauthorized";
};

type ServiceResult<T> = ServiceSuccess<T> | ServiceFailure;

function asString(value: unknown): string | null {
  if (typeof value === "string" && value.trim().length > 0) return value;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return null;
}

function normalize(value: string | null): string | null {
  return value ? value.trim().toUpperCase() : null;
}

export function parseMembership(payload: unknown): GymMembership {
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

export function parseMembers(payload: unknown): GymMember[] {
  const source = typeof payload === "object" && payload !== null ? (payload as Record<string, unknown>) : {};
  const data = Array.isArray(source.data) ? source.data : Array.isArray(source.members) ? source.members : Array.isArray(payload) ? payload : [];

  return data
    .map((entry) => {
      const row = typeof entry === "object" && entry !== null ? (entry as Record<string, unknown>) : {};
      const id = asString(row.id) ?? asString(row.userId);
      if (!id) return null;
      return {
        id,
        name: asString(row.name) ?? asString(row.userName) ?? asString(row.email) ?? "-",
        email: asString(row.email),
        role: asString(row.role),
      };
    })
    .filter((entry): entry is GymMember => Boolean(entry));
}

export function parseJoinRequests(payload: unknown): GymJoinRequest[] {
  const source = typeof payload === "object" && payload !== null ? (payload as Record<string, unknown>) : {};
  const data = Array.isArray(source.data)
    ? source.data
    : Array.isArray(source.requests)
      ? source.requests
      : Array.isArray(payload)
        ? payload
        : [];

  return data
    .map((entry) => {
      const row = typeof entry === "object" && entry !== null ? (entry as Record<string, unknown>) : {};
      const id = asString(row.id) ?? asString(row.membershipId);
      if (!id) return null;
      return {
        id,
        userName: asString(row.userName) ?? asString(row.name) ?? asString(row.email) ?? "-",
        email: asString(row.email),
      };
    })
    .filter((entry): entry is GymJoinRequest => Boolean(entry));
}

function parseGymList(payload: unknown): GymListItem[] {
  const source = typeof payload === "object" && payload !== null ? (payload as Record<string, unknown>) : {};
  const data = Array.isArray(source.data) ? source.data : Array.isArray(source.gyms) ? source.gyms : Array.isArray(payload) ? payload : [];

  return data
    .map((entry) => {
      const row = typeof entry === "object" && entry !== null ? (entry as Record<string, unknown>) : {};
      const id = asString(row.id) ?? asString(row.gymId);
      const name = asString(row.name) ?? asString(row.gymName);
      if (!id || !name) return null;
      return { id, name };
    })
    .filter((entry): entry is GymListItem => Boolean(entry));
}

function toServiceFailure<T>(response: Response): ServiceResult<T> {
  const reason = response.status === 401 || response.status === 403
    ? "unauthorized"
    : response.status === 404 || response.status === 405
      ? "unsupported"
      : undefined;
  return { ok: false, status: response.status, reason };
}

export function mapJoinRequestsToListItems(items: GymJoinRequest[]): JoinRequestListItem[] {
  return items.map((item) => ({
    id: item.id,
    userName: item.userName ?? null,
    userEmail: item.email ?? null,
    gymName: null,
  }));
}

export async function fetchGymMembership(signal?: AbortSignal) {
  const response = await fetch("/api/gym/me", { cache: "no-store", credentials: "include", signal });
  return response;
}

export async function fetchMyGymMembership(signal?: AbortSignal): Promise<ServiceResult<GymMembership>> {
  const response = await fetchGymMembership(signal);
  if (!response.ok) return toServiceFailure(response);

  const payload = (await response.json().catch(() => null)) as unknown;
  return { ok: true, status: response.status, data: parseMembership(payload) };
}

export async function fetchGymMembers(gymId: string, signal?: AbortSignal) {
  const response = await fetch(`/api/admin/gyms/${gymId}/members`, { cache: "no-store", credentials: "include", signal });
  return response;
}

export async function fetchGymJoinRequests(signal?: AbortSignal) {
  const response = await fetch("/api/admin/gym-join-requests", { cache: "no-store", credentials: "include", signal });
  return response;
}

export async function fetchPendingGymJoinRequests(signal?: AbortSignal): Promise<ServiceResult<JoinRequestListItem[]>> {
  const response = await fetchGymJoinRequests(signal);
  if (!response.ok) return toServiceFailure(response);

  const payload = (await response.json().catch(() => null)) as unknown;
  return { ok: true, status: response.status, data: mapJoinRequestsToListItems(parseJoinRequests(payload)) };
}

export async function fetchGymsList(signal?: AbortSignal): Promise<ServiceResult<GymListItem[]>> {
  const response = await fetch("/api/gyms", { cache: "no-store", credentials: "include", signal });
  if (!response.ok) return toServiceFailure(response);

  const payload = (await response.json().catch(() => null)) as unknown;
  return { ok: true, status: response.status, data: parseGymList(payload) };
}

export async function requestGymJoin(gymId: string): Promise<ServiceResult<null>> {
  const response = await fetch("/api/gym/join-request", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ gymId }),
  });

  if (!response.ok) {
    if (response.status === 404 || response.status === 405) {
      const fallback = await fetch("/api/gyms/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ gymId }),
      });
      if (!fallback.ok) return toServiceFailure(fallback);
      return { ok: true, status: fallback.status, data: null };
    }
    return toServiceFailure(response);
  }

  return { ok: true, status: response.status, data: null };
}

export async function reviewGymJoinRequest(membershipId: string, action: "accept" | "reject") {
  const response = await fetch(`/api/admin/gym-join-requests/${membershipId}/${action}`, {
    method: "POST",
    credentials: "include",
  });
  return response;
}
