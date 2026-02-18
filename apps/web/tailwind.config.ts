import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
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
      backgroundImage: {
        "hero-glow": "var(--hero-glow)",
      },
    },
  },
};

export default config;
