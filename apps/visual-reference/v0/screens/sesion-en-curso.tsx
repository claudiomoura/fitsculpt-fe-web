"use client"

import { useState, useEffect } from "react"
import { ChevronLeft, ChevronRight, Plus, Timer, X, Check } from "lucide-react"
import { Button } from "@/components/ui/button"

interface SesionEnCursoProps {
  onFinish: () => void
  onBack: () => void
}

const ejercicios = [
  { nombre: "Press de banca", targetSets: 4, targetReps: "8-10", musculos: ["Pecho", "Triceps"] },
  { nombre: "Remo con mancuernas", targetSets: 4, targetReps: "10-12", musculos: ["Espalda", "Biceps"] },
  { nombre: "Press militar", targetSets: 3, targetReps: "10", musculos: ["Hombros"] },
  { nombre: "Curl de biceps", targetSets: 3, targetReps: "12", musculos: ["Biceps"] },
  { nombre: "Extension de triceps", targetSets: 3, targetReps: "12", musculos: ["Triceps"] },
]

interface SetData {
  kg: string
  reps: string
  completed: boolean
}

export function SesionEnCurso({ onFinish, onBack }: SesionEnCursoProps) {
  const [currentExercise, setCurrentExercise] = useState(0)
  const [sets, setSets] = useState<SetData[][]>(
    ejercicios.map((e) =>
      Array.from({ length: e.targetSets }, () => ({
        kg: "",
        reps: "",
        completed: false,
      }))
    )
  )
  const [restTimer, setRestTimer] = useState<number | null>(null)
  const [showRestTimer, setShowRestTimer] = useState(false)

  const ejercicio = ejercicios[currentExercise]
  const currentSets = sets[currentExercise]

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (restTimer !== null && restTimer > 0) {
      interval = setInterval(() => {
        setRestTimer((prev) => (prev !== null && prev > 0 ? prev - 1 : null))
      }, 1000)
    } else if (restTimer === 0) {
      setShowRestTimer(false)
      setRestTimer(null)
    }
    return () => clearInterval(interval)
  }, [restTimer])

  const handleSetChange = (setIndex: number, field: "kg" | "reps", value: string) => {
    const newSets = [...sets]
    newSets[currentExercise][setIndex][field] = value
    setSets(newSets)
  }

  const handleSetComplete = (setIndex: number) => {
    const newSets = [...sets]
    newSets[currentExercise][setIndex].completed = !newSets[currentExercise][setIndex].completed
    setSets(newSets)
    
    if (!newSets[currentExercise][setIndex].completed) return
    
    setRestTimer(90)
    setShowRestTimer(true)
  }

  const addSet = () => {
    const newSets = [...sets]
    newSets[currentExercise].push({ kg: "", reps: "", completed: false })
    setSets(newSets)
  }

  const goToNextExercise = () => {
    if (currentExercise < ejercicios.length - 1) {
      setCurrentExercise(currentExercise + 1)
    } else {
      onFinish()
    }
  }

  const goToPrevExercise = () => {
    if (currentExercise > 0) {
      setCurrentExercise(currentExercise - 1)
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const completedSetsCount = currentSets.filter((s) => s.completed).length

  return (
    <div className="min-h-screen gradient-bg flex flex-col max-w-[430px] mx-auto">
      {/* Header */}
      <header className="px-4 pt-12 pb-4">
        <div className="flex items-center justify-between mb-4">
          <button onClick={onBack} className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-5 h-5" />
          </button>
          <p className="text-sm text-muted-foreground">
            Ejercicio {currentExercise + 1} de {ejercicios.length}
          </p>
          <div className="w-10" />
        </div>

        {/* Progress bar */}
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-300"
            style={{ width: `${((currentExercise + 1) / ejercicios.length) * 100}%` }}
          />
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 px-4 pb-32">
        {/* Exercise info */}
        <div className="glass-card rounded-2xl p-5 mb-4">
          <h1 className="text-2xl font-bold text-foreground mb-2">{ejercicio.nombre}</h1>
          <p className="text-muted-foreground mb-3">
            {ejercicio.targetSets} series x {ejercicio.targetReps} reps
          </p>
          <div className="flex gap-2">
            {ejercicio.musculos.map((musculo) => (
              <span key={musculo} className="text-xs px-3 py-1.5 bg-primary/10 text-primary rounded-full font-medium">
                {musculo}
              </span>
            ))}
          </div>
        </div>

        {/* Sets header */}
        <div className="grid grid-cols-12 gap-2 text-xs text-muted-foreground px-2 mb-3">
          <div className="col-span-2">Serie</div>
          <div className="col-span-4 text-center">Peso (kg)</div>
          <div className="col-span-4 text-center">Reps</div>
          <div className="col-span-2 text-center">Hecho</div>
        </div>

        {/* Sets */}
        <div className="flex flex-col gap-2 mb-4">
          {currentSets.map((set, index) => (
            <div
              key={index}
              className={`grid grid-cols-12 gap-2 items-center p-3 rounded-xl transition-all duration-200 ${
                set.completed
                  ? "glass-card ring-2 ring-primary"
                  : "glass-card"
              }`}
            >
              <div className="col-span-2">
                <span className={`font-semibold ${set.completed ? "text-primary" : "text-foreground"}`}>
                  {index + 1}
                </span>
              </div>
              <div className="col-span-4">
                <input
                  type="number"
                  value={set.kg}
                  onChange={(e) => handleSetChange(index, "kg", e.target.value)}
                  placeholder="--"
                  className="w-full h-11 px-3 text-center bg-muted rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                />
              </div>
              <div className="col-span-4">
                <input
                  type="number"
                  value={set.reps}
                  onChange={(e) => handleSetChange(index, "reps", e.target.value)}
                  placeholder="--"
                  className="w-full h-11 px-3 text-center bg-muted rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                />
              </div>
              <div className="col-span-2 flex justify-center">
                <button
                  onClick={() => handleSetComplete(index)}
                  className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-200 ${
                    set.completed
                      ? "bg-primary text-primary-foreground glow-primary"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  <Check className="w-5 h-5" strokeWidth={set.completed ? 3 : 2} />
                </button>
              </div>
            </div>
          ))}

          <button
            onClick={addSet}
            className="flex items-center justify-center gap-2 py-4 rounded-xl border-2 border-dashed border-border text-muted-foreground hover:border-primary hover:text-primary transition-all"
          >
            <Plus className="w-5 h-5" />
            <span className="font-medium">Anadir serie</span>
          </button>
        </div>

        {/* Progress indicator */}
        <div className="glass-card rounded-xl p-4 flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Series completadas</span>
          <span className="text-lg font-bold text-primary">{completedSetsCount} / {currentSets.length}</span>
        </div>
      </main>

      {/* Rest timer modal */}
      {showRestTimer && restTimer !== null && (
        <>
          <div className="fixed inset-0 bg-background/95 backdrop-blur-sm z-40" />
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="glass-card rounded-3xl p-8 text-center max-w-[320px] mx-4">
              <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center mx-auto mb-4">
                <Timer className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-xl font-semibold text-foreground mb-2">Descanso</h2>
              <p className="text-6xl font-bold text-primary mb-8 glow-primary">{formatTime(restTimer)}</p>
              <Button
                onClick={() => {
                  setShowRestTimer(false)
                  setRestTimer(null)
                }}
                variant="outline"
                className="rounded-xl h-12 px-8 border-border"
              >
                Saltar descanso
              </Button>
            </div>
          </div>
        </>
      )}

      {/* Sticky navigation */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] glass-card border-t border-border p-4 safe-area-bottom">
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={goToPrevExercise}
            disabled={currentExercise === 0}
            className="flex-1 h-14 rounded-xl border-border"
          >
            <ChevronLeft className="w-5 h-5 mr-1" />
            Anterior
          </Button>
          <Button
            onClick={goToNextExercise}
            className="flex-1 h-14 rounded-xl glow-primary"
          >
            {currentExercise === ejercicios.length - 1 ? "Finalizar" : "Siguiente"}
            {currentExercise < ejercicios.length - 1 && <ChevronRight className="w-5 h-5 ml-1" />}
          </Button>
        </div>
      </div>
    </div>
  )
}
