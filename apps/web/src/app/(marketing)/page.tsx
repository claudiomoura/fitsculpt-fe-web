import { LandingHomePage, type LandingCopy } from "@/components/landing/LandingHomePage";

const HOME_COPY: LandingCopy = {
  hero: {
    title: "Tu Entrenador IA",
    subtitle: "Transforma tu cuerpo con planes de entrenamiento y nutrición personalizados generados por inteligencia artificial. Logra tus objetivos más rápido con la ayuda de nuestra IA avanzada.",
    primaryCta: "Empezar Gratis",
    secondaryCta: "Ver Demo",
    heroImage: "/branding/girl_front.png",
  },
  socialProof: {
    label: "Más de 10,000 usuarios confían en FitSculpt",
    logos: ["FORBES", "WIRED", "TECHCRUNCH", "MEN'S HEALTH"],
  },
  features: {
    items: [
      {
        title: "IA Personalizada",
        description: "Algoritmos que adaptan tu plan a tu progreso real y preferencias.",
        iconAlt: "AI",
        iconEmoji: "🤖",
      },
      {
        title: "Nutrición Inteligente",
        description: "Planes de comida personalizados basados en tus objetivos y gustos.",
        iconAlt: "Nutrition",
        iconEmoji: "🍎",
      },
      {
        title: "Seguimiento Real",
        description: "Métricas detalladas y analytics para entender tu evolución.",
        iconAlt: "Analytics",
        iconEmoji: "📊",
      },
      {
        title: "Comunidad Activa",
        description: "Retos mensuales, leaderboards y soporte de otros atletas.",
        iconAlt: "Community",
        iconEmoji: "👥",
      },
    ],
  },
  howItWorks: {
    steps: [
      {
        title: "Crea tu perfil",
        description: "Cuéntanos sobre tus objetivos, nivel de experiencia y preferencias alimentarias.",
        image: "/branding/girl_front.png",
      },
      {
        title: "Recibe tu plan",
        description: "La IA genera rutinas de entrenamiento y nutrición 100% personalizadas para ti.",
        image: "/branding/girl_back.png",
      },
      {
        title: "Entrena y evoluciona",
        description: "Seguimiento en tiempo real con ajustes automáticos según tu progreso.",
        image: "/branding/girl_front.png",
      },
    ],
  },
  pricing: {
    title: "Elige tu plan",
    subtitle: "Comienza gratis o level up cuando quieras",
    tiers: [
      {
        name: "TrainingAI",
        price: "5,99€",
        period: "/mes",
        description: "Solo entrenamiento con IA",
        features: [
          "Planes de entrenamiento ilimitados IA",
          "Seguimiento avanzado",
          "Estadísticas detalladas",
          "Sin anuncios",
        ],
        cta: "Empezar Prueba",
      },
      {
        name: "Pro",
        price: "9,99€",
        period: "/mes",
        description: "Todo incluido: Training + Nutri",
        features: [
          "TrainingAI + NutriAI",
          "Coach IA 24/7",
          "Análisis completos",
          "Soporte prioritario",
        ],
        cta: "Elegir Pro",
        popular: true,
      },
      {
        name: "NutriAI",
        price: "5,99€",
        period: "/mes",
        description: "Solo nutrición con IA",
        features: [
          "Planes de nutrición IA",
          "Recetas personalizadas",
          "Seguimiento de macros",
          "Sin anuncios",
        ],
        cta: "Empezar Prueba",
      },
      {
        name: "Gratis",
        price: "0€",
        period: "/mes",
        description: "Perfecto para empezar",
        features: [
          "3 planes de entrenamiento",
          "Seguimiento básico",
          "Biblioteca de ejercicios +200",
          "Comunidad de usuarios",
        ],
        cta: "Empezar Gratis",
      },
    ],
  },
  testimonials: {
    items: [
      {
        quote: "FitSculpt cambió completamente mi forma de entrenar. En 3 meses logré resultados que no había conseguido en 1 año.",
        author: "Carlos M.",
        role: "Usuario Pro",
        image: "/branding/guys.png",
      },
      {
        quote: "La nutrición personalizada fue clave. He perdido 8kg en 4 meses sin pasar hambre.",
        author: "Laura K.",
        role: "Usuario NutriAI",
        image: "/branding/girl_front.png",
      },
      {
        quote: "El mejor investimento que he hecho. La IA realmente entiende mi cuerpo y mis objetivos.",
        author: "Miguel R.",
        role: "Usuario TrainingAI",
        image: "/branding/girl_back.png",
      },
    ],
  },
  finalCta: {
    title: "¿Listo para transformar tu cuerpo?",
    subtitle: "Únete hoy y obtén tu primer mes gratis",
    placeholder: "tu@email.com",
    button: "Empezar",
  },
};

export default function HomePage() {
  return <LandingHomePage copy={HOME_COPY} />;
}
