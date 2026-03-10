"use client"

import { Dumbbell, Flame, Heart, TrendingUp } from "lucide-react"
import { Button } from "@/components/ui/button"

interface OnboardingStep1Props {
  selectedObjetivo: string
  onSelect: (objetivo: string) => void
  onNext: () => void
}

const objetivos = [
  {
    id: "fuerza",
    title: "Ganar Fuerza",
    description: "Aumentar masa muscular y potencia",
    icon: Dumbbell,
  },
  {
    id: "perdida-grasa",
    title: "Perdida de Grasa",
    description: "Quemar grasa y definir tu cuerpo",
    icon: Flame,
  },
  {
    id: "hipertrofia",
    title: "Ganar Musculo",
    description: "Maximizar el crecimiento muscular",
    icon: TrendingUp,
  },
  {
    id: "salud",
    title: "Salud General",
    description: "Mejorar tu bienestar y energia",
    icon: Heart,
  },
]

export function OnboardingStep1({ selectedObjetivo, onSelect, onNext }: OnboardingStep1Props) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1">
        <h1 className="text-2xl font-bold text-foreground mb-2">
          Cual es tu objetivo?
        </h1>
        <p className="text-muted-foreground mb-8">
          Selecciona tu objetivo principal para personalizar tu plan.
        </p>

        <div className="flex flex-col gap-3">
          {objetivos.map((objetivo) => {
            const Icon = objetivo.icon
            const isSelected = selectedObjetivo === objetivo.id
            return (
              <button
                key={objetivo.id}
                onClick={() => onSelect(objetivo.id)}
                className={`glass-card flex items-center gap-4 p-5 rounded-2xl transition-all duration-200 text-left card-hover ${
                  isSelected
                    ? "ring-2 ring-primary glow-primary"
                    : "hover:ring-1 hover:ring-muted-foreground/30"
                }`}
              >
                <div
                  className={`w-14 h-14 rounded-xl flex items-center justify-center transition-all ${
                    isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  }`}
                >
                  <Icon className="w-7 h-7" />
                </div>
                <div>
                  <h3 className={`font-semibold text-lg ${isSelected ? "text-primary" : "text-foreground"}`}>
                    {objetivo.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">{objetivo.description}</p>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      <Button
        onClick={onNext}
        disabled={!selectedObjetivo}
        className="w-full h-14 text-base font-semibold rounded-xl glow-primary disabled:opacity-50"
      >
        Continuar
      </Button>
    </div>
  )
}
