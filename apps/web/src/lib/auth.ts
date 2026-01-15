export function isLoggedInFromCookie(cookieHeader: string | null) {
  if (!cookieHeader) return false;
  return cookieHeader.includes("fs_token=");
}
