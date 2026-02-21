import { isStripePriceNotFoundError } from "../billing/stripeErrors.js";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

const notFoundError = Object.assign(new Error("Stripe request failed"), {
  code: "STRIPE_REQUEST_FAILED",
  debug: {
    status: 404,
    body: JSON.stringify({
      error: {
        code: "resource_missing",
        message: "No such price: 'price_123'",
      },
    }),
  },
});


const invalidPriceRequestError = Object.assign(new Error("Stripe request failed"), {
  code: "STRIPE_REQUEST_FAILED",
  debug: {
    status: 400,
    body: JSON.stringify({
      error: {
        code: "invalid_request_error",
        message: "No such price: 'price_456'",
      },
    }),
  },
});

const unauthorizedError = Object.assign(new Error("Stripe request failed"), {
  code: "STRIPE_REQUEST_FAILED",
  debug: {
    status: 401,
    body: "",
  },
});

assert(isStripePriceNotFoundError(notFoundError), "Expected no-such-price errors to be detected");
assert(isStripePriceNotFoundError(invalidPriceRequestError), "Expected 400 no-such-price errors to be detected");
assert(!isStripePriceNotFoundError(unauthorizedError), "Expected credential errors to not be flagged as missing price");

console.log("stripeErrors tests passed");
