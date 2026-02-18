import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        bg: "var(--theme-bg)",
        surface: "var(--theme-surface)",
        elevated: "var(--theme-elevated)",
        border: "var(--theme-border)",
        primary: "var(--theme-primary)",
        secondary: "var(--theme-secondary)",
        text: "var(--theme-text)",
        "text-muted": "var(--theme-text-muted)",
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
      },
      borderRadius: {
        card: "var(--radius-card)",
        button: "var(--radius-button)",
      },
      backgroundImage: {
        "hero-glow": "var(--hero-glow)",
      },
    },
  },
};

export default config;
