import lottie1 from "../lottie/Technology isometric ai robot brain.json";
import lottie2 from "../lottie/Web Attack.json";
import lottie3 from "../lottie/Cybersecurity - Animation.json";

import loadingLottieAnimation from "../lottie/Loading - Animation.json";
import AiProcessorLottieAnimation from "../lottie/Ai Processor.json";
import SuccessLottieAnimation from "../lottie/Success.json";
import ErrorLottieAnimation from "../lottie/Error Occurred!.json";

import { Home, ShieldAlert, Sparkles, Target, User, ArrowLeftRight, BarChart3, BookOpen } from "lucide-react";

export const FEATURES = [
  {
    title: "AI-Powered Fixes",
    desc: "Automatically generate patch recommendations with AI + rules for vulnerabilities like SQLi, XSS, and misconfigurations.",
    animation: lottie1,
  },
  {
    title: "Config & Library Updates",
    desc: "Suggest secure server configurations and dependency updates to keep your app hardened and up-to-date.",
    animation: lottie2,
  },
  {
    title: "Seamless Scanner Integration",
    desc: "Parses and analyzes vulnerability scan reports automatically with intelligent classification.",
    animation: lottie3,
  },
];

export const DOCK_ITEMS = [
  {
    icon: <Home size={18} className="text-white" />,
    label: "Home",
    path: "/",
  },
  {
    icon: <Target size={18} className="text-white" />,
    label: "Targets",
    path: "/targets",
  },
  {
    icon: <BookOpen size={18} className="text-white" />,
    label: "Info",
    path: "/info",
  },
  {
    icon: <User size={18} className="text-white" />,
    label: "Profile",
    path: "/profile",
  },
];

export const DATABASES = [
  "MongoDB",
  "MySQL",
  "PostgreSQL",
  "SQLite",
  "Microsoft SQL Server",
  "MariaDB",
  "Oracle",
  "IBM DB2",
  "Microsoft Access",
  "CouchDB",
  "Firebird",
  "SAP MaxDB",
  "Sybase",
  "HypersonicSQL",
];

export const LANGUAGES = [
  "JavaScript",
  "TypeScript",
  "PHP",
  "Python",
  "Ruby",
  "XML",
  "Java",
  "C",
  "C#",
  "C++",
  "ASP",
  "JSP/Servlet",
  "Go",
  "Swift",
  "Kotlin",
  "Rust",
];

export const FRAMEWORKS = [
  "React",
  "Next.js",
  "Angular",
  "Vue.js",
  "Nuxt.js",
  "Express",
  "NestJS",
  "Django",
  "Flask",
  "Laravel",
  "ASP.NET",
  "Shopify",
  "Spring Boot",
];

export const OPERATING_SYSTEMS = ["Windows", "Linux", "macOS"];

export const SCMs = ["Git", "Subversion (SVN)"];

export const WEB_SERVERS = ["Apache", "Tomcat", "IIS"];

export const RISK_COLORS = {
  Informational: "text-blue-400 bg-blue-900/30 border-blue-700/50",
  Low: "text-green-400 bg-green-900/30 border-green-700/50",
  Medium: "text-yellow-400 bg-yellow-900/30 border-yellow-700/50",
  High: "text-red-500 bg-red-950/30 border-red-700/50",
};

export const LIST_VARIANTS = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.2 } },
};

export const CONTENT_VARIANTS = {
  hidden: { height: 0, opacity: 0 },
  visible: {
    height: "auto",
    opacity: 1,
    transition: { duration: 0.3, ease: "easeInOut" },
  },
  exit: {
    height: 0,
    opacity: 0,
    transition: { duration: 0.3, ease: "easeInOut" },
  },
};

export const FADE_VARIANTS = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
  exit: { opacity: 0, y: -20, transition: { duration: 0.3 } },
};

export const CHECKBOX_VARIANTS = {
  initial: { scale: 0.5, opacity: 0 },
  animate: { scale: 1, opacity: 1 },
  exit: { scale: 0.5, opacity: 0 },
};

export const SEVERITY_FILTER = [
  "All",
  "High",
  "Medium",
  "Low",
  "Informational",
];

export const SEVERITY_ORDER = {
  High: 3,
  Medium: 2,
  Low: 1,
  Informational: 0,
};

export function FORMAT_DATE(dateString) {
  if (!dateString) return "N/A";
  return new Date(dateString).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    hour12: true,
  });
}

export function GET_DURATION(start, end) {
  if (!start || !end) return null;
  const diff = new Date(end) - new Date(start);
  const minutes = Math.floor(diff / 60000);
  const seconds = ((diff % 60000) / 1000).toFixed(0);
  if (minutes > 60) return `${(minutes / 60).toFixed(1)}h`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

export function GET_STATUS_COLOR(status) {
  switch (status?.toLowerCase()) {
    case "queued":
      return "bg-yellow-500/10 text-yellow-400 border-yellow-500/20";
    case "running":
      return "bg-blue-500/10 text-blue-400 border-blue-500/20";
    case "analyzing":
      return "bg-indigo-500/10 text-indigo-400 border-indigo-500/20";
    case "patching":
      return "bg-orange-500/10 text-orange-400 border-orange-500/20";
    case "completed":
      return "bg-green-500/10 text-green-400 border-green-500/20";
    case "failed":
      return "bg-red-500/10 text-red-400 border-red-500/20";
    default:
      return "bg-gray-500/10 text-gray-400 border-gray-500/20";
  }
}

export const STATUS_OPTIONS = [
  "queued",
  "running",
  "analyzing",
  "patching",
  "completed",
  "failed",
];

export const TABS = [
  { id: "vulnerabilities", label: "Vulnerabilities", icon: ShieldAlert },
  { id: "recommendations", label: "AI Recommendations", icon: Sparkles },
  { id: "statistics", label: "Statistics", icon: BarChart3 },
  { id: "compare", label: "Compare", icon: ArrowLeftRight },
];

export const STAGES = [
  { key: "init", label: "Init", desc: "Preparing scan session" },
  { key: "spider", label: "Spider", desc: "Mapping pages & endpoints" },
  {
    key: "ajax_spider",
    label: "AJAX Spider",
    desc: "Crawling dynamic content",
  },
  { key: "active_scan", label: "Active Scan", desc: "Probing vulnerabilities" },
  { key: "extracting", label: "Analyzing", desc: "Classifying findings" },
  { key: "patching", label: "AI Patching", desc: "Generating fixes" },
  { key: "done", label: "Complete", desc: "Scan finished" },
];

export const STAGE_ORDER = Object.fromEntries(STAGES.map((s, i) => [s.key, i]));

export function GET_STAGE_STATUS(stageKey, currentStage) {
  const si = STAGE_ORDER[stageKey] ?? -1;
  const ci = STAGE_ORDER[currentStage] ?? -1;
  if (si < ci) return "done";
  if (si === ci) return "active";
  return "pending";
}

export const RISK_COLORS_SCAN = {
  High: {
    dot: "bg-red-400",
    text: "text-red-400",
    pill: "bg-red-400/10 border-red-400/20",
  },
  Medium: {
    dot: "bg-amber-400",
    text: "text-amber-400",
    pill: "bg-amber-400/10 border-amber-400/20",
  },
  Low: {
    dot: "bg-yellow-400",
    text: "text-yellow-400",
    pill: "bg-yellow-400/10 border-yellow-400/20",
  },
  Informational: {
    dot: "bg-blue-400",
    text: "text-blue-400",
    pill: "bg-blue-400/10 border-blue-400/20",
  },
};

export function GET_LOTTIE(stage, isError) {
  if (isError)
    return { id: "error", animation: ErrorLottieAnimation, loop: false };
  if (stage === "done")
    return { id: "success", animation: SuccessLottieAnimation, loop: false };
  if (["extracting", "patching"].includes(stage))
    return { id: "ai", animation: AiProcessorLottieAnimation, loop: true };
  return { id: "loading", animation: loadingLottieAnimation, loop: true };
}
