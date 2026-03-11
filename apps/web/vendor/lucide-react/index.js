const React = require("react")

function makeIcon(name){
  return function Icon(props){
    return React.createElement("svg", {"data-lucide": name, ...props})
  }
}

const AlertCircle = makeIcon("AlertCircle")
const Apple = makeIcon("Apple")
const ArrowLeft = makeIcon("ArrowLeft")
const ArrowRight = makeIcon("ArrowRight")
const BookOpen = makeIcon("BookOpen")
const Bookmark = makeIcon("Bookmark")
const BookmarkCheck = makeIcon("BookmarkCheck")
const Calendar = makeIcon("Calendar")
const Camera = makeIcon("Camera")
const Check = makeIcon("Check")
const CheckCircle2 = makeIcon("CheckCircle2")
const CheckIcon = makeIcon("CheckIcon")
const ChevronDownIcon = makeIcon("ChevronDownIcon")
const ChevronLeft = makeIcon("ChevronLeft")
const ChevronLeftIcon = makeIcon("ChevronLeftIcon")
const ChevronRight = makeIcon("ChevronRight")
const ChevronRightIcon = makeIcon("ChevronRightIcon")
const ChevronUpIcon = makeIcon("ChevronUpIcon")
const Circle = makeIcon("Circle")
const CircleIcon = makeIcon("CircleIcon")
const Clock = makeIcon("Clock")
const Crown = makeIcon("Crown")
const Dumbbell = makeIcon("Dumbbell")
const Flame = makeIcon("Flame")
const Globe = makeIcon("Globe")
const GripVerticalIcon = makeIcon("GripVerticalIcon")
const Heart = makeIcon("Heart")
const Home = makeIcon("Home")
const Loader2 = makeIcon("Loader2")
const Loader2Icon = makeIcon("Loader2Icon")
const LogOut = makeIcon("LogOut")
const Minus = makeIcon("Minus")
const MinusIcon = makeIcon("MinusIcon")
const Moon = makeIcon("Moon")
const MoreHorizontal = makeIcon("MoreHorizontal")
const MoreHorizontalIcon = makeIcon("MoreHorizontalIcon")
const PanelLeftIcon = makeIcon("PanelLeftIcon")
const Plus = makeIcon("Plus")
const Ruler = makeIcon("Ruler")
const Scale = makeIcon("Scale")
const Search = makeIcon("Search")
const SearchIcon = makeIcon("SearchIcon")
const Settings = makeIcon("Settings")
const Shield = makeIcon("Shield")
const Sparkles = makeIcon("Sparkles")
const Target = makeIcon("Target")
const Timer = makeIcon("Timer")
const TrendingDown = makeIcon("TrendingDown")
const TrendingUp = makeIcon("TrendingUp")
const Trophy = makeIcon("Trophy")
const User = makeIcon("User")
const Utensils = makeIcon("Utensils")
const X = makeIcon("X")
const XIcon = makeIcon("XIcon")
const Zap = makeIcon("Zap")

module.exports = {
  AlertCircle,
  Apple,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Bookmark,
  BookmarkCheck,
  Calendar,
  Camera,
  Check,
  CheckCircle2,
  CheckIcon,
  ChevronDownIcon,
  ChevronLeft,
  ChevronLeftIcon,
  ChevronRight,
  ChevronRightIcon,
  ChevronUpIcon,
  Circle,
  CircleIcon,
  Clock,
  Crown,
  Dumbbell,
  Flame,
  Globe,
  GripVerticalIcon,
  Heart,
  Home,
  Loader2,
  Loader2Icon,
  LogOut,
  Minus,
  MinusIcon,
  Moon,
  MoreHorizontal,
  MoreHorizontalIcon,
  PanelLeftIcon,
  Plus,
  Ruler,
  Scale,
  Search,
  SearchIcon,
  Settings,
  Shield,
  Sparkles,
  Target,
  Timer,
  TrendingDown,
  TrendingUp,
  Trophy,
  User,
  Utensils,
  X,
  XIcon,
  Zap
}
