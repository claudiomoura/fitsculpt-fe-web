export function getBackendUrl() {
  return process.env.BACKEND_URL ?? "http://127.0.0.1:4000";
}
