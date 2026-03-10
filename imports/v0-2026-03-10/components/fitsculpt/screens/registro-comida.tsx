"use client"

import { useState } from "react"
import { Search, ChevronLeft, Plus, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SuccessToast } from "../ui/ui-states"

interface RegistroComidaProps {
  onBack: () => void
  onSave: () => void
}

const alimentosPopulares = [
  { id: "1", nombre: "Pollo a la plancha", calorias: 165, proteina: 31, porcion: "100g" },
  { id: "2", nombre: "Arroz blanco", calorias: 130, proteina: 2.7, porcion: "100g" },
  { id: "3", nombre: "Huevo entero", calorias: 78, proteina: 6, porcion: "1 unidad" },
  { id: "4", nombre: "Salmon", calorias: 208, proteina: 20, porcion: "100g" },
  { id: "5", nombre: "Avena", calorias: 68, proteina: 2.4, porcion: "100g" },
  { id: "6", nombre: "Platano", calorias: 89, proteina: 1.1, porcion: "1 unidad" },
]

export function RegistroComida({ onBack, onSave }: RegistroComidaProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedFood, setSelectedFood] = useState<typeof alimentosPopulares[0] | null>(null)
  const [cantidad, setCantidad] = useState("1")
  const [unidad, setUnidad] = useState("porcion")
  const [showSuccess, setShowSuccess] = useState(false)
  const [showManualEntry, setShowManualEntry] = useState(false)
  const [manualEntry, setManualEntry] = useState({
    nombre: "",
    calorias: "",
    proteina: "",
  })

  const filteredAlimentos = alimentosPopulares.filter((a) =>
    a.nombre.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleSave = () => {
    setShowSuccess(true)
    setTimeout(() => {
      setShowSuccess(false)
      onSave()
    }, 1500)
  }

  if (selectedFood) {
    const totalCalorias = Math.round(selectedFood.calorias * parseFloat(cantidad || "0"))
    const totalProteina = Math.round(selectedFood.proteina * parseFloat(cantidad || "0") * 10) / 10

    return (
      <div className="min-h-screen bg-background flex flex-col max-w-[430px] mx-auto">
        <SuccessToast message="Comida registrada" isVisible={showSuccess} />
        
        <header className="px-4 pt-12 pb-4">
          <button
            onClick={() => setSelectedFood(null)}
            className="flex items-center gap-1 text-muted-foreground mb-4"
          >
            <ChevronLeft className="w-5 h-5" />
            <span className="text-sm">Volver</span>
          </button>
          <h1 className="text-2xl font-bold text-foreground">{selectedFood.nombre}</h1>
          <p className="text-muted-foreground">{selectedFood.porcion}</p>
        </header>

        <main className="flex-1 px-4">
          {/* Quantity */}
          <div className="bg-card rounded-2xl p-4 border border-border mb-4">
            <label className="text-sm text-muted-foreground mb-2 block">Cantidad</label>
            <div className="flex gap-3">
              <input
                type="number"
                value={cantidad}
                onChange={(e) => setCantidad(e.target.value)}
                className="flex-1 h-12 px-4 bg-muted rounded-xl text-foreground text-lg font-medium focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <select
                value={unidad}
                onChange={(e) => setUnidad(e.target.value)}
                className="h-12 px-4 bg-muted rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="porcion">Porcion</option>
                <option value="gramos">Gramos</option>
                <option value="unidad">Unidad</option>
              </select>
            </div>
          </div>

          {/* Nutrition summary */}
          <div className="bg-card rounded-2xl p-4 border border-border mb-4">
            <h3 className="font-semibold text-foreground mb-4">Informacion nutricional</h3>
            <div className="flex justify-between py-2 border-b border-border">
              <span className="text-muted-foreground">Calorias</span>
              <span className="font-semibold text-foreground">{totalCalorias} kcal</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-muted-foreground">Proteina</span>
              <span className="font-semibold text-foreground">{totalProteina}g</span>
            </div>
          </div>
        </main>

        <div className="px-4 pb-8 safe-area-bottom">
          <Button onClick={handleSave} className="w-full h-14 rounded-xl text-base font-semibold">
            Guardar
          </Button>
        </div>
      </div>
    )
  }

  if (showManualEntry) {
    return (
      <div className="min-h-screen bg-background flex flex-col max-w-[430px] mx-auto">
        <SuccessToast message="Comida registrada" isVisible={showSuccess} />
        
        <header className="px-4 pt-12 pb-4">
          <button
            onClick={() => setShowManualEntry(false)}
            className="flex items-center gap-1 text-muted-foreground mb-4"
          >
            <ChevronLeft className="w-5 h-5" />
            <span className="text-sm">Volver</span>
          </button>
          <h1 className="text-2xl font-bold text-foreground">Entrada manual</h1>
          <p className="text-muted-foreground">Ingresa los datos del alimento</p>
        </header>

        <main className="flex-1 px-4">
          <div className="flex flex-col gap-4">
            <div className="bg-card rounded-2xl p-4 border border-border">
              <label className="text-sm text-muted-foreground mb-2 block">Nombre del alimento</label>
              <input
                type="text"
                value={manualEntry.nombre}
                onChange={(e) => setManualEntry({ ...manualEntry, nombre: e.target.value })}
                placeholder="Ej: Ensalada de pollo"
                className="w-full h-12 px-4 bg-muted rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="bg-card rounded-2xl p-4 border border-border">
              <label className="text-sm text-muted-foreground mb-2 block">Calorias (kcal)</label>
              <input
                type="number"
                value={manualEntry.calorias}
                onChange={(e) => setManualEntry({ ...manualEntry, calorias: e.target.value })}
                placeholder="0"
                className="w-full h-12 px-4 bg-muted rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="bg-card rounded-2xl p-4 border border-border">
              <label className="text-sm text-muted-foreground mb-2 block">Proteina (g)</label>
              <input
                type="number"
                value={manualEntry.proteina}
                onChange={(e) => setManualEntry({ ...manualEntry, proteina: e.target.value })}
                placeholder="0"
                className="w-full h-12 px-4 bg-muted rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
        </main>

        <div className="px-4 pb-8 safe-area-bottom">
          <Button
            onClick={handleSave}
            disabled={!manualEntry.nombre || !manualEntry.calorias}
            className="w-full h-14 rounded-xl text-base font-semibold"
          >
            Guardar
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex flex-col max-w-[430px] mx-auto">
      <header className="px-4 pt-12 pb-4">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-muted-foreground mb-4"
        >
          <ChevronLeft className="w-5 h-5" />
          <span className="text-sm">Volver</span>
        </button>
        <h1 className="text-2xl font-bold text-foreground">Registrar comida</h1>
        <p className="text-muted-foreground">Busca o anade manualmente</p>
      </header>

      <main className="flex-1 px-4">
        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar alimento..."
            className="w-full h-12 pl-12 pr-4 bg-card rounded-xl border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-4 top-1/2 -translate-y-1/2"
            >
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          )}
        </div>

        {/* Manual entry button */}
        <button
          onClick={() => setShowManualEntry(true)}
          className="w-full flex items-center gap-3 p-4 bg-card rounded-2xl border border-border mb-4"
        >
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Plus className="w-5 h-5 text-primary" />
          </div>
          <span className="font-medium text-foreground">Anadir manualmente</span>
        </button>

        {/* Popular foods */}
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-3">
            {searchQuery ? "Resultados" : "Alimentos populares"}
          </h3>
          <div className="flex flex-col gap-2">
            {filteredAlimentos.map((alimento) => (
              <button
                key={alimento.id}
                onClick={() => setSelectedFood(alimento)}
                className="w-full flex items-center justify-between p-4 bg-card rounded-2xl border border-border text-left hover:border-primary/50 transition-colors"
              >
                <div>
                  <h4 className="font-medium text-foreground">{alimento.nombre}</h4>
                  <p className="text-sm text-muted-foreground">
                    {alimento.calorias} kcal | {alimento.proteina}g proteina
                  </p>
                </div>
                <span className="text-xs text-muted-foreground">{alimento.porcion}</span>
              </button>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
