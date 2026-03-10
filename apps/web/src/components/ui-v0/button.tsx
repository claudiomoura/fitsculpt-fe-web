import type { ComponentPropsWithoutRef } from "react"
import { Button as FitButton } from "@/components/ui/Button"

type ShadcnVariant = "default" | "outline" | "ghost" | "destructive" | "secondary"

type Props = Omit<ComponentPropsWithoutRef<typeof FitButton>, "variant"> & {
  variant?: ShadcnVariant
}

const variantMap: Record<ShadcnVariant, "primary" | "secondary" | "ghost" | "danger"> = {
  default: "primary",
  outline: "secondary",
  ghost: "ghost",
  destructive: "danger",
  secondary: "secondary",
}

export function Button({ variant = "default", ...props }: Props) {
  return <FitButton variant={variantMap[variant]} {...props} />
}
