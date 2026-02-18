import { LandingHomePage, type LandingCopy } from "@/components/landing/LandingHomePage";

const HOME_COPY: LandingCopy = {
  hero: {
    eyebrow: "FitSculpt Performance AI",
    title: "Engineered Progress.",
    subtitle: "AI training and nutrition that adapts to you.",
    primaryCta: "Start free",
    secondaryCta: "View pricing",
  },
  features: {
    title: "Everything in one intelligent system",
    subtitle: "Three focused tools to keep your evolution clear, measurable, and consistent.",
    items: [
      {
        title: "Adaptive training",
        description: "Workout progressions updated to your load, recovery, and weekly consistency.",
        iconSrc: "/assets/icon-dumbbell.svg",
        iconAlt: "Dumbbell icon",
      },
      {
        title: "Performance analytics",
        description: "Track trends, intensity, and adherence with clean visual insights.",
        iconSrc: "/assets/icon-analytics.svg",
        iconAlt: "Analytics chart icon",
      },
      {
        title: "Precision nutrition",
        description: "Meal guidance that aligns calories and macros with your training phase.",
        iconSrc: "/assets/icon-nutrition.svg",
        iconAlt: "Nutrition icon",
      },
    ],
  },
  visual: {
    title: "Built for focused athletes",
    subtitle: "Clear visuals. Minimal distractions. Momentum every week.",
    primaryImageAlt: "Athlete from back wearing FitSculpt gear",
    secondaryImageAlt: "Two athletes in training session",
  },
  finalCta: {
    title: "Train smarter from day one",
    subtitle: "Join FitSculpt and let AI drive your next block of progress.",
    primaryCta: "Create account",
  },
};

export default function HomePage() {
  return <LandingHomePage copy={HOME_COPY} />;
}
