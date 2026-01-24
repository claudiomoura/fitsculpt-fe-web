export function getBackendUrl() {
  return process.env.NEXT_PUBLIC_BACKEND_URL ?? process.env.BACKEND_URL ?? "http://localhost:4000";
}
