"use client"

import { Button } from "@/components/ui-v0/button"
import { ChevronLeft, Minus, Plus, Sparkles } from "@/components/ui-v0/icons"

interface OnboardingStep3Props {
  diasSemana: number
  restricciones: string[]
  onChangeDias: (dias: number) => void
  onChangeRestricciones: (restricciones: string[]) => void
  onComplete: () => void
  onBack: () => void
}

const restriccionesOptions = [
  "Vegetariano",
  "Vegano",
  "Sin gluten",
  "Sin lactosa",
  "Keto",
  "Sin restricciones",
]

export function OnboardingStep3({
  diasSemana,
  restricciones,
  onChangeDias,
  onChangeRestricciones,
  onComplete,
  onBack,
}: OnboardingStep3Props) {
  const toggleRestriccion = (restriccion: string) => {
    if (restriccion === "Sin restricciones") {
      onChangeRestricciones(["Sin restricciones"])
      return
    }
    
    const newRestricciones = restricciones.filter(r => r !== "Sin restricciones")
    if (newRestricciones.includes(restriccion)) {
      onChangeRestricciones(newRestricciones.filter((r) => r !== restriccion))
    } else {
      onChangeRestricciones([...newRestricciones, restriccion])
    }
  }

  return (
    <div className="flex flex-col h-full">
      <button
        onClick={onBack}
        className="flex items-center gap-1 text-muted-foreground mb-6 -ml-1 hover:text-primary transition-colors"
      >
        <ChevronLeft className="w-5 h-5" />
        <span className="text-sm">Atras</span>
      </button>

      <div className="flex-1">
        <h1 className="text-2xl font-bold text-foreground mb-2">
          Tus preferencias
        </h1>
        <p className="text-muted-foreground mb-8">
          Personaliza tu plan semanal.
        </p>

        {/* Dias por semana */}
        <div className="mb-8">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">
            Dias de entrenamiento por semana
          </h2>
          <div className="glass-card flex items-center justify-center gap-8 p-6 rounded-2xl">
            <button
              onClick={() => onChangeDias(Math.max(1, diasSemana - 1))}
              className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-foreground hover:bg-muted/80 transition-colors disabled:opacity-50"
              disabled={diasSemana <= 1}
            >
              <Minus className="w-5 h-5" />
            </button>
            <div className="text-center">
              <span className="text-5xl font-bold text-primary">{diasSemana}</span>
              <p className="text-sm text-muted-foreground mt-1">dias</p>
            </div>
            <button
              onClick={() => onChangeDias(Math.min(7, diasSemana + 1))}
              className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-foreground hover:bg-muted/80 transition-colors disabled:opacity-50"
              disabled={diasSemana >= 7}
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Restricciones alimentarias */}
        <div>
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">
            Restricciones alimentarias
          </h2>
          <div className="flex flex-wrap gap-2">
            {restriccionesOptions.map((restriccion) => {
              const isSelected = restricciones.includes(restriccion)
              return (
                <button
                  key={restriccion}
                  onClick={() => toggleRestriccion(restriccion)}
                  className={`px-4 py-2.5 rounded-full text-sm font-medium transition-all duration-200 ${
                    isSelected
                      ? "bg-accent text-accent-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {restriccion}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      <Button
        onClick={onComplete}
        className="w-full h-14 text-base font-semibold rounded-xl mt-6 glow-primary"
      >
        <Sparkles className="w-5 h-5 mr-2" />
        Crear mi semana
      </Button>
    </div>
  )
}
