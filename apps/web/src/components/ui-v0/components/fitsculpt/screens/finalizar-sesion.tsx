"use client"

import { useState } from "react"
import { Trophy, Clock, Dumbbell, Flame } from "@/components/ui-v0/icons"
import { Button } from "@/components/ui-v0/button"
import { SuccessToast } from "../ui/ui-states"

interface FinalizarSesionProps {
  onSave: () => void
}

export function FinalizarSesion({ onSave }: FinalizarSesionProps) {
  const [rpe, setRpe] = useState(7)
  const [energia, setEnergia] = useState(3)
  const [showSuccess, setShowSuccess] = useState(false)
  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    setShowSuccess(true)
    setSaved(true)
    setTimeout(() => {
      setShowSuccess(false)
      onSave()
    }, 1500)
  }

  if (saved) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center max-w-[430px] mx-auto px-4">
        <SuccessToast message="Sesion guardada" isVisible={showSuccess} />
        <div className="animate-in zoom-in-50 fade-in duration-500">
          <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mb-6 mx-auto">
            <Trophy className="w-12 h-12 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground text-center mb-2">Sesion completada!</h1>
          <p className="text-muted-foreground text-center">Excelente trabajo, sigue asi.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex flex-col max-w-[430px] mx-auto">
      <div className="px-4 pt-12 pb-8">
        {/* Success animation */}
        <div className="flex justify-center mb-8">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center animate-in zoom-in duration-500">
            <Trophy className="w-10 h-10 text-primary" />
          </div>
        </div>

        <h1 className="text-2xl font-bold text-foreground text-center mb-2">Sesion completada</h1>
        <p className="text-muted-foreground text-center mb-8">Resumen de tu entrenamiento</p>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          <div className="bg-card rounded-2xl p-4 border border-border text-center">
            <Clock className="w-6 h-6 text-primary mx-auto mb-2" />
            <p className="text-xl font-bold text-foreground">42</p>
            <p className="text-xs text-muted-foreground">minutos</p>
          </div>
          <div className="bg-card rounded-2xl p-4 border border-border text-center">
            <Dumbbell className="w-6 h-6 text-primary mx-auto mb-2" />
            <p className="text-xl font-bold text-foreground">17</p>
            <p className="text-xs text-muted-foreground">series</p>
          </div>
          <div className="bg-card rounded-2xl p-4 border border-border text-center">
            <Flame className="w-6 h-6 text-primary mx-auto mb-2" />
            <p className="text-xl font-bold text-foreground">320</p>
            <p className="text-xs text-muted-foreground">kcal est.</p>
          </div>
        </div>

        {/* RPE */}
        <div className="bg-card rounded-2xl p-4 border border-border mb-4">
          <h3 className="font-semibold text-foreground mb-1">Esfuerzo percibido (RPE)</h3>
          <p className="text-sm text-muted-foreground mb-4">Que tan dificil fue?</p>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((level) => (
              <button
                key={level}
                onClick={() => setRpe(level)}
                className={`flex-1 h-10 rounded-lg text-sm font-medium transition-all ${
                  rpe === level
                    ? "bg-primary text-primary-foreground"
                    : level <= rpe
                    ? "bg-primary/30 text-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {level}
              </button>
            ))}
          </div>
          <div className="flex justify-between mt-2 text-xs text-muted-foreground">
            <span>Facil</span>
            <span>Maximo</span>
          </div>
        </div>

        {/* Energia */}
        <div className="bg-card rounded-2xl p-4 border border-border mb-8">
          <h3 className="font-semibold text-foreground mb-1">Energia despues</h3>
          <p className="text-sm text-muted-foreground mb-4">Como te sientes ahora?</p>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((level) => (
              <button
                key={level}
                onClick={() => setEnergia(level)}
                className={`flex-1 h-12 rounded-xl text-sm font-medium transition-all ${
                  energia === level
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {level === 1 ? "Agotado" : level === 2 ? "Cansado" : level === 3 ? "Normal" : level === 4 ? "Bien" : "Genial"}
              </button>
            ))}
          </div>
        </div>

        <Button onClick={handleSave} className="w-full h-14 rounded-xl text-base font-semibold">
          Guardar sesion
        </Button>
      </div>
    </div>
  )
}
