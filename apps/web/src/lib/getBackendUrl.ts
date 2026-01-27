export function getBackendUrl() {
  const raw =
    process.env.BACKEND_URL ||
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    "http://127.0.0.1:4000";

  return raw.replace(/\/$/, "");
}
