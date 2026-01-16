import { hashToken, isPromoCodeValid, PROMO_CODE } from "../authUtils.js";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

assert(isPromoCodeValid(PROMO_CODE), "Promo code should be valid");
assert(!isPromoCodeValid("invalid"), "Promo code should be invalid");

const token = "token-123";
assert(hashToken(token) === hashToken(token), "Hash should be deterministic");

console.log("authUtils tests passed");
