"use client";

import { useState } from "react";

interface WaitlistResponse {
  success: boolean;
  message?: string;
  position?: number;
  status?: string;
  error?: string;
}

export function useWaitlist() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<WaitlistResponse | null>(null);

  const join = async (email: string, name?: string, source?: string) => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name, source }),
      });

      const data = await response.json();
      setResult(data);
      
      if (!data.success) {
        setError(data.error || "Error al unirse");
      }
      
      return data;
    } catch (err) {
      const message = "Error de conexión";
      setError(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  };

  const checkStatus = async (email: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/waitlist?email=${encodeURIComponent(email)}`);
      const data = await response.json();
      setResult(data);
      return data;
    } catch (err) {
      const message = "Error al verificar estado";
      setError(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  };

  return { join, checkStatus, loading, error, result };
}
