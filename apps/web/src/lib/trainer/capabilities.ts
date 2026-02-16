export type TrainerApiCapabilities = {
  canListClients: boolean;
  canCreateClient: boolean;
  canAssignTrainingPlan: boolean;
};

// Audit based on existing Next API route handlers in this repository:
// - /api/admin/users GET: available (proxy to backend admin users list)
// - /api/admin/users POST: available (proxy to backend admin user create/invite)
// - /api/trainer/assign-training-plan POST: available (proxy to backend trainer member assignment)
export const trainerApiCapabilities: TrainerApiCapabilities = {
  canListClients: true,
  canCreateClient: true,
  canAssignTrainingPlan: true,
};
