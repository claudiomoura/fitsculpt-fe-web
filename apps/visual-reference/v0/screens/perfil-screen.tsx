"use client"

import { ChevronRight, Crown, Globe, Scale, User, Shield, LogOut, Dumbbell } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { ScreenType } from "@/app/page"

interface PerfilScreenProps {
  onNavigate: (screen: ScreenType) => void
}

export function PerfilScreen({ onNavigate }: PerfilScreenProps) {
  const planActual = "Free"
  const objetivo = "Ganar Fuerza"
  const nivel = "Intermedio"

  return (
    <div className="px-4 pt-12 pb-4">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Perfil</h1>
        <p className="text-muted-foreground">Configuracion de tu cuenta</p>
      </header>

      {/* User info */}
      <div className="bg-card rounded-2xl p-4 border border-border mb-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">Usuario FitSculpt</h2>
            <p className="text-sm text-muted-foreground">usuario@email.com</p>
          </div>
        </div>
      </div>

      {/* Plan actual */}
      <div className="bg-card rounded-2xl p-4 border border-border mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Crown className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Plan {planActual}</h3>
              <p className="text-sm text-muted-foreground">Funciones basicas</p>
            </div>
          </div>
          <Button
            onClick={() => onNavigate("paywall")}
            size="sm"
            className="rounded-xl"
          >
            Actualizar
          </Button>
        </div>
      </div>

      {/* Tu plan */}
      <div className="bg-card rounded-2xl border border-border mb-4 overflow-hidden">
        <div className="p-4 border-b border-border">
          <h3 className="font-semibold text-foreground">Tu plan de entrenamiento</h3>
        </div>
        
        <button className="w-full flex items-center justify-between p-4 border-b border-border hover:bg-muted/50 transition-colors">
          <div className="flex items-center gap-3">
            <Dumbbell className="w-5 h-5 text-muted-foreground" />
            <div className="text-left">
              <p className="font-medium text-foreground">Objetivo</p>
              <p className="text-sm text-muted-foreground">{objetivo}</p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground" />
        </button>

        <button className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
          <div className="flex items-center gap-3">
            <Scale className="w-5 h-5 text-muted-foreground" />
            <div className="text-left">
              <p className="font-medium text-foreground">Nivel</p>
              <p className="text-sm text-muted-foreground">{nivel}</p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground" />
        </button>
      </div>

      {/* Preferencias */}
      <div className="bg-card rounded-2xl border border-border mb-4 overflow-hidden">
        <div className="p-4 border-b border-border">
          <h3 className="font-semibold text-foreground">Preferencias</h3>
        </div>
        
        <button className="w-full flex items-center justify-between p-4 border-b border-border hover:bg-muted/50 transition-colors">
          <div className="flex items-center gap-3">
            <Globe className="w-5 h-5 text-muted-foreground" />
            <div className="text-left">
              <p className="font-medium text-foreground">Idioma</p>
              <p className="text-sm text-muted-foreground">Espanol</p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground" />
        </button>

        <button className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
          <div className="flex items-center gap-3">
            <Scale className="w-5 h-5 text-muted-foreground" />
            <div className="text-left">
              <p className="font-medium text-foreground">Unidades</p>
              <p className="text-sm text-muted-foreground">Metrico (kg, cm)</p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground" />
        </button>
      </div>

      {/* Cuenta */}
      <div className="bg-card rounded-2xl border border-border mb-4 overflow-hidden">
        <div className="p-4 border-b border-border">
          <h3 className="font-semibold text-foreground">Cuenta</h3>
        </div>
        
        <button className="w-full flex items-center justify-between p-4 border-b border-border hover:bg-muted/50 transition-colors">
          <div className="flex items-center gap-3">
            <User className="w-5 h-5 text-muted-foreground" />
            <p className="font-medium text-foreground">Datos personales</p>
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground" />
        </button>

        <button className="w-full flex items-center justify-between p-4 border-b border-border hover:bg-muted/50 transition-colors">
          <div className="flex items-center gap-3">
            <Crown className="w-5 h-5 text-muted-foreground" />
            <p className="font-medium text-foreground">Suscripcion</p>
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground" />
        </button>

        <button className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5 text-muted-foreground" />
            <p className="font-medium text-foreground">Privacidad</p>
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground" />
        </button>
      </div>

      {/* Logout */}
      <button className="w-full flex items-center justify-center gap-2 p-4 rounded-2xl border border-destructive/30 text-destructive hover:bg-destructive/10 transition-colors">
        <LogOut className="w-5 h-5" />
        <span className="font-medium">Cerrar sesion</span>
      </button>
    </div>
  )
}
