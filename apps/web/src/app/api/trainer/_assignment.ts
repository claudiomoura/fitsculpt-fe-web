import { fetchBackend, type ProxyResult } from "../gyms/_proxy";

type MembershipPayload = {
  gymId?: string;
  data?: {
    gymId?: string;
  };
};

function resolveGymId(payload: unknown): string | null {
  const source = (payload ?? {}) as MembershipPayload;
  const gymId = source.data?.gymId ?? source.gymId;
  return typeof gymId === "string" && gymId.trim().length > 0 ? gymId : null;
}

export async function assignPlanToTrainerClient(
  clientId: string,
  body: Record<string, unknown>,
): Promise<ProxyResult> {
  const membership = await fetchBackend("/gyms/membership");

  if (membership.status < 200 || membership.status >= 300) {
    return membership;
  }

  const gymId = resolveGymId(membership.payload);
  if (!gymId) {
    return {
      status: 404,
      payload: {
        code: "GYM_NOT_FOUND",
        message: "No active gym membership found",
      },
    };
  }

  return fetchBackend(`/admin/gyms/${gymId}/members/${clientId}/assign-training-plan`, {
    method: "POST",
    body,
  });
}
