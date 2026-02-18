import { extractTrainerClients, type TrainerClient } from "@/lib/trainerClients";

export const TRAINER_CLIENT_ENDPOINT_CANDIDATES = ["/api/trainer/clients"] as const;

export type TrainerClientsCapability =
  | { status: "supported"; endpoint: string; clients: TrainerClient[] }
  | { status: "unavailable" }
  | { status: "error"; endpoint?: string; message: string };

export async function probeTrainerClientsCapability(): Promise<TrainerClientsCapability> {
  for (const endpoint of TRAINER_CLIENT_ENDPOINT_CANDIDATES) {
    try {
      const response = await fetch(endpoint, { cache: "no-store" });

      if (response.status === 404 || response.status === 405) {
        continue;
      }

      if (!response.ok) {
        return {
          status: "error",
          endpoint,
          message: `HTTP_${response.status}`,
        };
      }

      const payload = (await response.json()) as unknown;
      return {
        status: "supported",
        endpoint,
        clients: extractTrainerClients(payload),
      };
    } catch (_err) {
      return {
        status: "error",
        endpoint,
        message: "NETWORK_ERROR",
      };
    }
  }

  return { status: "unavailable" };
}

export function canUseTrainerDemoPreview(previewMode: string | null): boolean {
  return process.env.NODE_ENV !== "production" && previewMode === "admin-dev";
}

export function getTrainerDemoClients(): TrainerClient[] {
  return [
    {
      id: "demo-athlete-1",
      name: "Demo Athlete",
      email: "demo+athlete@fitsculpt.dev",
      isBlocked: false,
      subscriptionStatus: "trial",
      raw: {},
    },
    {
      id: "demo-athlete-2",
      name: "Dev Preview User",
      email: "preview@fitsculpt.dev",
      isBlocked: null,
      subscriptionStatus: "active",
      raw: {},
    },
  ];
}
