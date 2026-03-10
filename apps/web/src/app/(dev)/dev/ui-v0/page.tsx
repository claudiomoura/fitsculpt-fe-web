"use client"

import { useState } from "react"
import { OnboardingFlow } from "@/components/ui-v0/components/fitsculpt/onboarding/onboarding-flow"
import { HomeScreen } from "@/components/ui-v0/components/fitsculpt/screens/home-screen"
import { EntrenoScreen } from "@/components/ui-v0/components/fitsculpt/screens/entreno-screen"
import type { ScreenType } from "@/components/ui-v0/types"

export default function UiV0DevPage() {
  const [screen, setScreen] = useState<ScreenType>("home")

  return (
    <main className="min-h-screen bg-background p-6 space-y-8">
      <section>
        <h1 className="text-2xl font-bold mb-4">ui-v0 smoke page</h1>
        <p className="text-sm text-muted-foreground">Solo para desarrollo: render base del kit importado desde v0/shadcn.</p>
      </section>

      <section className="rounded-2xl border border-border p-4">
        <h2 className="font-semibold mb-4">OnboardingFlow</h2>
        <OnboardingFlow onComplete={() => setScreen("home")} />
      </section>

      <section className="rounded-2xl border border-border p-4">
        <h2 className="font-semibold mb-4">HomeScreen</h2>
        <HomeScreen onNavigate={setScreen} />
      </section>

      <section className="rounded-2xl border border-border p-4">
        <h2 className="font-semibold mb-4">EntrenoScreen</h2>
        <EntrenoScreen onNavigate={setScreen} />
      </section>
    </main>
  )
}
