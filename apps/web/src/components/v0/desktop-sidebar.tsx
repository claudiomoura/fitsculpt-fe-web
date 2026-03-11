"use client"

import { Home, Dumbbell, Apple, TrendingUp, User, Sparkles, BookOpen } from "lucide-react"
import type { TabType, ScreenType } from "@/app/page"

interface DesktopSidebarProps {
  activeTab: TabType
  onTabChange: (tab: TabType) => void
  onNavigate: (screen: ScreenType) => void
}

const mainTabs: { id: TabType; label: string; icon: typeof Home }[] = [
  { id: "hoy", label: "Hoy", icon: Home },
  { id: "entreno", label: "Entreno", icon: Dumbbell },
  { id: "nutricion", label: "Nutricion", icon: Apple },
  { id: "progreso", label: "Progreso", icon: TrendingUp },
  { id: "perfil", label: "Perfil", icon: User },
]

export function DesktopSidebar({ activeTab, onTabChange, onNavigate }: DesktopSidebarProps) {
  return (
    <aside className="w-64 h-screen sticky top-0 border-r border-border bg-card/50 backdrop-blur-xl flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center glow-primary">
            <Dumbbell className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="font-bold text-lg text-foreground">FitSculpt</h1>
            <p className="text-xs text-muted-foreground">Premium Fitness</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-4 px-3">
          Menu principal
        </p>
        <div className="flex flex-col gap-1">
          {mainTabs.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <Icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 2} />
                <span className="font-medium">{tab.label}</span>
              </button>
            )
          })}
        </div>

        <div className="mt-8">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-4 px-3">
            Herramientas
          </p>
          <div className="flex flex-col gap-1">
            <button
              onClick={() => onNavigate("ai-generation")}
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-200"
            >
              <Sparkles className="w-5 h-5" />
              <span className="font-medium">Generar con IA</span>
            </button>
            <button
              onClick={() => onNavigate("biblioteca")}
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-200"
            >
              <BookOpen className="w-5 h-5" />
              <span className="font-medium">Biblioteca</span>
            </button>
          </div>
        </div>
      </nav>

      {/* User info */}
      <div className="p-4 border-t border-border">
        <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
            <span className="text-sm font-bold text-primary-foreground">JD</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-foreground text-sm truncate">Juan Diego</p>
            <p className="text-xs text-muted-foreground">Plan Pro</p>
          </div>
        </div>
      </div>
    </aside>
  )
}
