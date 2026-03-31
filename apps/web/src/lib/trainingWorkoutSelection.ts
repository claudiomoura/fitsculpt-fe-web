type WorkoutLookupSession = { finishedAt?: string | null };

export type WorkoutLookupCandidate = {
  id: string;
  name?: string | null;
  sessions?: WorkoutLookupSession[];
};

function normalizeName(value?: string | null): string {
  return (value ?? "").trim().toLowerCase();
}

function hasFinishedSession(candidate: WorkoutLookupCandidate): boolean {
  return Array.isArray(candidate.sessions)
    && candidate.sessions.some((session) => Boolean(session.finishedAt));
}

function hasAnySession(candidate: WorkoutLookupCandidate): boolean {
  return Array.isArray(candidate.sessions) && candidate.sessions.length > 0;
}

function matchesFocus(candidate: WorkoutLookupCandidate, focus?: string | null): boolean {
  const normalizedFocus = normalizeName(focus);
  if (!normalizedFocus) return false;
  const candidateName = normalizeName(candidate.name);
  if (!candidateName) return false;
  return candidateName.includes(normalizedFocus) || normalizedFocus.includes(candidateName);
}

function pickFromPool(candidates: WorkoutLookupCandidate[], focus?: string | null): WorkoutLookupCandidate | null {
  if (candidates.length === 0) return null;
  const focused = candidates.filter((candidate) => matchesFocus(candidate, focus));
  return focused[0] ?? candidates[0] ?? null;
}

export function pickWorkoutIdForDateCandidates(
  candidates: WorkoutLookupCandidate[],
  focus?: string | null,
): string | null {
  if (candidates.length === 0) return null;

  const finishedCandidates = candidates.filter(hasFinishedSession);
  const preferredFinished = pickFromPool(finishedCandidates, focus);
  if (preferredFinished?.id) return preferredFinished.id;

  const activeCandidates = candidates.filter(hasAnySession);
  const preferredActive = pickFromPool(activeCandidates, focus);
  if (preferredActive?.id) return preferredActive.id;

  const preferred = pickFromPool(candidates, focus);
  return preferred?.id ?? null;
}
