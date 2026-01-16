import crypto from "crypto";

export const PROMO_CODE = "FitSculpt-100%";

export function isPromoCodeValid(code: string) {
  return code === PROMO_CODE;
}

export function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}
