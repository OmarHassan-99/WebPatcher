import lottie1 from "../lottie/Technology isometric ai robot brain.json";
import lottie2 from "../lottie/Web Attack.json";
import lottie3 from "../lottie/Cybersecurity - Animation.json";

import { Home, Target, User } from "lucide-react";

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
    desc: "Works with OWASP ZAP reports directly, parsing and analyzing vulnerabilities automatically.",
    animation: lottie3,
  },
];

export const DOCK_ITEMS = [
  {
    icon: <Home size={18} color="white" />,
    label: "Home",
    path: "/",
  },
  {
    icon: <Target size={18} color="white" />,
    label: "Targets",
    path: "/targets",
  },
  {
    icon: <User size={18} color="white" />,
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

export const CONFIDENCE_COLORS = {
  Low: "text-yellow-400 border-yellow-500",
  Medium: "text-orange-400 border-orange-500",
  High: "text-green-400 border-green-500",
};
