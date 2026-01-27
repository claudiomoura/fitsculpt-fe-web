import { getEnv } from "./config.js";

type EmailPayload = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

const env = getEnv();

export async function sendEmail(payload: EmailPayload) {
    console.log("[email] provider =", env.EMAIL_PROVIDER);
  console.log("[email] from =", env.EMAIL_FROM);
  console.log("[email] hasKey =", Boolean(env.RESEND_API_KEY));
  if (env.EMAIL_PROVIDER === "resend") {
    if (!env.RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is required");
    }
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: env.EMAIL_FROM,
        to: [payload.to],
        subject: payload.subject,
        html: payload.html,
        text: payload.text,
        reply_to: "info@fitsculpt.pl",
      }),
    });
    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`Email send failed: ${detail}`);
    }
    return;
  }

  console.info("[email:console]", {
    to: payload.to,
    subject: payload.subject,
    text: payload.text,
  });
}
