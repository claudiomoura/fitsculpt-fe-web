"use client";

import { useAccess } from "@/context/AccessProvider";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

const devLinks = [
  { id: "dev-trainer-home", href: "/app/trainer", label: "Trainer Home" },
  { id: "dev-trainer-requests", href: "/app/trainer/requests", label: "Trainer Requests" },
  { id: "dev-trainer-clients", href: "/app/trainer/clients", label: "Trainer Clients" },
  { id: "dev-trainer-plans", href: "/app/trainer/plans", label: "Trainer Plans" },
  { id: "dev-trainer-nutrition-plans", href: "/app/trainer/nutrition-plans", label: "Trainer Nutrition Plans" },
  { id: "dev-trainer-recipes", href: "/app/trainer/recipes", label: "Trainer Recipes" },
  { id: "dev-trainer-exercises", href: "/app/trainer/exercises", label: "Trainer Exercises" },
  { id: "dev-trainer-exercises-new", href: "/app/trainer/exercises/new", label: "New Exercise" },
  { id: "dev-onboarding", href: "/app/onboarding", label: "Onboarding" },
  { id: "dev-dashboard", href: "/app/hoy", label: "Dashboard" },
  { id: "dev-weekly-review", href: "/app/weekly-review", label: "Weekly Review" },
  { id: "dev-workouts", href: "/app/entrenamiento", label: "Workouts" },
  { id: "dev-training-edit", href: "/app/entrenamiento/editar", label: "Training Editor" },
  { id: "dev-nutrition-edit", href: "/app/nutricion/editar", label: "Nutrition Editor" },
  { id: "dev-profile-legacy", href: "/app/profile/edit", label: "Legacy Profile" },
  { id: "dev-settings-billing", href: "/app/settings/billing", label: "Billing" },
  { id: "dev-library-workouts", href: "/app/biblioteca/planes-entrenamiento", label: "Workout Library" },
  { id: "dev-library-recipes", href: "/app/biblioteca/recetas", label: "Recipe Library" },
  { id: "dev-admin-gym-requests", href: "/app/admin/gym-requests", label: "Gym Join Requests", disabled: true },
  { id: "dev-admin-preview", href: "/app/admin/preview", label: "Admin Preview" },
];

export default function DevPage() {
  const { isDev } = useAccess();
  const router = useRouter();

  useEffect(() => {
    if (!isDev) {
      router.push("/app");
    }
  }, [isDev, router]);

  if (!isDev) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl p-6">
      <h1 className="mb-6 text-2xl font-bold">Development Links</h1>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {devLinks.map((link) => (
          <Link
            key={link.id}
            href={link.href}
            className={`rounded-lg border p-4 transition-colors hover:bg-accent ${
              link.disabled ? "pointer-events-none opacity-50" : ""
            }`}
          >
            <div className="font-medium">{link.label}</div>
            <div className="text-muted-foreground text-sm">{link.href}</div>
            {link.disabled && (
              <div className="text-muted-foreground mt-1 text-xs">Coming Soon</div>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
