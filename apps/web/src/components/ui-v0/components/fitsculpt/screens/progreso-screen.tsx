"use client"

import { useState } from "react"
import { Scale, Zap, Moon, Dumbbell, Clock, TrendingUp, TrendingDown, Minus, Camera, Ruler } from "@/components/ui-v0/icons"
import { Button } from "@/components/ui-v0/button"
import { SuccessToast } from "../ui/ui-states"

interface ProgresoScreenProps {
  isDesktop?: boolean
}

type TabType = "checkin" | "nutricion" | "entreno"

const historialPeso = [
  { fecha: "Lun", peso: 83.2 },
  { fecha: "Mar", peso: 83.0 },
  { fecha: "Mie", peso: 82.8 },
  { fecha: "Jue", peso: 83.1 },
  { fecha: "Vie", peso: 82.7 },
  { fecha: "Sab", peso: 82.5 },
  { fecha: "Hoy", peso: 82.4 },
]

const historialEntreno = [
  { fecha: "Hoy", nombre: "Upper Body", duracion: 42, completado: true },
  { fecha: "Ayer", nombre: "Lower Body", duracion: 45, completado: true },
  { fecha: "Lun", nombre: "Full Body", duracion: 38, completado: true },
  { fecha: "Dom", nombre: "Descanso", duracion: 0, completado: false },
  { fecha: "Sab", nombre: "Core + Cardio", duracion: 35, completado: true },
]

export function ProgresoScreen({ isDesktop }: ProgresoScreenProps) {
  const [activeTab, setActiveTab] = useState<TabType>("checkin")
  const [checkInData, setCheckInData] = useState({
    peso: "",
    cintura: "",
    biceps: "",
    pecho: "",
    energia: 3,
    sueno: 3,
  })
  const [showSuccess, setShowSuccess] = useState(false)

  const handleSaveCheckIn = () => {
    setShowSuccess(true)
    setTimeout(() => setShowSuccess(false), 2000)
  }

  const renderTabs = () => (
    <div className="flex gap-1 p-1 bg-muted rounded-xl mb-6">
      <button
        onClick={() => setActiveTab("checkin")}
        className={`flex-1 py-2.5 px-3 rounded-lg text-sm font-medium transition-all ${
          activeTab === "checkin" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
        }`}
      >
        Check-in
      </button>
      <button
        onClick={() => setActiveTab("nutricion")}
        className={`flex-1 py-2.5 px-3 rounded-lg text-sm font-medium transition-all ${
          activeTab === "nutricion" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
        }`}
      >
        Nutricion
      </button>
      <button
        onClick={() => setActiveTab("entreno")}
        className={`flex-1 py-2.5 px-3 rounded-lg text-sm font-medium transition-all ${
          activeTab === "entreno" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
        }`}
      >
        Entreno
      </button>
    </div>
  )

  const renderCheckInTab = () => (
    <div className={isDesktop ? "grid grid-cols-2 gap-6" : ""}>
      <div className="space-y-4">
        <SuccessToast message="Check-in guardado" isVisible={showSuccess} />
        
        {/* Weight trend chart */}
        <div className="glass-card rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-foreground">Peso esta semana</h3>
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-accent/10 rounded-full">
              <TrendingDown className="w-4 h-4 text-accent" />
              <span className="text-sm font-medium text-accent">-0.8 kg</span>
            </div>
          </div>
          
          {/* Chart */}
          <div className="flex items-end justify-between h-28 gap-2">
            {historialPeso.map((dia, index) => {
              const maxPeso = Math.max(...historialPeso.map((d) => d.peso))
              const minPeso = Math.min(...historialPeso.map((d) => d.peso))
              const range = maxPeso - minPeso || 1
              const height = ((dia.peso - minPeso) / range) * 100
              const isToday = dia.fecha === "Hoy"
              
              return (
                <div key={index} className="flex-1 flex flex-col items-center gap-2">
                  <span className="text-xs text-muted-foreground">{dia.peso}</span>
                  <div
                    className={`w-full rounded-t-md transition-all duration-300 ${
                      isToday ? "bg-primary glow-primary" : "bg-muted hover:bg-muted/80"
                    }`}
                    style={{ height: `${Math.max(height, 20)}%` }}
                  />
                  <span className="text-[10px] text-muted-foreground">{dia.fecha}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Weekly check-in form */}
        <div className="glass-card rounded-2xl p-5">
          <h3 className="font-semibold text-foreground mb-4">Check-in semanal</h3>
          
          {/* Measurements */}
          <div className="space-y-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                  <Scale className="w-5 h-5 text-primary" />
                </div>
                <span className="text-foreground">Peso (kg)</span>
              </div>
              <input
                type="number"
                value={checkInData.peso}
                onChange={(e) => setCheckInData({ ...checkInData, peso: e.target.value })}
                placeholder="82.4"
                step="0.1"
                className="w-24 h-11 px-4 text-right bg-muted rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                  <Ruler className="w-5 h-5 text-muted-foreground" />
                </div>
                <span className="text-foreground">Cintura (cm)</span>
              </div>
              <input
                type="number"
                value={checkInData.cintura}
                onChange={(e) => setCheckInData({ ...checkInData, cintura: e.target.value })}
                placeholder="85"
                className="w-24 h-11 px-4 text-right bg-muted rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                  <Ruler className="w-5 h-5 text-muted-foreground" />
                </div>
                <span className="text-foreground">Biceps (cm)</span>
              </div>
              <input
                type="number"
                value={checkInData.biceps}
                onChange={(e) => setCheckInData({ ...checkInData, biceps: e.target.value })}
                placeholder="36"
                className="w-24 h-11 px-4 text-right bg-muted rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                  <Ruler className="w-5 h-5 text-muted-foreground" />
                </div>
                <span className="text-foreground">Pecho (cm)</span>
              </div>
              <input
                type="number"
                value={checkInData.pecho}
                onChange={(e) => setCheckInData({ ...checkInData, pecho: e.target.value })}
                placeholder="100"
                className="w-24 h-11 px-4 text-right bg-muted rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          {/* Photo upload */}
          <div className="mb-6">
            <button className="w-full h-24 border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-primary hover:text-primary transition-all">
              <Camera className="w-6 h-6" />
              <span className="text-sm font-medium">Foto de progreso (opcional)</span>
            </button>
          </div>

          <Button onClick={handleSaveCheckIn} className="w-full h-12 rounded-xl glow-primary">
            Guardar check-in
          </Button>
        </div>
      </div>

      {/* Sidebar stats - Desktop only */}
      {isDesktop && (
        <div className="space-y-4">
          {/* Wellness ratings */}
          <div className="glass-card rounded-2xl p-5">
            <h3 className="font-semibold text-foreground mb-4">Bienestar de hoy</h3>
            
            <div className="space-y-4">
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center">
                    <Zap className="w-5 h-5 text-accent" />
                  </div>
                  <span className="text-foreground">Energia</span>
                </div>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((level) => (
                    <button
                      key={level}
                      onClick={() => setCheckInData({ ...checkInData, energia: level })}
                      className={`flex-1 h-11 rounded-xl text-sm font-medium transition-all ${
                        checkInData.energia === level
                          ? "bg-accent text-accent-foreground"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      }`}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                    <Moon className="w-5 h-5 text-primary" />
                  </div>
                  <span className="text-foreground">Calidad de sueno</span>
                </div>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((level) => (
                    <button
                      key={level}
                      onClick={() => setCheckInData({ ...checkInData, sueno: level })}
                      className={`flex-1 h-11 rounded-xl text-sm font-medium transition-all ${
                        checkInData.sueno === level
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      }`}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Progress summary */}
          <div className="glass-card rounded-2xl p-5">
            <h3 className="font-semibold text-foreground mb-4">Tu progreso</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-muted/50 rounded-xl">
                <span className="text-muted-foreground">Peso inicial</span>
                <span className="font-semibold text-foreground">85.0 kg</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-muted/50 rounded-xl">
                <span className="text-muted-foreground">Peso actual</span>
                <span className="font-semibold text-foreground">82.4 kg</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-accent/10 rounded-xl">
                <span className="text-muted-foreground">Perdido total</span>
                <span className="font-semibold text-accent">-2.6 kg</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )

  const renderNutricionTab = () => (
    <div className={isDesktop ? "grid grid-cols-2 gap-6" : "space-y-4"}>
      {/* Weekly average */}
      <div className="glass-card rounded-2xl p-5">
        <h3 className="font-semibold text-foreground mb-4">Promedio semanal</h3>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-muted/50 rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Calorias</span>
              <div className="flex items-center gap-1 text-accent">
                <TrendingUp className="w-3 h-3" />
                <span className="text-xs font-medium">+5%</span>
              </div>
            </div>
            <p className="text-2xl font-bold text-foreground">2,150</p>
            <p className="text-xs text-muted-foreground">kcal/dia</p>
          </div>
          
          <div className="p-4 bg-muted/50 rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Proteina</span>
              <div className="flex items-center gap-1 text-muted-foreground">
                <Minus className="w-3 h-3" />
                <span className="text-xs">0%</span>
              </div>
            </div>
            <p className="text-2xl font-bold text-foreground">142</p>
            <p className="text-xs text-muted-foreground">g/dia</p>
          </div>
        </div>
      </div>

      {/* Compliance */}
      <div className="glass-card rounded-2xl p-5">
        <h3 className="font-semibold text-foreground mb-4">Cumplimiento</h3>
        
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-muted-foreground">Dias registrados</span>
              <span className="text-foreground font-medium">6 de 7</span>
            </div>
            <div className="h-3 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full w-[86%] transition-all duration-500" />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-muted-foreground">Meta de proteina</span>
              <span className="text-foreground font-medium">95%</span>
            </div>
            <div className="h-3 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-accent rounded-full w-[95%] transition-all duration-500" />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-muted-foreground">Meta de calorias</span>
              <span className="text-foreground font-medium">88%</span>
            </div>
            <div className="h-3 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-chart-3 rounded-full w-[88%] transition-all duration-500" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  const renderEntrenoTab = () => (
    <div className={isDesktop ? "grid grid-cols-3 gap-6" : "space-y-4"}>
      {/* Stats */}
      <div className={isDesktop ? "col-span-2 grid grid-cols-2 gap-4" : "grid grid-cols-2 gap-3"}>
        <div className="glass-card rounded-2xl p-5">
          <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center mb-3">
            <Dumbbell className="w-6 h-6 text-primary" />
          </div>
          <p className="text-3xl font-bold text-foreground">12</p>
          <p className="text-sm text-muted-foreground">Sesiones completadas</p>
        </div>
        <div className="glass-card rounded-2xl p-5">
          <div className="w-12 h-12 rounded-xl bg-accent/20 flex items-center justify-center mb-3">
            <Clock className="w-6 h-6 text-accent" />
          </div>
          <p className="text-3xl font-bold text-foreground">7.5h</p>
          <p className="text-sm text-muted-foreground">Tiempo total</p>
        </div>
        <div className="glass-card rounded-2xl p-5">
          <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mb-3">
            <TrendingUp className="w-6 h-6 text-muted-foreground" />
          </div>
          <p className="text-3xl font-bold text-foreground">2,450</p>
          <p className="text-sm text-muted-foreground">Volumen total (kg)</p>
        </div>
        <div className="glass-card rounded-2xl p-5">
          <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mb-3">
            <Dumbbell className="w-6 h-6 text-muted-foreground" />
          </div>
          <p className="text-3xl font-bold text-foreground">85%</p>
          <p className="text-sm text-muted-foreground">Consistencia</p>
        </div>
      </div>

      {/* History */}
      <div className="glass-card rounded-2xl p-5">
        <h3 className="font-semibold text-foreground mb-4">Historial reciente</h3>
        
        <div className="flex flex-col gap-3">
          {historialEntreno.map((sesion, index) => (
            <div
              key={index}
              className="flex items-center justify-between py-3 border-b border-border last:border-0 last:pb-0"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-2.5 h-2.5 rounded-full ${
                    sesion.completado ? "bg-primary glow-primary" : "bg-muted"
                  }`}
                />
                <div>
                  <p className="font-medium text-foreground">{sesion.nombre}</p>
                  <p className="text-xs text-muted-foreground">{sesion.fecha}</p>
                </div>
              </div>
              {sesion.duracion > 0 && (
                <span className="text-sm text-muted-foreground">{sesion.duracion} min</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  return (
    <div className={`px-4 pt-12 pb-4 ${isDesktop ? "lg:px-8 lg:pt-8" : ""}`}>
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-foreground lg:text-3xl">Progreso</h1>
        <p className="text-muted-foreground">Tu evolucion esta semana</p>
      </header>

      {renderTabs()}

      {activeTab === "checkin" && renderCheckInTab()}
      {activeTab === "nutricion" && renderNutricionTab()}
      {activeTab === "entreno" && renderEntrenoTab()}
    </div>
  )
}
