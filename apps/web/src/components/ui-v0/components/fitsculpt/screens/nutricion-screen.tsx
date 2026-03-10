"use client"

import { useState } from "react"
import { Plus, ChevronRight, Settings, Apple, Utensils } from "@/components/ui-v0/icons"
import { Button } from "@/components/ui-v0/button"
import type { ScreenType } from "@/components/ui-v0/types"

interface NutricionScreenProps {
  onNavigate: (screen: ScreenType) => void
  isDesktop?: boolean
}

type ViewType = "hoy" | "semana"

interface MealData {
  id: string
  name: string
  calories: number
  protein: number
  carbs: number
  fat: number
  logged: boolean
}

const comidasHoy: MealData[] = [
  { id: "1", name: "Desayuno", calories: 450, protein: 25, carbs: 45, fat: 18, logged: true },
  { id: "2", name: "Almuerzo", calories: 650, protein: 40, carbs: 60, fat: 22, logged: true },
  { id: "3", name: "Cena", calories: 0, protein: 0, carbs: 0, fat: 0, logged: false },
  { id: "4", name: "Snacks", calories: 150, protein: 10, carbs: 15, fat: 5, logged: true },
]

const planSemanal = [
  { dia: "Lunes", comidas: ["Huevos revueltos", "Pollo a la plancha", "Salmon con verduras"] },
  { dia: "Martes", comidas: ["Avena con frutas", "Ensalada cesar", "Pasta con carne"] },
  { dia: "Miercoles", comidas: ["Tostadas con aguacate", "Bowl de arroz", "Tacos de pescado"] },
  { dia: "Jueves", comidas: ["Yogur con granola", "Wrap de pollo", "Filete con patatas"] },
  { dia: "Viernes", comidas: ["Smoothie de proteina", "Sushi", "Pizza casera"] },
  { dia: "Sabado", comidas: ["Pancakes", "Hamburguesa", "Paella"] },
  { dia: "Domingo", comidas: ["Brunch", "Libre", "Asado"] },
]

// Progress ring component
function ProgressRing({ progress, size = 120, strokeWidth = 10, color = "primary" }: { 
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

export function NutricionScreen({ onNavigate, isDesktop }: NutricionScreenProps) {
  const [currentView, setCurrentView] = useState<ViewType>("hoy")

  const totalCalories = comidasHoy.reduce((sum, m) => sum + m.calories, 0)
  const totalProtein = comidasHoy.reduce((sum, m) => sum + m.protein, 0)
  const totalCarbs = comidasHoy.reduce((sum, m) => sum + m.carbs, 0)
  const totalFat = comidasHoy.reduce((sum, m) => sum + m.fat, 0)
  const targetCalories = 2200
  const targetProtein = 150
  const targetCarbs = 250
  const targetFat = 70

  const renderHoyView = () => (
    <div className={`px-4 pt-12 pb-4 ${isDesktop ? "lg:px-8 lg:pt-8" : ""}`}>
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-foreground lg:text-3xl">Nutricion</h1>
        <p className="text-muted-foreground">Tu alimentacion de hoy</p>
      </header>

      {/* Desktop layout */}
      <div className={isDesktop ? "grid grid-cols-3 gap-6" : ""}>
        {/* Main content */}
        <div className={isDesktop ? "col-span-2 space-y-4" : "space-y-4"}>
          {/* View toggle */}
          <div className="flex gap-2 p-1 bg-muted rounded-xl">
            <button
              onClick={() => setCurrentView("hoy")}
              className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
                currentView === "hoy" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
              }`}
            >
              Hoy
            </button>
            <button
              onClick={() => setCurrentView("semana")}
              className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
                currentView === "semana" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
              }`}
            >
              Plan semanal
            </button>
          </div>

          {/* Progress card with ring */}
          <div className="glass-card rounded-2xl p-5">
            <div className="flex items-center gap-6">
              {/* Calories ring */}
              <div className="relative flex-shrink-0">
                <ProgressRing progress={(totalCalories / targetCalories) * 100} size={120} />
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-bold text-foreground">{totalCalories}</span>
                  <span className="text-xs text-muted-foreground">/ {targetCalories}</span>
                  <span className="text-[10px] text-muted-foreground">kcal</span>
                </div>
              </div>

              {/* Macros */}
              <div className="flex-1 space-y-3">
                {/* Protein */}
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-muted-foreground">Proteina</span>
                    <span className="text-foreground font-medium">{totalProtein}g / {targetProtein}g</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-accent rounded-full transition-all duration-500"
                      style={{ width: `${Math.min((totalProtein / targetProtein) * 100, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Carbs */}
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-muted-foreground">Carbohidratos</span>
                    <span className="text-foreground font-medium">{totalCarbs}g / {targetCarbs}g</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-500"
                      style={{ width: `${Math.min((totalCarbs / targetCarbs) * 100, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Fat */}
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-muted-foreground">Grasas</span>
                    <span className="text-foreground font-medium">{totalFat}g / {targetFat}g</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-chart-3 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min((totalFat / targetFat) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Meals list */}
          <div className="flex flex-col gap-3">
            {comidasHoy.map((comida) => (
              <div
                key={comida.id}
                className="glass-card rounded-2xl p-4 card-hover"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      comida.logged ? "bg-accent/20" : "bg-muted"
                    }`}>
                      <Utensils className={`w-5 h-5 ${comida.logged ? "text-accent" : "text-muted-foreground"}`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <h3 className="font-semibold text-foreground">{comida.name}</h3>
                        {comida.logged && (
                          <span className="px-2 py-0.5 bg-accent/10 text-accent text-xs rounded-full font-medium">
                            Registrado
                          </span>
                        )}
                      </div>
                      {comida.logged ? (
                        <p className="text-sm text-muted-foreground">
                          {comida.calories} kcal | {comida.protein}g prot | {comida.carbs}g carbs
                        </p>
                      ) : (
                        <p className="text-sm text-muted-foreground">Sin registrar</p>
                      )}
                    </div>
                  </div>
                  <Button
                    onClick={() => onNavigate("registro-comida")}
                    variant={comida.logged ? "outline" : "default"}
                    size="sm"
                    className={`rounded-xl ${!comida.logged ? "glow-primary" : "border-border"}`}
                  >
                    {comida.logged ? "Editar" : "Registrar"}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Sidebar - Desktop only */}
        {isDesktop && (
          <div className="space-y-4">
            {/* Quick add */}
            <Button 
              onClick={() => onNavigate("registro-comida")}
              className="w-full h-12 rounded-xl glow-primary"
            >
              <Plus className="w-5 h-5 mr-2" />
              Registrar comida
            </Button>

            {/* Daily summary */}
            <div className="glass-card rounded-2xl p-5">
              <h3 className="font-semibold text-foreground mb-4">Resumen del dia</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-muted/50 rounded-xl">
                  <span className="text-muted-foreground">Comidas registradas</span>
                  <span className="font-semibold text-foreground">3 / 4</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-muted/50 rounded-xl">
                  <span className="text-muted-foreground">Calorias restantes</span>
                  <span className="font-semibold text-primary">{targetCalories - totalCalories}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-muted/50 rounded-xl">
                  <span className="text-muted-foreground">Proteina restante</span>
                  <span className="font-semibold text-accent">{targetProtein - totalProtein}g</span>
                </div>
              </div>
            </div>

            {/* Tip */}
            <div className="glass-card rounded-2xl p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center">
                  <Apple className="w-5 h-5 text-accent" />
                </div>
                <h3 className="font-semibold text-foreground">Consejo del dia</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Te faltan {targetProtein - totalProtein}g de proteina. Considera una porcion de pollo o pescado para la cena.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )

  const renderSemanaView = () => (
    <div className={`px-4 pt-12 pb-4 ${isDesktop ? "lg:px-8 lg:pt-8" : ""}`}>
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-foreground lg:text-3xl">Nutricion</h1>
        <p className="text-muted-foreground">Tu plan semanal</p>
      </header>

      {/* View toggle */}
      <div className="flex gap-2 p-1 bg-muted rounded-xl mb-4">
        <button
          onClick={() => setCurrentView("hoy")}
          className="flex-1 py-2.5 px-4 rounded-lg text-sm font-medium text-muted-foreground"
        >
          Hoy
        </button>
        <button
          onClick={() => setCurrentView("semana")}
          className="flex-1 py-2.5 px-4 rounded-lg text-sm font-medium bg-card text-foreground shadow-sm"
        >
          Plan semanal
        </button>
      </div>

      {/* Weekly plan */}
      <div className={isDesktop ? "grid grid-cols-2 gap-4" : "flex flex-col gap-3"}>
        {planSemanal.map((dia, index) => (
          <div
            key={dia.dia}
            className="glass-card rounded-2xl p-4 card-hover"
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-foreground">{dia.dia}</h3>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </div>
            <div className="space-y-1">
              {dia.comidas.map((comida, i) => (
                <p key={i} className="text-sm text-muted-foreground flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                  {comida}
                </p>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Adjust week button */}
      <button className="w-full glass-card rounded-2xl p-4 mt-4 flex items-center justify-between card-hover">
        <div className="flex items-center gap-3">
          <Settings className="w-5 h-5 text-muted-foreground" />
          <span className="font-medium text-foreground">Ajustar plan semanal</span>
        </div>
        <ChevronRight className="w-5 h-5 text-muted-foreground" />
      </button>
    </div>
  )

  return currentView === "hoy" ? renderHoyView() : renderSemanaView()
}
