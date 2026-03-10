"use client"

import { useState } from "react"
import { Search, ChevronLeft, X, Bookmark, BookmarkCheck } from "@/components/ui-v0/icons"
import { Button } from "@/components/ui-v0/button"
import { SuccessToast } from "../ui/ui-states"

interface BibliotecaScreenProps {
  onBack: () => void
}

const gruposMusculares = [
  "Todos",
  "Pecho",
  "Espalda",
  "Hombros",
  "Biceps",
  "Triceps",
  "Piernas",
  "Core",
]

const ejercicios = [
  {
    id: "1",
    nombre: "Press de banca",
    musculos: ["Pecho", "Triceps", "Hombros"],
    cues: [
      "Mantén los omoplatos retraidos y apoyados en el banco",
      "Baja la barra hasta tocar el pecho a la altura de los pezones",
      "Empuja explosivamente manteniendo los codos a 45 grados",
    ],
    guardado: true,
  },
  {
    id: "2",
    nombre: "Sentadilla",
    musculos: ["Piernas", "Core"],
    cues: [
      "Pies a la anchura de los hombros, puntas ligeramente hacia afuera",
      "Inicia el movimiento empujando las caderas hacia atras",
      "Mantén el core activado y la espalda neutral durante todo el movimiento",
    ],
    guardado: false,
  },
  {
    id: "3",
    nombre: "Peso muerto",
    musculos: ["Espalda", "Piernas", "Core"],
    cues: [
      "Barra pegada a las espinillas, hombros sobre la barra",
      "Empuja el suelo con los pies mientras extiendes las caderas",
      "Aprieta gluteos al final del movimiento",
    ],
    guardado: false,
  },
  {
    id: "4",
    nombre: "Dominadas",
    musculos: ["Espalda", "Biceps"],
    cues: [
      "Agarre ligeramente más ancho que los hombros",
      "Inicia el movimiento retrayendo los omoplatos",
      "Sube hasta que la barbilla supere la barra",
    ],
    guardado: true,
  },
  {
    id: "5",
    nombre: "Press militar",
    musculos: ["Hombros", "Triceps"],
    cues: [
      "Core activado, glúteos apretados",
      "Empuja la barra verticalmente pasando cerca de la cara",
      "Bloquea los codos arriba sin hiperextender",
    ],
    guardado: false,
  },
  {
    id: "6",
    nombre: "Curl de biceps",
    musculos: ["Biceps"],
    cues: [
      "Codos pegados al cuerpo sin moverse",
      "Controla la fase excéntrica (bajada)",
      "Aprieta el biceps en la parte superior del movimiento",
    ],
    guardado: false,
  },
]

export function BibliotecaScreen({ onBack }: BibliotecaScreenProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedGrupo, setSelectedGrupo] = useState("Todos")
  const [selectedEjercicio, setSelectedEjercicio] = useState<typeof ejercicios[0] | null>(null)
  const [savedExercises, setSavedExercises] = useState<string[]>(
    ejercicios.filter((e) => e.guardado).map((e) => e.id)
  )
  const [showSuccess, setShowSuccess] = useState(false)

  const filteredEjercicios = ejercicios.filter((ejercicio) => {
    const matchesSearch = ejercicio.nombre.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesGrupo = selectedGrupo === "Todos" || ejercicio.musculos.includes(selectedGrupo)
    return matchesSearch && matchesGrupo
  })

  const toggleSave = (id: string) => {
    if (savedExercises.includes(id)) {
      setSavedExercises(savedExercises.filter((e) => e !== id))
    } else {
      setSavedExercises([...savedExercises, id])
      setShowSuccess(true)
      setTimeout(() => setShowSuccess(false), 2000)
    }
  }

  if (selectedEjercicio) {
    const isSaved = savedExercises.includes(selectedEjercicio.id)

    return (
      <div className="min-h-screen bg-background flex flex-col max-w-[430px] mx-auto">
        <SuccessToast message="Ejercicio guardado" isVisible={showSuccess} />
        
        <header className="px-4 pt-12 pb-4">
          <button
            onClick={() => setSelectedEjercicio(null)}
            className="flex items-center gap-1 text-muted-foreground mb-4"
          >
            <ChevronLeft className="w-5 h-5" />
            <span className="text-sm">Volver</span>
          </button>
        </header>

        <main className="flex-1 px-4">
          <h1 className="text-2xl font-bold text-foreground mb-2">{selectedEjercicio.nombre}</h1>
          
          {/* Muscles */}
          <div className="flex flex-wrap gap-2 mb-6">
            {selectedEjercicio.musculos.map((musculo) => (
              <span
                key={musculo}
                className="px-3 py-1 bg-primary/10 text-primary text-sm rounded-full"
              >
                {musculo}
              </span>
            ))}
          </div>

          {/* Cues */}
          <div className="bg-card rounded-2xl p-4 border border-border mb-6">
            <h3 className="font-semibold text-foreground mb-4">Puntos clave</h3>
            <ul className="space-y-3">
              {selectedEjercicio.cues.map((cue, index) => (
                <li key={index} className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-medium text-primary">{index + 1}</span>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">{cue}</p>
                </li>
              ))}
            </ul>
          </div>
        </main>

        <div className="px-4 pb-8 safe-area-bottom">
          <Button
            onClick={() => toggleSave(selectedEjercicio.id)}
            variant={isSaved ? "outline" : "default"}
            className="w-full h-14 rounded-xl text-base font-semibold"
          >
            {isSaved ? (
              <>
                <BookmarkCheck className="w-5 h-5 mr-2" />
                Guardado
              </>
            ) : (
              <>
                <Bookmark className="w-5 h-5 mr-2" />
                Guardar ejercicio
              </>
            )}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex flex-col max-w-[430px] mx-auto">
      <SuccessToast message="Ejercicio guardado" isVisible={showSuccess} />
      
      <header className="px-4 pt-12 pb-4">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-muted-foreground mb-4"
        >
          <ChevronLeft className="w-5 h-5" />
          <span className="text-sm">Volver</span>
        </button>
        <h1 className="text-2xl font-bold text-foreground">Biblioteca</h1>
        <p className="text-muted-foreground">Explora ejercicios</p>
      </header>

      <main className="flex-1 px-4">
        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar ejercicio..."
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

        {/* Filter chips */}
        <div className="flex gap-2 overflow-x-auto pb-4 -mx-4 px-4 scrollbar-hide">
          {gruposMusculares.map((grupo) => (
            <button
              key={grupo}
              onClick={() => setSelectedGrupo(grupo)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                selectedGrupo === grupo
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {grupo}
            </button>
          ))}
        </div>

        {/* Exercise list */}
        <div className="flex flex-col gap-3">
          {filteredEjercicios.map((ejercicio) => (
            <button
              key={ejercicio.id}
              onClick={() => setSelectedEjercicio(ejercicio)}
              className="w-full bg-card rounded-2xl p-4 border border-border text-left hover:border-primary/50 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground mb-1">{ejercicio.nombre}</h3>
                  <p className="text-sm text-muted-foreground">
                    {ejercicio.musculos.join(" • ")}
                  </p>
                </div>
                {savedExercises.includes(ejercicio.id) && (
                  <BookmarkCheck className="w-5 h-5 text-primary flex-shrink-0" />
                )}
              </div>
            </button>
          ))}

          {filteredEjercicios.length === 0 && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No se encontraron ejercicios</p>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
