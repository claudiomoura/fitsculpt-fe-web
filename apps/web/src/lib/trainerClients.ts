type UnknownRecord = Record<string, unknown>;

export type TrainerClient = {
  id: string;
  name: string;
  email: string | null;
  isBlocked: boolean | null;
  subscriptionStatus: string | null;
  raw: UnknownRecord;
};

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null;
}

function getString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function getId(value: unknown): string | null {
  if (typeof value === "string") return getString(value);
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return null;
}

function normalizeClient(entry: unknown): TrainerClient | null {
  if (!isRecord(entry)) return null;

  const id = getId(entry.id) ?? getId(entry.userId) ?? getId(entry.clientId) ?? getId(entry._id);
  if (!id) return null;

  const email = getString(entry.email);
  const name =
    getString(entry.name) ??
    getString(entry.fullName) ??
    getString(entry.displayName) ??
    email ??
    id;

  return {
    id,
    name,
    email,
    isBlocked: typeof entry.isBlocked === "boolean" ? entry.isBlocked : null,
    subscriptionStatus: getString(entry.subscriptionStatus),
    raw: entry,
  };
}

function readArrayContainer(source: unknown, key: string): unknown[] {
  if (!isRecord(source)) return [];
  return Array.isArray(source[key]) ? source[key] : [];
}

export function extractTrainerClients(source: unknown): TrainerClient[] {
  const rootCandidates = [source];

  if (isRecord(source)) {
    rootCandidates.push(source.data, source.profile, source.user);
  }

  const list: TrainerClient[] = [];
  const seen = new Set<string>();

  for (const candidate of rootCandidates) {
    for (const key of ["clients", "users", "athletes", "members"]) {
      for (const item of readArrayContainer(candidate, key)) {
        const client = normalizeClient(item);
        if (!client || seen.has(client.id)) continue;
        seen.add(client.id);
        list.push(client);
      }
    }
  }

  return list;
}

export function findTrainerClient(source: unknown, clientId: string): TrainerClient | null {
  return extractTrainerClients(source).find((client) => client.id === clientId) ?? null;
}

export function hasClientContextData(source: unknown): boolean {
  if (!isRecord(source)) return false;

  return (
    typeof source.lastLoginAt === "string" ||
    typeof source.subscriptionStatus === "string" ||
    isRecord(source.tracking) ||
    isRecord(source.plans)
  );
}
