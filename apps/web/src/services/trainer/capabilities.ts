import { exerciseEndpointInventory, exerciseSearchCapabilities } from "@/services/exercises/search";
import { trainerClientEndpointInventory, trainerClientServiceCapabilities } from "@/services/trainer/clients";
import { trainerPlanCapabilities, trainerPlanEndpointInventory } from "@/services/trainer/plans";

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
  ...trainerPlanEndpointInventory,
  ...exerciseEndpointInventory,
  ...trainerClientEndpointInventory,
];
