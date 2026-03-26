"use client";

import { useState } from "react";
import { useWaitlist } from "@/hooks/useWaitlist";

interface WaitlistSignupProps {
  source?: string;
  showPosition?: boolean;
}

export default function WaitlistSignup({ source = "website", showPosition = true }: WaitlistSignupProps) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const { join, loading, error, result } = useWaitlist();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await join(email, name, source);
  };

  if (result?.success) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
        <div className="text-green-600 text-4xl mb-2">✓</div>
        <h3 className="text-lg font-semibold text-green-800 mb-1">
          ¡Estás en la lista de espera!
        </h3>
        {showPosition && result.position && (
          <p className="text-green-700">
            Posición: <strong>#{result.position}</strong>
          </p>
        )}
        <p className="text-green-600 text-sm mt-2">
          Te notificaremos cuando sea tu turno
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="waitlist-email" className="block text-sm font-medium text-gray-700 mb-1">
          Correo electrónico
        </label>
        <input
          id="waitlist-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          placeholder="tu@email.com"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>
      
      <div>
        <label htmlFor="waitlist-name" className="block text-sm font-medium text-gray-700 mb-1">
          Nombre (opcional)
        </label>
        <input
          id="waitlist-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Tu nombre"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {error && (
        <p className="text-red-600 text-sm">{error}</p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? "Uniéndote..." : "Unirse a la lista de espera"}
      </button>
    </form>
  );
}
