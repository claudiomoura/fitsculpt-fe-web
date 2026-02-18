export type MembershipStatus = "NONE" | "PENDING" | "ACTIVE" | "REJECTED" | "UNKNOWN";

export type GymMembershipDto = {
  status: MembershipStatus;
  gymId: string | null;
  gymName: string | null;
  role: string | null;
};

export type GymListItemDto = {
  id: string;
  name: string;
};

export type JoinRequestListItemDto = {
  id: string;
  gymId?: string;
  gymName?: string;
  userId?: string;
  userName?: string;
  userEmail?: string;
  createdAt?: string;
};

function asString(value: unknown): string | null {
  if (typeof value === "string" && value.trim().length > 0) return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return null;
}

function normalize(value: string | null): string | null {
  return value ? value.trim().toUpperCase() : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function normalizeMembershipPayload(payload: unknown): GymMembershipDto {
  const source = isRecord(payload) ? payload : {};
  const data = isRecord(source.data) ? source.data : source;
  const gym = isRecord(data.gym) ? data.gym : null;

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

export function normalizeGymListPayload(payload: unknown): GymListItemDto[] {
  const source = isRecord(payload) ? payload : {};
  const items = Array.isArray(source.data) ? source.data : Array.isArray(source.gyms) ? source.gyms : Array.isArray(payload) ? payload : [];

  return items
    .map((entry) => {
      const row = isRecord(entry) ? entry : {};
      const id = asString(row.id) ?? asString(row.gymId);
      const name = asString(row.name) ?? asString(row.gymName);
      if (!id || !name) return null;
      return { id, name };
    })
    .filter((entry): entry is GymListItemDto => Boolean(entry));
}

export function normalizeJoinRequestPayload(payload: unknown): JoinRequestListItemDto[] {
  if (!isRecord(payload) && !Array.isArray(payload)) return [];

  const source = isRecord(payload) ? payload : {};
  const items = Array.isArray(source.items)
    ? source.items
    : Array.isArray(source.requests)
      ? source.requests
      : Array.isArray(source.data)
        ? source.data
        : Array.isArray(payload)
          ? payload
          : [];

  const parsed: JoinRequestListItemDto[] = [];

  for (const entry of items) {
    if (!isRecord(entry)) continue;

    const gym = isRecord(entry.gym) ? entry.gym : undefined;
    const user = isRecord(entry.user) ? entry.user : undefined;
    const id = asString(entry.id) ?? asString(entry.membershipId);
    if (!id) continue;

    parsed.push({
      id,
      gymId: asString(entry.gymId) ?? asString(gym?.id) ?? undefined,
      gymName: asString(entry.gymName) ?? asString(gym?.name) ?? undefined,
      userId: asString(entry.userId) ?? asString(user?.id) ?? undefined,
      userName: asString(entry.userName) ?? asString(user?.name) ?? undefined,
      userEmail: asString(entry.userEmail) ?? asString(user?.email) ?? undefined,
      createdAt: asString(entry.createdAt) ?? undefined,
    });
  }

  return parsed;
}
