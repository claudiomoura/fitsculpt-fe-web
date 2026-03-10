import type { SVGProps } from "react"

type IconProps = SVGProps<SVGSVGElement>

function makeIcon(name: string) {
  return function Icon({ className, ...props }: IconProps) {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        aria-label={name}
        {...props}
      >
        <circle cx="12" cy="12" r="9" />
      </svg>
    )
  }
}

export const AlertCircle = makeIcon("AlertCircle")
export const Apple = makeIcon("Apple")
export const BookOpen = makeIcon("BookOpen")
export const Bookmark = makeIcon("Bookmark")
export const BookmarkCheck = makeIcon("BookmarkCheck")
export const Calendar = makeIcon("Calendar")
export const Camera = makeIcon("Camera")
export const Check = makeIcon("Check")
export const CheckCircle2 = makeIcon("CheckCircle2")
export const ChevronLeft = makeIcon("ChevronLeft")
export const ChevronRight = makeIcon("ChevronRight")
export const Circle = makeIcon("Circle")
export const Clock = makeIcon("Clock")
export const Crown = makeIcon("Crown")
export const Dumbbell = makeIcon("Dumbbell")
export const Flame = makeIcon("Flame")
export const Globe = makeIcon("Globe")
export const Heart = makeIcon("Heart")
export const Home = makeIcon("Home")
export const Loader2 = makeIcon("Loader2")
export const LogOut = makeIcon("LogOut")
export const Minus = makeIcon("Minus")
export const Moon = makeIcon("Moon")
export const Plus = makeIcon("Plus")
export const Ruler = makeIcon("Ruler")
export const Scale = makeIcon("Scale")
export const Search = makeIcon("Search")
export const Settings = makeIcon("Settings")
export const Shield = makeIcon("Shield")
export const Sparkles = makeIcon("Sparkles")
export const Target = makeIcon("Target")
export const Timer = makeIcon("Timer")
export const TrendingDown = makeIcon("TrendingDown")
export const TrendingUp = makeIcon("TrendingUp")
export const Trophy = makeIcon("Trophy")
export const User = makeIcon("User")
export const Utensils = makeIcon("Utensils")
export const X = makeIcon("X")
export const Zap = makeIcon("Zap")
