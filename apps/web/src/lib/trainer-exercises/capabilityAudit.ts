export type TrainerExerciseCapabilities = {
  createExercise: "can_create" | "cannot_create" | "unknown";
  canUploadMedia: boolean;
};

type CapabilityProbe = {
  status: number;
  allowHeader: string | null;
};

async function supportsExercisesRead(): Promise<boolean> {
  try {
    const response = await fetch("/api/exercises?limit=1", { method: "GET", cache: "no-store" });
    return response.ok;
  } catch (_err) {
    return false;
  }
}

function deriveCreateCapability(probe: CapabilityProbe): "can_create" | "cannot_create" | "unknown" {
  if (probe.status === 200 || probe.status === 204) {
    if (!probe.allowHeader) return "can_create";

    const allowedMethods = probe.allowHeader
      .split(",")
      .map((method) => method.trim().toUpperCase())
      .filter((method) => method.length > 0);

    return allowedMethods.length === 0 || allowedMethods.includes("POST") ? "can_create" : "cannot_create";
  }

  if ([401, 403, 404, 405, 501].includes(probe.status)) {
    return "cannot_create";
  }

  return "unknown";
}

async function probeCreateCapability(method: "OPTIONS" | "HEAD" | "GET"): Promise<CapabilityProbe | null> {
  try {
    const response = await fetch(method === "GET" ? "/api/exercises?limit=1" : "/api/exercises", {
      method,
      cache: "no-store",
    });

    return {
      status: response.status,
      allowHeader: response.headers.get("allow"),
    };
  } catch (_err) {
    return null;
  }
}

async function supportsExerciseCreate(): Promise<"can_create" | "cannot_create" | "unknown"> {
  const optionsProbe = await probeCreateCapability("OPTIONS");
  if (optionsProbe) {
    const optionsCapability = deriveCreateCapability(optionsProbe);
    if (optionsCapability !== "cannot_create" || optionsProbe.status !== 405) {
      return optionsCapability;
    }
  }

  const headProbe = await probeCreateCapability("HEAD");
  if (headProbe) {
    const headCapability = deriveCreateCapability(headProbe);
    if (headCapability !== "cannot_create" || headProbe.status !== 405) {
      return headCapability;
    }
  }

  const getProbe = await probeCreateCapability("GET");
  return getProbe ? deriveCreateCapability(getProbe) : "unknown";
}

export async function auditTrainerExerciseCapabilities(): Promise<TrainerExerciseCapabilities> {
  const canReadExercises = await supportsExercisesRead();
  const createExercise = canReadExercises ? await supportsExerciseCreate() : "cannot_create";

  return {
    createExercise,
    canUploadMedia: false,
  };
}
