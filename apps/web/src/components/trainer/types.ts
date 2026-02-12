export type ClientRow = {
  id: string;
  email: string;
  name: string | null;
  role: string;
  isBlocked: boolean;
  lastLoginAt?: string | null;
  subscriptionStatus?: string | null;
};

export type LoadState = "loading" | "ready" | "error";
