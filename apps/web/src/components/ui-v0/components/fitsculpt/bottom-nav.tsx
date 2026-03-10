"use client"

import { Home, Dumbbell, Apple, TrendingUp, User } from "@/components/ui-v0/icons"
import type { TabType } from "@/components/ui-v0/types"

interface BottomNavProps {
  activeTab: TabType
  onTabChange: (tab: TabType) => void
}

const tabs: { id: TabType; label: string; icon: typeof Home }[] = [
  { id: "hoy", label: "Hoy", icon: Home },
  { id: "entreno", label: "Entreno", icon: Dumbbell },
  { id: "nutricion", label: "Nutricion", icon: Apple },
  { id: "progreso", label: "Progreso", icon: TrendingUp },
  { id: "perfil", label: "Perfil", icon: User },
]

export function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] glass-card border-t border-border">
      <div className="flex items-center justify-around py-2 px-2 safe-area-bottom">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex flex-col items-center gap-1 py-2 px-4 rounded-xl transition-all duration-200 ${
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              aria-label={tab.label}
              aria-current={isActive ? "page" : undefined}
            >
              <div className={`relative ${isActive ? "glow-primary" : ""}`}>
                <Icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 2} />
                {isActive && (
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />
                )}
              </div>
              <span className="text-[10px] font-medium">{tab.label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
