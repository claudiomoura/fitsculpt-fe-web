import { LandingHomePage, type LandingCopy } from "@/components/landing/LandingHomePage";

const HOME_COPY: LandingCopy = {
  hero: {
    titleA: "Transforma Tu",
    titleB: "Cuerpo",
    titleC: "con",
    titleD: "Inteligencia",
    titleE: "Artificial",
    subtitle: "Entrenamientos personalizados creados por IA",
    primaryCta: "Empieza Ahora",
    secondaryCta: "Ver Demo",
  },
  features: {
    items: [
      {
        title: "Planes a Medida",
        description: "Rutinas adaptadas a tus objetivos",
        iconSrc: "/assets/icon-dumbbell.svg",
        iconAlt: "Entrenamiento",
      },
      {
        title: "Análisis Progreso",
        description: "Seguimiento y estadísticas precisas",
        iconSrc: "/assets/icon-analytics.svg",
        iconAlt: "Analíticas",
      },
      {
        title: "Nutrición Inteligente",
        description: "Dietas optimizadas por IA",
        iconSrc: "/assets/icon-nutrition.svg",
        iconAlt: "Nutrición",
      },
    ],
  },
  testimonial: {
    quote: "¡Esta app cambió mi vida!",
    subquote: "Entreno mejor que nunca.",
    author: "Laura M.",
    metaLeft: "Carlos A.  ·  -12 kg en 10 semanas",
  },
  finalCta: {
    titleA: "Empieza",
    titleB: "Gratis",
    titleC: "Hoy",
    subtitle: "Únete y crea el mejor tú",
    placeholder: "Ingresa tu email",
    button: "¡Empezar Ahora!",
  },
};

export default function HomePage() {
  return <LandingHomePage copy={HOME_COPY} />;
}