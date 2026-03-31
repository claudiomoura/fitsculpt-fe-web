import type { WorkoutSession } from "@/lib/types";

function toTimestamp(value?: string | null): number {
  if (!value) return 0;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

export function pickLatestOpenWorkoutSession(
  sessions?: WorkoutSession[] | null,
): WorkoutSession | null {
  if (!Array.isArray(sessions) || sessions.length === 0) {
    return null;
  }

  const openSessions = sessions.filter((session) => !session.finishedAt);
  if (openSessions.length === 0) {
    return null;
  }

  return [...openSessions].sort(
    (a, b) => toTimestamp(b.startedAt) - toTimestamp(a.startedAt),
  )[0] ?? null;
}
