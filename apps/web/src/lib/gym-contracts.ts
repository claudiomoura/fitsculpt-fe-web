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
  code?: string;
  activationCode?: string;
  membersCount?: number;
  requestsCount?: number;
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

export type GymMemberListItemDto = {
  userId: string;
  name?: string;
  email?: string;
  role?: string;
  status?: string;
};

export type GymMutationResultDto = {
  ok: boolean;
  gymId: string | null;
  gym?: {
    id: string;
    name?: string;
    code?: string;
    activationCode?: string;
  };
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

      const membersCountRaw = row.membersCount;
      const requestsCountRaw = row.requestsCount;
      const membersCount = typeof membersCountRaw === "number" && Number.isFinite(membersCountRaw) ? membersCountRaw : undefined;
      const requestsCount = typeof requestsCountRaw === "number" && Number.isFinite(requestsCountRaw) ? requestsCountRaw : undefined;

      return {
        id,
        name,
        ...(asString(row.code) ? { code: asString(row.code)! } : {}),
        ...(asString(row.activationCode) ? { activationCode: asString(row.activationCode)! } : {}),
        ...(membersCount !== undefined ? { membersCount } : {}),
        ...(requestsCount !== undefined ? { requestsCount } : {}),
      };
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

export function normalizeMembersPayload(payload: unknown): GymMemberListItemDto[] {
  if (!isRecord(payload) && !Array.isArray(payload)) return [];

  const source = isRecord(payload) ? payload : {};
  const items = Array.isArray(source.members)
    ? source.members
    : Array.isArray(source.clients)
      ? source.clients
      : Array.isArray(source.users)
        ? source.users
        : Array.isArray(source.data)
          ? source.data
          : Array.isArray(payload)
            ? payload
            : [];

  const normalized: GymMemberListItemDto[] = [];

  for (const entry of items) {
    const row = isRecord(entry) ? entry : {};
    const userId = asString(row.userId) ?? asString(row.id) ?? asString(row.memberId);
    if (!userId) continue;

    normalized.push({
      userId,
      name: asString(row.name) ?? asString(row.userName) ?? undefined,
      email: asString(row.email) ?? asString(row.userEmail) ?? undefined,
      role: normalize(asString(row.role)) ?? undefined,
      status: normalize(asString(row.status) ?? asString(row.state)) ?? undefined,
    });
  }

  return normalized;
}

export function normalizeGymMutationResult(payload: unknown): GymMutationResultDto {
  const source = isRecord(payload) ? payload : {};
  const data = isRecord(source.data) ? source.data : source;

  const gymId = asString(data.gymId) ?? asString(data.id) ?? null;
  const name = asString(data.name) ?? undefined;
  const code = asString(data.code) ?? undefined;
  const activationCode = asString(data.activationCode) ?? undefined;

  return {
    ok: true,
    gymId,
    ...(gymId
      ? {
          gym: {
            id: gymId,
            ...(name ? { name } : {}),
            ...(code ? { code } : {}),
            ...(activationCode ? { activationCode } : {}),
          },
        }
      : {}),
  };
}
