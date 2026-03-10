"use client"

import { useState, useEffect } from "react"
import { Dumbbell, Apple, Scale, Flame, ChevronRight, Clock, TrendingUp, Sparkles } from "@/components/ui-v0/icons"
import { Button } from "@/components/ui-v0/button"
import { ListSkeleton, ErrorState, SuccessToast } from "../ui/ui-states"
import type { ScreenType } from "@/components/ui-v0/types"

interface HomeScreenProps {
  onNavigate: (screen: ScreenType) => void
  isDesktop?: boolean
}

// Progress ring component
function ProgressRing({ progress, size = 80, strokeWidth = 8, color = "primary" }: { 
  progress: number
  size?: number
  strokeWidth?: number
  color?: "primary" | "accent"
}) {
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const strokeDashoffset = circumference - (progress / 100) * circumference

  return (
    <svg width={size} height={size} className="progress-ring">
      <circle
        className="text-muted"
        strokeWidth={strokeWidth}
        stroke="currentColor"
        fill="transparent"
        r={radius}
        cx={size / 2}
        cy={size / 2}
      />
      <circle
        className={color === "accent" ? "text-accent" : "text-primary"}
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={strokeDashoffset}
        strokeLinecap="round"
        stroke="currentColor"
        fill="transparent"
        r={radius}
        cx={size / 2}
        cy={size / 2}
        style={{ transition: "stroke-dashoffset 0.5s ease" }}
      />
    </svg>
  )
}

export function HomeScreen({ onNavigate, isDesktop }: HomeScreenProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [completedTasks, setCompletedTasks] = useState(0)

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 800)
    return () => clearTimeout(timer)
  }, [])

  const handleRetry = () => {
    setHasError(false)
    setIsLoading(true)
    setTimeout(() => setIsLoading(false), 800)
  }

  if (isLoading) {
    return (
      <div className={`px-4 pt-12 pb-4 ${isDesktop ? "lg:px-8 lg:pt-8" : ""}`}>
        <div className="h-8 bg-muted rounded w-32 mb-2 animate-pulse" />
        <div className="h-4 bg-muted rounded w-48 mb-6 animate-pulse" />
        <ListSkeleton count={3} />
      </div>
    )
  }

  if (hasError) {
    return (
      <div className={`px-4 pt-12 ${isDesktop ? "lg:px-8 lg:pt-8" : ""}`}>
        <ErrorState onRetry={handleRetry} />
      </div>
    )
  }

  const caloriesConsumed = 1450
  const caloriesTarget = 2200
  const caloriesProgress = (caloriesConsumed / caloriesTarget) * 100
  const proteinConsumed = 80
  const proteinTarget = 150
  const proteinProgress = (proteinConsumed / proteinTarget) * 100

  return (
    <div className={`px-4 pt-12 pb-4 ${isDesktop ? "lg:px-8 lg:pt-8 lg:pb-8" : ""}`}>
      <SuccessToast message="Guardado correctamente" isVisible={showSuccess} />
      
      {/* Header */}
      <header className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground lg:text-3xl">Buenos dias, Juan</h1>
            <p className="text-muted-foreground">Tu plan de hoy esta listo</p>
          </div>
          <div className="flex items-center gap-2 glass-card px-4 py-2 rounded-xl">
            <Flame className="w-5 h-5 text-primary" />
            <div className="text-right">
              <p className="text-xl font-bold text-primary">7</p>
              <p className="text-[10px] text-muted-foreground leading-none">dias racha</p>
            </div>
          </div>
        </div>
      </header>

      {/* Desktop layout: 2 columns */}
      <div className={isDesktop ? "grid grid-cols-2 gap-6" : "flex flex-col gap-4"}>
        {/* Main content */}
        <div className="flex flex-col gap-4">
          {/* Entrenamiento Card */}
          <div className="glass-card rounded-2xl p-5 card-hover">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                <Dumbbell className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Entrenamiento de hoy</p>
                <h3 className="font-semibold text-lg text-foreground">Upper Body</h3>
              </div>
            </div>
            
            <div className="flex items-center gap-4 mb-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Clock className="w-4 h-4" />
                <span>45 min</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Dumbbell className="w-4 h-4" />
                <span>5 ejercicios</span>
              </div>
            </div>

            {/* Progress indicator */}
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-xl mb-4">
              <span className="text-sm text-muted-foreground">Progreso</span>
              <span className="text-sm font-medium text-foreground">0 / 5 ejercicios</span>
            </div>
            
            <Button 
              onClick={() => onNavigate("sesion")} 
              className="w-full h-12 rounded-xl font-semibold glow-primary"
            >
              Empezar entrenamiento
            </Button>
          </div>

          {/* Nutricion Card */}
          <div className="glass-card rounded-2xl p-5 card-hover">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-accent/20 flex items-center justify-center">
                  <Apple className="w-6 h-6 text-accent" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Nutricion</p>
                  <h3 className="font-semibold text-lg text-foreground">Calorias de hoy</h3>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-6 mb-4">
              {/* Calories ring */}
              <div className="relative">
                <ProgressRing progress={caloriesProgress} size={80} />
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-lg font-bold text-foreground">{caloriesConsumed}</span>
                  <span className="text-[10px] text-muted-foreground">kcal</span>
                </div>
              </div>

              {/* Macros */}
              <div className="flex-1 space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-muted-foreground">Proteina</span>
                    <span className="text-foreground font-medium">{proteinConsumed} / {proteinTarget}g</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-accent rounded-full transition-all duration-500"
                      style={{ width: `${proteinProgress}%` }}
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Te faltan {caloriesTarget - caloriesConsumed} kcal
                </p>
              </div>
            </div>

            <Button 
              onClick={() => onNavigate("registro-comida")} 
              variant="outline"
              className="w-full h-12 rounded-xl font-medium border-border hover:bg-muted"
            >
              Registrar comida
            </Button>
          </div>
        </div>

        {/* Side content */}
        <div className="flex flex-col gap-4">
          {/* Check-in Card */}
          <div className="glass-card rounded-2xl p-5 card-hover">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
                  <Scale className="w-6 h-6 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Check-in</p>
                  <h3 className="font-semibold text-lg text-foreground">Peso actual</h3>
                </div>
              </div>
            </div>

            <div className="flex items-baseline gap-1 mb-4">
              <span className="text-4xl font-bold text-foreground">82.4</span>
              <span className="text-lg text-muted-foreground">kg</span>
            </div>

            <Button 
              onClick={() => onNavigate("progreso")} 
              variant="outline"
              className="w-full h-12 rounded-xl font-medium border-border hover:bg-muted"
            >
              Registrar check-in semanal
            </Button>
          </div>

          {/* Progress Card */}
          <div className="glass-card rounded-2xl p-5 card-hover">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Progreso</p>
                  <h3 className="font-semibold text-lg text-foreground">Meta: -5 kg</h3>
                </div>
              </div>
            </div>

            <div className="mb-4">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted-foreground">Completado</span>
                <span className="text-primary font-medium">35%</span>
              </div>
              <div className="h-3 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full w-[35%] transition-all duration-500" />
              </div>
            </div>

            <Button 
              onClick={() => onNavigate("progreso")} 
              variant="outline"
              className="w-full h-12 rounded-xl font-medium border-border hover:bg-muted"
            >
              Ver progreso
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>

          {/* AI Generation CTA - Desktop only */}
          {isDesktop && (
            <button
              onClick={() => onNavigate("ai-generation")}
              className="glass-card rounded-2xl p-5 text-left card-hover group"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center glow-primary">
                  <Sparkles className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                    Generar con IA
                  </h3>
                  <p className="text-sm text-muted-foreground">Crea un plan personalizado</p>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
