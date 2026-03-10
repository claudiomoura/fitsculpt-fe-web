"use client"

import { useState } from "react"
import { ChevronRight, ChevronLeft, Calendar, Dumbbell, Clock, CheckCircle2, Circle, Minus, Sparkles, BookOpen } from "@/components/ui-v0/icons"
import { Button } from "@/components/ui-v0/button"
import type { ScreenType } from "@/components/ui-v0/types"

interface EntrenoScreenProps {
  onNavigate: (screen: ScreenType) => void
  isDesktop?: boolean
}

type ViewType = "semana" | "mes" | "dia"

const diasSemana = ["L", "M", "X", "J", "V", "S", "D"]

const entrenosSemana = [
  { dia: 0, nombre: "Upper Body", duracion: "35 min", estado: "completado" },
  { dia: 1, nombre: "Lower Body", duracion: "40 min", estado: "completado" },
  { dia: 2, nombre: "Descanso", duracion: "", estado: "descanso" },
  { dia: 3, nombre: "Full Body", duracion: "45 min", estado: "pendiente" },
  { dia: 4, nombre: "Core + Cardio", duracion: "30 min", estado: "pendiente" },
  { dia: 5, nombre: "Descanso", duracion: "", estado: "descanso" },
  { dia: 6, nombre: "Descanso", duracion: "", estado: "descanso" },
]

const ejerciciosDia = [
  { nombre: "Press de banca", sets: 4, reps: "8-10", peso: "60 kg", musculos: ["Pecho", "Triceps"] },
  { nombre: "Remo con mancuernas", sets: 4, reps: "10-12", peso: "22 kg", musculos: ["Espalda", "Biceps"] },
  { nombre: "Press militar", sets: 3, reps: "10", peso: "40 kg", musculos: ["Hombros"] },
  { nombre: "Curl de biceps", sets: 3, reps: "12", peso: "12 kg", musculos: ["Biceps"] },
  { nombre: "Extension de triceps", sets: 3, reps: "12", peso: "15 kg", musculos: ["Triceps"] },
]

export function EntrenoScreen({ onNavigate, isDesktop }: EntrenoScreenProps) {
  const [currentView, setCurrentView] = useState<ViewType>("semana")
  const [selectedDay, setSelectedDay] = useState<number | null>(null)
  const [showBottomSheet, setShowBottomSheet] = useState(false)

  const proximoEntreno = entrenosSemana.find(e => e.estado === "pendiente")

  const handleDayClick = (dayIndex: number) => {
    const entreno = entrenosSemana[dayIndex]
    if (entreno.estado !== "descanso") {
      setSelectedDay(dayIndex)
      if (currentView === "mes") {
        setShowBottomSheet(true)
      } else {
        setCurrentView("dia")
      }
    }
  }

  const renderSemanaView = () => (
    <div className={`px-4 pt-12 pb-4 ${isDesktop ? "lg:px-8 lg:pt-8" : ""}`}>
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-foreground lg:text-3xl">Entreno</h1>
        <p className="text-muted-foreground">Tu semana de entrenamiento</p>
      </header>

      {/* Desktop layout */}
      <div className={isDesktop ? "grid grid-cols-3 gap-6" : ""}>
        {/* Main content */}
        <div className={isDesktop ? "col-span-2 space-y-4" : "space-y-4"}>
          {/* View toggle */}
          <div className="flex gap-2 p-1 bg-muted rounded-xl">
            <button
              onClick={() => setCurrentView("semana")}
              className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
                currentView === "semana" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
              }`}
            >
              Semana
            </button>
            <button
              onClick={() => setCurrentView("mes")}
              className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
                currentView === "mes" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
              }`}
            >
              Mes
            </button>
          </div>

          {/* Week calendar */}
          <div className="glass-card rounded-2xl p-5">
            <div className="flex justify-between mb-4">
              {diasSemana.map((dia, index) => {
                const entreno = entrenosSemana[index]
                return (
                  <button
                    key={dia}
                    onClick={() => handleDayClick(index)}
                    className="flex flex-col items-center gap-2 group"
                  >
                    <span className="text-xs text-muted-foreground">{dia}</span>
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 ${
                        entreno.estado === "completado"
                          ? "bg-primary glow-primary"
                          : entreno.estado === "pendiente"
                          ? "bg-muted border-2 border-primary group-hover:bg-primary/10"
                          : "bg-muted"
                      }`}
                    >
                      {entreno.estado === "completado" && (
                        <CheckCircle2 className="w-5 h-5 text-primary-foreground" />
                      )}
                      {entreno.estado === "pendiente" && (
                        <Circle className="w-5 h-5 text-primary" />
                      )}
                      {entreno.estado === "descanso" && (
                        <Minus className="w-5 h-5 text-muted-foreground" />
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
            
            {/* Legend */}
            <div className="flex justify-center gap-6 pt-4 border-t border-border">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-primary" />
                <span className="text-xs text-muted-foreground">Completado</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full border-2 border-primary" />
                <span className="text-xs text-muted-foreground">Programado</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-muted" />
                <span className="text-xs text-muted-foreground">Descanso</span>
              </div>
            </div>
          </div>

          {/* Proximo entrenamiento */}
          {proximoEntreno && (
            <div className="glass-card rounded-2xl p-5 card-hover">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-4">Proximo entrenamiento</p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-xl bg-primary/20 flex items-center justify-center">
                    <Dumbbell className="w-7 h-7 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg text-foreground">{proximoEntreno.nombre}</h3>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      <span>{proximoEntreno.duracion}</span>
                      <span className="mx-1">|</span>
                      <span>5 ejercicios</span>
                    </div>
                  </div>
                </div>
                <Button onClick={() => onNavigate("sesion")} className="rounded-xl h-11 px-6 glow-primary">
                  Empezar
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar - Desktop only */}
        {isDesktop && (
          <div className="space-y-4">
            {/* AI Generation Card */}
            <button
              onClick={() => onNavigate("ai-generation")}
              className="w-full glass-card rounded-2xl p-5 text-left card-hover group"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center glow-primary">
                  <Sparkles className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                    Generar con IA
                  </h3>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Crea un plan de entrenamiento personalizado con inteligencia artificial
              </p>
            </button>

            {/* Biblioteca link */}
            <button
              onClick={() => onNavigate("biblioteca")}
              className="w-full glass-card rounded-2xl p-5 text-left card-hover group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                    <BookOpen className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <span className="font-medium text-foreground group-hover:text-primary transition-colors">
                    Biblioteca de ejercicios
                  </span>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </div>
            </button>

            {/* Stats */}
            <div className="glass-card rounded-2xl p-5">
              <h3 className="font-semibold text-foreground mb-4">Esta semana</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-muted/50 rounded-xl">
                  <p className="text-2xl font-bold text-primary">2</p>
                  <p className="text-xs text-muted-foreground">Completados</p>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-xl">
                  <p className="text-2xl font-bold text-foreground">3</p>
                  <p className="text-xs text-muted-foreground">Pendientes</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Mobile-only links */}
      {!isDesktop && (
        <div className="mt-4 space-y-3">
          <button
            onClick={() => onNavigate("ai-generation")}
            className="w-full glass-card rounded-2xl p-4 flex items-center justify-between card-hover"
          >
            <div className="flex items-center gap-3">
              <Sparkles className="w-5 h-5 text-primary" />
              <span className="font-medium text-foreground">Generar con IA</span>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </button>
          
          <button
            onClick={() => onNavigate("biblioteca")}
            className="w-full glass-card rounded-2xl p-4 flex items-center justify-between card-hover"
          >
            <div className="flex items-center gap-3">
              <BookOpen className="w-5 h-5 text-muted-foreground" />
              <span className="font-medium text-foreground">Biblioteca de ejercicios</span>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>
      )}
    </div>
  )

  const renderMesView = () => {
    const daysInMonth = 31
    const firstDayOffset = 2
    
    return (
      <div className={`px-4 pt-12 pb-4 ${isDesktop ? "lg:px-8 lg:pt-8" : ""}`}>
        <header className="mb-6">
          <h1 className="text-2xl font-bold text-foreground lg:text-3xl">Entreno</h1>
          <p className="text-muted-foreground">Marzo 2026</p>
        </header>

        {/* View toggle */}
        <div className="flex gap-2 p-1 bg-muted rounded-xl mb-4">
          <button
            onClick={() => setCurrentView("semana")}
            className="flex-1 py-2.5 px-4 rounded-lg text-sm font-medium text-muted-foreground"
          >
            Semana
          </button>
          <button
            onClick={() => setCurrentView("mes")}
            className="flex-1 py-2.5 px-4 rounded-lg text-sm font-medium bg-card text-foreground shadow-sm"
          >
            Mes
          </button>
        </div>

        {/* Month calendar */}
        <div className="glass-card rounded-2xl p-5 mb-4">
          <div className="grid grid-cols-7 gap-1 mb-2">
            {diasSemana.map((dia) => (
              <div key={dia} className="text-center text-xs text-muted-foreground py-2">
                {dia}
              </div>
            ))}
          </div>
          
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: firstDayOffset }).map((_, i) => (
              <div key={`empty-${i}`} className="aspect-square" />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1
              const isToday = day === 10
              const isCompleted = day < 10 && day % 2 === 0
              const isPending = day >= 10 && day <= 12
              
              return (
                <button
                  key={day}
                  onClick={() => handleDayClick(i % 7)}
                  className={`aspect-square rounded-lg flex items-center justify-center text-sm relative transition-all ${
                    isToday ? "bg-primary text-primary-foreground font-bold glow-primary" : "hover:bg-muted"
                  }`}
                >
                  {day}
                  {isCompleted && (
                    <div className="absolute bottom-1 w-1.5 h-1.5 rounded-full bg-primary" />
                  )}
                  {isPending && !isToday && (
                    <div className="absolute bottom-1 w-1.5 h-1.5 rounded-full border border-primary" />
                  )}
                </button>
              )
            })}
          </div>

          <div className="flex justify-center gap-6 pt-4 mt-4 border-t border-border">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-primary" />
              <span className="text-xs text-muted-foreground">Completado</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full border border-primary" />
              <span className="text-xs text-muted-foreground">Programado</span>
            </div>
          </div>
        </div>

        {/* Bottom Sheet */}
        {showBottomSheet && (
          <>
            <div 
              className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40"
              onClick={() => setShowBottomSheet(false)}
            />
            <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] glass-card rounded-t-3xl z-50 p-6 pb-safe animate-in slide-in-from-bottom duration-300">
              <div className="w-12 h-1 bg-muted rounded-full mx-auto mb-6" />
              <h3 className="text-xl font-bold text-foreground mb-2">Full Body</h3>
              <p className="text-muted-foreground mb-4">Jueves, 10 de marzo</p>
              <div className="flex items-center gap-4 text-sm text-muted-foreground mb-6">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4" />
                  <span>45 min</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Dumbbell className="w-4 h-4" />
                  <span>5 ejercicios</span>
                </div>
              </div>
              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  onClick={() => setShowBottomSheet(false)}
                  className="flex-1 rounded-xl h-12 border-border"
                >
                  Cerrar
                </Button>
                <Button 
                  onClick={() => {
                    setShowBottomSheet(false)
                    onNavigate("sesion")
                  }}
                  className="flex-1 rounded-xl h-12 glow-primary"
                >
                  Empezar
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    )
  }

  const renderDiaView = () => (
    <div className={`px-4 pt-12 pb-4 ${isDesktop ? "lg:px-8 lg:pt-8" : ""}`}>
      <header className="mb-6">
        <button
          onClick={() => setCurrentView("semana")}
          className="text-sm text-primary mb-2 flex items-center gap-1 hover:underline"
        >
          <ChevronLeft className="w-4 h-4" />
          Volver
        </button>
        <h1 className="text-2xl font-bold text-foreground">
          {selectedDay !== null ? entrenosSemana[selectedDay].nombre : "Full Body"}
        </h1>
        <p className="text-muted-foreground">Jueves, 10 de marzo</p>
      </header>

      {/* Stats */}
      <div className="flex gap-3 mb-6">
        <div className="flex-1 glass-card rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-foreground">5</p>
          <p className="text-xs text-muted-foreground">Ejercicios</p>
        </div>
        <div className="flex-1 glass-card rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-foreground">45</p>
          <p className="text-xs text-muted-foreground">Minutos</p>
        </div>
        <div className="flex-1 glass-card rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-foreground">17</p>
          <p className="text-xs text-muted-foreground">Series</p>
        </div>
      </div>

      {/* Exercises list */}
      <div className="flex flex-col gap-3 mb-6">
        {ejerciciosDia.map((ejercicio, index) => (
          <div
            key={index}
            className="glass-card rounded-2xl p-4 card-hover"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-foreground">{ejercicio.nombre}</h3>
                <p className="text-sm text-muted-foreground">
                  {ejercicio.sets} series x {ejercicio.reps} reps | {ejercicio.peso}
                </p>
                <div className="flex gap-2 mt-2">
                  {ejercicio.musculos.map((musculo) => (
                    <span key={musculo} className="text-xs px-2 py-1 bg-muted rounded-full text-muted-foreground">
                      {musculo}
                    </span>
                  ))}
                </div>
              </div>
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                <span className="text-sm font-medium text-muted-foreground">{index + 1}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Button 
        onClick={() => onNavigate("sesion")} 
        className="w-full h-14 rounded-xl text-base font-semibold glow-primary"
      >
        Empezar sesion
      </Button>
    </div>
  )

  switch (currentView) {
    case "mes":
      return renderMesView()
    case "dia":
      return renderDiaView()
    default:
      return renderSemanaView()
  }
}
