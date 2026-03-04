import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

export type BillingRouteHandlers = {
  billingCheckoutHandler: (
    request: FastifyRequest,
    reply: FastifyReply,
  ) => Promise<unknown>;
  billingPlansHandler: (
    request: FastifyRequest,
    reply: FastifyReply,
  ) => Promise<unknown>;
  billingPortalHandler: (
    request: FastifyRequest,
    reply: FastifyReply,
  ) => Promise<unknown>;
  billingAdminResetCustomerLinkHandler: (
    request: FastifyRequest,
    reply: FastifyReply,
  ) => Promise<unknown>;
  billingStripeWebhookHandler: (
    request: FastifyRequest,
    reply: FastifyReply,
  ) => Promise<unknown>;
  billingStatusHandler: (
    request: FastifyRequest,
    reply: FastifyReply,
  ) => Promise<unknown>;
};

export function registerBillingRoutes(
  app: FastifyInstance,
  handlers: BillingRouteHandlers,
) {
  app.post("/billing/checkout", handlers.billingCheckoutHandler);
  app.get("/billing/plans", handlers.billingPlansHandler);
  app.post("/billing/portal", handlers.billingPortalHandler);
  app.post(
    "/billing/admin/reset-customer-link",
    handlers.billingAdminResetCustomerLinkHandler,
  );
  app.post(
    "/billing/stripe/webhook",
    { config: { rawBody: true } },
    handlers.billingStripeWebhookHandler,
  );
  app.get("/billing/status", handlers.billingStatusHandler);
}
