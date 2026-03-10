"use client"

import { useState } from "react"
import { BottomNav } from "@/components/fitsculpt/bottom-nav"
import { OnboardingFlow } from "@/components/fitsculpt/onboarding/onboarding-flow"
import { HomeScreen } from "@/components/fitsculpt/screens/home-screen"
import { EntrenoScreen } from "@/components/fitsculpt/screens/entreno-screen"
import { NutricionScreen } from "@/components/fitsculpt/screens/nutricion-screen"
import { ProgresoScreen } from "@/components/fitsculpt/screens/progreso-screen"
import { PerfilScreen } from "@/components/fitsculpt/screens/perfil-screen"
import { BibliotecaScreen } from "@/components/fitsculpt/screens/biblioteca-screen"
import { PaywallScreen } from "@/components/fitsculpt/screens/paywall-screen"
import { SesionEnCurso } from "@/components/fitsculpt/screens/sesion-en-curso"
import { FinalizarSesion } from "@/components/fitsculpt/screens/finalizar-sesion"
import { RegistroComida } from "@/components/fitsculpt/screens/registro-comida"
import { AIGenerationScreen } from "@/components/fitsculpt/screens/ai-generation-screen"
import { DesktopSidebar } from "@/components/fitsculpt/desktop-sidebar"
import { useMediaQuery } from "@/hooks/use-media-query"

export type TabType = "hoy" | "entreno" | "nutricion" | "progreso" | "perfil"
export type ScreenType = TabType | "biblioteca" | "paywall" | "sesion" | "finalizar-sesion" | "registro-comida" | "ai-generation"

export default function FitSculptApp() {
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false)
  const [activeTab, setActiveTab] = useState<TabType>("hoy")
  const [currentScreen, setCurrentScreen] = useState<ScreenType>("hoy")
  const isDesktop = useMediaQuery("(min-width: 1024px)")

  const handleOnboardingComplete = () => {
    setHasCompletedOnboarding(true)
  }

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab)
    setCurrentScreen(tab)
  }

  const navigateTo = (screen: ScreenType) => {
    setCurrentScreen(screen)
    if (["hoy", "entreno", "nutricion", "progreso", "perfil"].includes(screen)) {
      setActiveTab(screen as TabType)
    }
  }

  if (!hasCompletedOnboarding) {
    return <OnboardingFlow onComplete={handleOnboardingComplete} />
  }

  const renderScreen = () => {
    switch (currentScreen) {
      case "hoy":
        return <HomeScreen onNavigate={navigateTo} isDesktop={isDesktop} />
      case "entreno":
        return <EntrenoScreen onNavigate={navigateTo} isDesktop={isDesktop} />
      case "nutricion":
        return <NutricionScreen onNavigate={navigateTo} isDesktop={isDesktop} />
      case "progreso":
        return <ProgresoScreen isDesktop={isDesktop} />
      case "perfil":
        return <PerfilScreen onNavigate={navigateTo} />
      case "biblioteca":
        return <BibliotecaScreen onBack={() => navigateTo("entreno")} />
      case "paywall":
        return <PaywallScreen onBack={() => navigateTo("perfil")} />
      case "sesion":
        return <SesionEnCurso onFinish={() => navigateTo("finalizar-sesion")} onBack={() => navigateTo("entreno")} />
      case "finalizar-sesion":
        return <FinalizarSesion onSave={() => navigateTo("entreno")} />
      case "registro-comida":
        return <RegistroComida onBack={() => navigateTo("nutricion")} onSave={() => navigateTo("nutricion")} />
      case "ai-generation":
        return <AIGenerationScreen onBack={() => navigateTo("entreno")} onGenerate={() => navigateTo("entreno")} />
      default:
        return <HomeScreen onNavigate={navigateTo} isDesktop={isDesktop} />
    }
  }

  const showBottomNav = !["biblioteca", "paywall", "sesion", "finalizar-sesion", "registro-comida", "ai-generation"].includes(currentScreen)

  // Desktop layout
  if (isDesktop) {
    return (
      <div className="min-h-screen gradient-bg flex">
        <DesktopSidebar activeTab={activeTab} onTabChange={handleTabChange} onNavigate={navigateTo} />
        <main className="flex-1 overflow-y-auto">
          {renderScreen()}
        </main>
      </div>
    )
  }

  // Mobile layout
  return (
    <div className="min-h-screen gradient-bg flex flex-col max-w-[430px] mx-auto relative">
      <main className={`flex-1 overflow-y-auto ${showBottomNav ? "pb-20" : ""}`}>
        {renderScreen()}
      </main>
      {showBottomNav && (
        <BottomNav activeTab={activeTab} onTabChange={handleTabChange} />
      )}
    </div>
  )
}
