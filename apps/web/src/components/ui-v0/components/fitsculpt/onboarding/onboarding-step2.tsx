"use client"

import { Button } from "@/components/ui-v0/button"
import { ChevronLeft } from "@/components/ui-v0/icons"

interface OnboardingStep2Props {
  selectedNivel: string
  selectedEquipo: string[]
  onSelectNivel: (nivel: string) => void
  onSelectEquipo: (equipo: string[]) => void
  onNext: () => void
  onBack: () => void
}

const niveles = [
  { id: "principiante", label: "Principiante", description: "Menos de 6 meses" },
  { id: "intermedio", label: "Intermedio", description: "6 meses - 2 anos" },
  { id: "avanzado", label: "Avanzado", description: "Mas de 2 anos" },
]

const equipos = [
  "Mancuernas",
  "Barra",
  "Kettlebell",
  "Bandas",
  "TRX",
  "Maquinas",
  "Solo cuerpo",
]

export function OnboardingStep2({
  selectedNivel,
  selectedEquipo,
  onSelectNivel,
  onSelectEquipo,
  onNext,
  onBack,
}: OnboardingStep2Props) {
  const toggleEquipo = (equipo: string) => {
    if (selectedEquipo.includes(equipo)) {
      onSelectEquipo(selectedEquipo.filter((e) => e !== equipo))
    } else {
      onSelectEquipo([...selectedEquipo, equipo])
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
          Tu experiencia
        </h1>
        <p className="text-muted-foreground mb-6">
          Cuentanos sobre tu nivel y equipo disponible.
        </p>

        {/* Nivel */}
        <div className="mb-8">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">
            Nivel de experiencia
          </h2>
          <div className="flex flex-col gap-2">
            {niveles.map((nivel) => {
              const isSelected = selectedNivel === nivel.id
              return (
                <button
                  key={nivel.id}
                  onClick={() => onSelectNivel(nivel.id)}
                  className={`glass-card flex items-center justify-between p-4 rounded-xl transition-all duration-200 card-hover ${
                    isSelected
                      ? "ring-2 ring-primary"
                      : ""
                  }`}
                >
                  <span className={`font-medium ${isSelected ? "text-primary" : "text-foreground"}`}>
                    {nivel.label}
                  </span>
                  <span className="text-sm text-muted-foreground">{nivel.description}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Equipo */}
        <div>
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">
            Equipo disponible
          </h2>
          <div className="flex flex-wrap gap-2">
            {equipos.map((equipo) => {
              const isSelected = selectedEquipo.includes(equipo)
              return (
                <button
                  key={equipo}
                  onClick={() => toggleEquipo(equipo)}
                  className={`px-4 py-2.5 rounded-full text-sm font-medium transition-all duration-200 ${
                    isSelected
                      ? "bg-primary text-primary-foreground glow-primary"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {equipo}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      <Button
        onClick={onNext}
        disabled={!selectedNivel}
        className="w-full h-14 text-base font-semibold rounded-xl mt-6 glow-primary disabled:opacity-50"
      >
        Continuar
      </Button>
    </div>
  )
}
