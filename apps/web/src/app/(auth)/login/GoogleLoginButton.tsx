"use client";

import { useState } from "react";
//import { getBackendUrl } from "@/lib/backend";

const PROMO_CODE = "FitSculpt-100%";

type Labels = {
  button: string;
  modalTitle: string;
  modalSubtitle: string;
  promoLabel: string;
  promoPlaceholder: string;
  promoHint: string;
  confirm: string;
  skip: string;
  cancel: string;
  promoError: string;
  oauthError: string;
};

type GoogleLoginButtonProps = {
  labels: Labels;
};

export default function GoogleLoginButton({ labels }: GoogleLoginButtonProps) {
  const [showPromo, setShowPromo] = useState(false);
  const [promoCode, setPromoCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startGoogleAuth = (promo: string | null) => {
    setLoading(true);
    setError(null);

    const url = new URL("/api/auth/google/start", window.location.origin);
    if (promo) url.searchParams.set("promoCode", promo);

    window.location.href = url.toString();
  };

  const handleConfirmPromo = () => {
    if (promoCode.trim() !== PROMO_CODE) {
      setError(labels.promoError);
      return;
    }
    startGoogleAuth(promoCode.trim());
  };

  const handleSkipPromo = () => {
    startGoogleAuth(null);
  };

  const handleButtonClick = () => {
    setShowPromo(true);
  };

  return (
    <div style={{ display: "grid", gap: 8 }}>
      <button
        type="button"
        className="btn google"
        aria-label={labels.button}
        onClick={handleButtonClick}
        disabled={loading}
      >
        <span className="google-logo" aria-hidden="true">
          <svg
            viewBox="0 0 48 48"
            width="18"
            height="18"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              fill="#EA4335"
              d="M24 9.5c3.54 0 6.72 1.22 9.23 3.62l6.9-6.9C35.9 2.36 30.28 0 24 0 14.62 0 6.51 5.38 2.56 13.22l8.22 6.38C12.8 13.14 17.9 9.5 24 9.5z"
            />
            <path
              fill="#4285F4"
              d="M46.1 24.5c0-1.59-.14-2.73-.44-3.9H24v7.4h12.62c-.26 1.96-1.7 4.9-4.9 6.88l7.56 5.86c4.42-4.08 6.82-10.1 6.82-16.24z"
            />
            <path
              fill="#FBBC05"
              d="M10.78 28.6c-.4-1.2-.64-2.48-.64-3.8s.24-2.6.62-3.8l-8.2-6.38C.9 17.52 0 20.66 0 24.8c0 4.12.88 7.24 2.56 10.18l8.22-6.38z"
            />
            <path
              fill="#34A853"
              d="M24 48c6.28 0 11.56-2.06 15.42-5.6l-7.56-5.86c-2.02 1.42-4.72 2.4-7.86 2.4-6.1 0-11.2-3.64-13.22-8.7l-8.22 6.38C6.51 42.62 14.62 48 24 48z"
            />
            <path fill="none" d="M0 0h48v48H0z" />
          </svg>
        </span>
        {loading ? "..." : labels.button}
      </button>

      {error ? <p className="muted">{error}</p> : null}

      {showPromo ? (
        <div
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="google-promo-title"
        >
          <div className="modal-card">
            <div style={{ display: "grid", gap: 6 }}>
              <h3 id="google-promo-title" style={{ margin: 0 }}>
                {labels.modalTitle}
              </h3>
              <p className="muted" style={{ margin: 0 }}>
                {labels.modalSubtitle}
              </p>
            </div>

            <div style={{ display: "grid", gap: 8, marginTop: 16 }}>
              <label htmlFor="googlePromoInput">{labels.promoLabel}</label>
              <input
                id="googlePromoInput"
                name="promoCode"
                placeholder={labels.promoPlaceholder}
                value={promoCode}
                onChange={(event) => setPromoCode(event.target.value)}
              />
              <p className="muted" style={{ margin: 0 }}>
                {labels.promoHint}
              </p>
              {error ? <p className="muted">{error}</p> : null}
            </div>

            <div className="modal-actions" style={{ marginTop: 20 }}>
              <button
                type="button"
                className="btn"
                onClick={handleConfirmPromo}
                disabled={loading}
              >
                {labels.confirm}
              </button>

              <button
                type="button"
                className="btn secondary"
                onClick={handleSkipPromo}
                disabled={loading}
              >
                {labels.skip}
              </button>

              <button
                type="button"
                className="btn secondary"
                onClick={() => setShowPromo(false)}
              >
                {labels.cancel}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
