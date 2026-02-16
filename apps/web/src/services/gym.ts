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

export async function fetchGymMembership(signal?: AbortSignal) {
  return fetch("/api/gym/me", { cache: "no-store", credentials: "include", signal });
}

export async function fetchGymMembers(gymId: string, signal?: AbortSignal) {
  return fetch(`/api/admin/gyms/${gymId}/members`, { cache: "no-store", credentials: "include", signal });
}

export async function fetchGymJoinRequests(signal?: AbortSignal) {
  return fetch("/api/admin/gym-join-requests", { cache: "no-store", credentials: "include", signal });
}

export async function reviewGymJoinRequest(membershipId: string, action: "accept" | "reject") {
  return fetch(`/api/admin/gym-join-requests/${membershipId}/${action}`, {
    method: "POST",
    credentials: "include",
  });
}

// Backward-compatible aliases for prior naming patterns used by trainer/gym UI slices.
export const parseGymMembership = parseMembership;
export const parseGymMembers = parseMembers;
export const parsePendingGymJoinRequests = parseJoinRequests;
export const fetchGymMembershipStatus = fetchGymMembership;
export const fetchGymPendingJoinRequests = fetchGymJoinRequests;
export const fetchGymMembersList = fetchGymMembers;
export const reviewPendingGymJoinRequest = reviewGymJoinRequest;
