"use client"

import { useState } from "react"
import { Dumbbell } from "@/components/ui-v0/icons"
import { OnboardingStep1 } from "./onboarding-step1"
import { OnboardingStep2 } from "./onboarding-step2"
import { OnboardingStep3 } from "./onboarding-step3"

interface OnboardingFlowProps {
  onComplete: () => void
}

export function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const [step, setStep] = useState(1)
  const [data, setData] = useState({
    objetivo: "",
    nivel: "",
    equipo: [] as string[],
    diasSemana: 3,
    restricciones: [] as string[],
  })

  const handleNext = () => {
    if (step < 3) {
      setStep(step + 1)
    } else {
      onComplete()
    }
  }

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1)
    }
  }

  const updateData = (newData: Partial<typeof data>) => {
    setData({ ...data, ...newData })
  }

  return (
    <div className="min-h-screen gradient-bg flex flex-col max-w-[430px] mx-auto">
      {/* Header with logo */}
      <div className="pt-safe px-6 pt-12">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center glow-primary">
            <Dumbbell className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="font-bold text-lg text-foreground">FitSculpt</h1>
            <p className="text-xs text-muted-foreground">Premium Fitness</p>
          </div>
        </div>

        {/* Progress indicator */}
        <div className="flex items-center gap-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                i <= step ? "bg-primary" : "bg-muted"
              } ${i === step ? "glow-primary" : ""}`}
            />
          ))}
        </div>
        <p className="text-muted-foreground text-sm mt-3">Paso {step} de 3</p>
      </div>

      {/* Step content */}
      <div className="flex-1 px-6 py-8">
        {step === 1 && (
          <OnboardingStep1
            selectedObjetivo={data.objetivo}
            onSelect={(objetivo) => updateData({ objetivo })}
            onNext={handleNext}
          />
        )}
        {step === 2 && (
          <OnboardingStep2
            selectedNivel={data.nivel}
            selectedEquipo={data.equipo}
            onSelectNivel={(nivel) => updateData({ nivel })}
            onSelectEquipo={(equipo) => updateData({ equipo })}
            onNext={handleNext}
            onBack={handleBack}
          />
        )}
        {step === 3 && (
          <OnboardingStep3
            diasSemana={data.diasSemana}
            restricciones={data.restricciones}
            onChangeDias={(diasSemana) => updateData({ diasSemana })}
            onChangeRestricciones={(restricciones) => updateData({ restricciones })}
            onComplete={handleNext}
            onBack={handleBack}
          />
        )}
      </div>
    </div>
  )
}
