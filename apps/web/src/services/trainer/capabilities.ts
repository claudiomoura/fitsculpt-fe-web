import { exerciseSearchCapabilities } from "@/services/exercises/search";
import { trainerClientEndpointInventory, trainerClientServiceCapabilities } from "@/services/trainer/clients";
import { trainerPlanCapabilities } from "@/services/trainer/plans";

export type TrainerServiceCapabilities =
  & typeof trainerPlanCapabilities
  & typeof exerciseSearchCapabilities
  & typeof trainerClientServiceCapabilities;

export const trainerServiceCapabilities: TrainerServiceCapabilities = {
  ...trainerPlanCapabilities,
  ...exerciseSearchCapabilities,
  ...trainerClientServiceCapabilities,
};

export type TrainerServiceEndpointInventory = {
  endpoint: string;
  method: "GET" | "POST" | "PATCH" | "DELETE";
  exists: boolean;
  notes: string;
};

export const trainerServiceEndpointInventory: TrainerServiceEndpointInventory[] = [
  {
    endpoint: "/api/training-plans",
    method: "GET",
    exists: true,
    notes: "Used for listing plans; proxied to backend /training-plans.",
  },
  {
    endpoint: "/api/training-plans",
    method: "POST",
    exists: true,
    notes: "Used for creating plans; proxied to backend /training-plans.",
  },
  {
    endpoint: "/api/training-plans/:id",
    method: "PATCH",
    exists: false,
    notes: "No PATCH/PUT handler exists in Next BFF route; save/update marked as notSupported.",
  },
  {
    endpoint: "/api/exercises",
    method: "GET",
    exists: true,
    notes: "Used for exercise search/listing; proxied to backend /exercises.",
  },
  ...trainerClientEndpointInventory,
];
