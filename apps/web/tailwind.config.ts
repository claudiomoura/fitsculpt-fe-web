import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // Semantic tokens
        accent: {
          DEFAULT: "var(--color-primary)",
          muted: "color-mix(in srgb, var(--color-primary) 20%, transparent)",
          soft: "color-mix(in srgb, var(--color-primary) 12%, transparent)",
        },
        success: {
          DEFAULT: "var(--color-success)",
          muted: "color-mix(in srgb, var(--color-success) 20%, transparent)",
          soft: "color-mix(in srgb, var(--color-success) 12%, transparent)",
        },
        warning: {
          DEFAULT: "var(--color-warning)",
          muted: "color-mix(in srgb, var(--color-warning) 20%, transparent)",
        },
        info: {
          DEFAULT: "var(--color-info)",
          muted: "color-mix(in srgb, var(--color-info) 20%, transparent)",
        },
        // Legacy tokens
        bg: "var(--fs-bg)",
        surface: "var(--fs-surface)",
        elevated: "var(--fs-elevated)",
        border: "var(--fs-border)",
        primary: "var(--fs-primary)",
        secondary: "var(--fs-secondary)",
        text: "var(--fs-text)",
        "text-muted": "var(--fs-text-muted)",
        "dni-bg": "var(--dni-bg)",
        "dni-surface": "var(--dni-surface)",
        "dni-elevated": "var(--dni-elevated)",
        "dni-border": "var(--dni-border)",
        "dni-text-primary": "var(--dni-text-primary)",
        "dni-text-secondary": "var(--dni-text-secondary)",
        "dni-text-muted": "var(--dni-text-muted)",
        "dni-accent-mint": "var(--dni-accent-mint)",
        "dni-accent-blue": "var(--dni-accent-blue)",
        "dni-success": "var(--dni-success)",
        "dni-warn": "var(--dni-warn)",
        "dni-error": "var(--dni-error)",
        "brand-bg": "var(--brand-bg)",
        "brand-surface": "var(--brand-surface)",
        "brand-border": "var(--brand-border)",
        "brand-primary": "var(--brand-primary)",
        "brand-secondary": "var(--brand-secondary)",
        "brand-text": "var(--brand-text)",
        "brand-muted": "var(--brand-muted)",
      },
      borderRadius: {
        card: "var(--fs-radius-card)",
        btn: "var(--fs-radius-btn)",
        button: "var(--radius-button)",
      },
      backgroundImage: {
        "hero-glow": "var(--hero-glow)",
      },
    },
  },
};

export default config;
