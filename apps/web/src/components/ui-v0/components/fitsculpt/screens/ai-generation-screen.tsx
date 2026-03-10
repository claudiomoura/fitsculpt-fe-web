"use client"

import { useState } from "react"
import { ChevronLeft, Sparkles, Target, Calendar, Dumbbell, TrendingUp, Loader2 } from "@/components/ui-v0/icons"
import { Button } from "@/components/ui-v0/button"

interface AIGenerationScreenProps {
  onBack: () => void
  onGenerate: () => void
}

const goals = [
  { id: "fuerza", label: "Ganar fuerza", icon: Dumbbell },
  { id: "hipertrofia", label: "Ganar musculo", icon: TrendingUp },
  { id: "resistencia", label: "Resistencia", icon: Target },
  { id: "perdida-grasa", label: "Perder grasa", icon: Target },
]

const daysOptions = [2, 3, 4, 5, 6]

const equipmentOptions = [
  { id: "gym", label: "Gimnasio completo" },
  { id: "home", label: "Casa con equipo" },
  { id: "minimal", label: "Equipo minimo" },
  { id: "bodyweight", label: "Solo peso corporal" },
]

const levelOptions = [
  { id: "principiante", label: "Principiante", desc: "0-6 meses" },
  { id: "intermedio", label: "Intermedio", desc: "6-24 meses" },
  { id: "avanzado", label: "Avanzado", desc: "2+ años" },
]

export function AIGenerationScreen({ onBack, onGenerate }: AIGenerationScreenProps) {
  const [selectedGoal, setSelectedGoal] = useState<string>("")
  const [selectedDays, setSelectedDays] = useState<number>(4)
  const [selectedEquipment, setSelectedEquipment] = useState<string>("")
  const [selectedLevel, setSelectedLevel] = useState<string>("")
  const [isGenerating, setIsGenerating] = useState(false)

  const handleGenerate = () => {
    setIsGenerating(true)
    // Simulate AI generation
    setTimeout(() => {
      setIsGenerating(false)
      onGenerate()
    }, 3000)
  }

  const canGenerate = selectedGoal && selectedEquipment && selectedLevel

  return (
    <div className="min-h-screen gradient-bg flex flex-col max-w-[430px] mx-auto lg:max-w-none">
      {/* Header */}
      <header className="px-4 pt-12 pb-4 lg:px-8 lg:pt-8">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ChevronLeft className="w-5 h-5" />
          <span>Volver</span>
        </button>
        
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center glow-primary animate-pulse-glow">
            <Sparkles className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Generar con IA</h1>
            <p className="text-muted-foreground">Crea tu plan personalizado</p>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 px-4 pb-32 lg:px-8 lg:pb-8">
        {/* Goal selection */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-foreground mb-4">Objetivo principal</h2>
          <div className="grid grid-cols-2 gap-3">
            {goals.map((goal) => {
              const Icon = goal.icon
              const isSelected = selectedGoal === goal.id
              return (
                <button
                  key={goal.id}
                  onClick={() => setSelectedGoal(goal.id)}
                  className={`glass-card p-4 rounded-xl text-left transition-all duration-200 card-hover ${
                    isSelected ? "ring-2 ring-primary glow-primary" : ""
                  }`}
                >
                  <div className={`w-10 h-10 rounded-lg mb-3 flex items-center justify-center ${
                    isSelected ? "bg-primary/20" : "bg-muted"
                  }`}>
                    <Icon className={`w-5 h-5 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                  </div>
                  <span className={`font-medium ${isSelected ? "text-foreground" : "text-muted-foreground"}`}>
                    {goal.label}
                  </span>
                </button>
              )
            })}
          </div>
        </section>

        {/* Days per week */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-foreground mb-4">Dias por semana</h2>
          <div className="flex gap-2">
            {daysOptions.map((days) => {
              const isSelected = selectedDays === days
              return (
                <button
                  key={days}
                  onClick={() => setSelectedDays(days)}
                  className={`flex-1 h-14 rounded-xl font-semibold transition-all duration-200 ${
                    isSelected
                      ? "bg-primary text-primary-foreground glow-primary"
                      : "glass-card text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {days}
                </button>
              )
            })}
          </div>
        </section>

        {/* Equipment */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-foreground mb-4">Equipamiento disponible</h2>
          <div className="flex flex-col gap-2">
            {equipmentOptions.map((eq) => {
              const isSelected = selectedEquipment === eq.id
              return (
                <button
                  key={eq.id}
                  onClick={() => setSelectedEquipment(eq.id)}
                  className={`glass-card p-4 rounded-xl text-left transition-all duration-200 ${
                    isSelected ? "ring-2 ring-primary" : ""
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`font-medium ${isSelected ? "text-foreground" : "text-muted-foreground"}`}>
                      {eq.label}
                    </span>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      isSelected ? "border-primary bg-primary" : "border-muted-foreground"
                    }`}>
                      {isSelected && (
                        <svg className="w-3 h-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </section>

        {/* Level */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-foreground mb-4">Nivel de experiencia</h2>
          <div className="flex flex-col gap-2">
            {levelOptions.map((level) => {
              const isSelected = selectedLevel === level.id
              return (
                <button
                  key={level.id}
                  onClick={() => setSelectedLevel(level.id)}
                  className={`glass-card p-4 rounded-xl text-left transition-all duration-200 ${
                    isSelected ? "ring-2 ring-primary" : ""
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className={`font-medium block ${isSelected ? "text-foreground" : "text-muted-foreground"}`}>
                        {level.label}
                      </span>
                      <span className="text-sm text-muted-foreground">{level.desc}</span>
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      isSelected ? "border-primary bg-primary" : "border-muted-foreground"
                    }`}>
                      {isSelected && (
                        <svg className="w-3 h-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </section>
      </main>

      {/* Generate button */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] p-4 bg-gradient-to-t from-background via-background to-transparent lg:relative lg:max-w-none lg:translate-x-0 lg:left-0 lg:bg-none lg:px-8">
        <Button
          onClick={handleGenerate}
          disabled={!canGenerate || isGenerating}
          className="w-full h-14 rounded-xl text-base font-semibold glow-primary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Generando tu plan...
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5 mr-2" />
              Generar plan de entrenamiento
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
