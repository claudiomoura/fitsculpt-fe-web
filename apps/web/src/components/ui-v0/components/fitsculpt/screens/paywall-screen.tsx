"use client"

import { useState } from "react"
import { ChevronLeft, Check, Sparkles } from "@/components/ui-v0/icons"
import { Button } from "@/components/ui-v0/button"

interface PaywallScreenProps {
  onBack: () => void
}

const planes = [
  {
    id: "free",
    nombre: "Free",
    precio: "0",
    periodo: "",
    beneficios: [
      "3 entrenamientos por semana",
      "Registro de comidas basico",
      "Check-in diario",
    ],
    destacado: false,
  },
  {
    id: "strength-ai",
    nombre: "Strength AI",
    precio: "9.99",
    periodo: "/mes",
    beneficios: [
      "Entrenamientos ilimitados",
      "Planes personalizados con IA",
      "Progresion automatica",
      "Biblioteca completa de ejercicios",
    ],
    destacado: false,
  },
  {
    id: "nutri-ai",
    nombre: "Nutri AI",
    precio: "9.99",
    periodo: "/mes",
    beneficios: [
      "Plan de nutricion con IA",
      "Recetas personalizadas",
      "Seguimiento de macros avanzado",
      "Lista de compras automatica",
    ],
    destacado: false,
  },
  {
    id: "pro",
    nombre: "Pro",
    precio: "14.99",
    periodo: "/mes",
    beneficios: [
      "Todo de Strength AI",
      "Todo de Nutri AI",
      "Coaching personalizado",
      "Analisis avanzados",
      "Soporte prioritario",
    ],
    destacado: true,
  },
]

export function PaywallScreen({ onBack }: PaywallScreenProps) {
  const [selectedPlan, setSelectedPlan] = useState("pro")

  return (
    <div className="min-h-screen bg-background flex flex-col max-w-[430px] mx-auto">
      <header className="px-4 pt-12 pb-4">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-muted-foreground mb-4"
        >
          <ChevronLeft className="w-5 h-5" />
          <span className="text-sm">Volver</span>
        </button>
        <h1 className="text-2xl font-bold text-foreground">Elige tu plan</h1>
        <p className="text-muted-foreground">Desbloquea todo el potencial de FitSculpt</p>
      </header>

      <main className="flex-1 px-4 pb-32 overflow-y-auto">
        <div className="flex flex-col gap-3">
          {planes.map((plan) => {
            const isSelected = selectedPlan === plan.id
            
            return (
              <button
                key={plan.id}
                onClick={() => setSelectedPlan(plan.id)}
                className={`relative w-full rounded-2xl p-4 text-left transition-all border-2 ${
                  isSelected
                    ? "border-primary bg-primary/5"
                    : "border-border bg-card hover:border-muted-foreground/30"
                } ${plan.destacado ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""}`}
              >
                {plan.destacado && (
                  <div className="absolute -top-3 left-4 px-3 py-1 bg-primary text-primary-foreground text-xs font-medium rounded-full flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    Recomendado
                  </div>
                )}
                
                <div className="flex items-start justify-between mb-3 mt-1">
                  <div>
                    <h3 className="font-bold text-lg text-foreground">{plan.nombre}</h3>
                    <div className="flex items-baseline gap-0.5">
                      <span className="text-2xl font-bold text-foreground">${plan.precio}</span>
                      {plan.periodo && (
                        <span className="text-sm text-muted-foreground">{plan.periodo}</span>
                      )}
                    </div>
                  </div>
                  <div
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                      isSelected ? "border-primary bg-primary" : "border-muted-foreground/30"
                    }`}
                  >
                    {isSelected && <Check className="w-4 h-4 text-primary-foreground" />}
                  </div>
                </div>

                <ul className="space-y-2">
                  {plan.beneficios.map((beneficio, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-muted-foreground">{beneficio}</span>
                    </li>
                  ))}
                </ul>
              </button>
            )
          })}
        </div>
      </main>

      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-card border-t border-border p-4 safe-area-bottom">
        <Button 
          className="w-full h-14 rounded-xl text-base font-semibold"
          disabled={selectedPlan === "free"}
        >
          {selectedPlan === "free" ? "Plan actual" : "Actualizar ahora"}
        </Button>
        <p className="text-xs text-center text-muted-foreground mt-3">
          Cancela cuando quieras. Sin compromisos.
        </p>
      </div>
    </div>
  )
}
