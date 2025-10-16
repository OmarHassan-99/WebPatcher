import lottie1 from "../lottie/Technology isometric ai robot brain.json";
import lottie2 from "../lottie/Web Attack.json";
import lottie3 from "../lottie/Cybersecurity - Animation.json";

import { Home, Target, User } from "lucide-react";

export const Features = [
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
    desc: "Works with OWASP ZAP & Burp Suite reports directly, parsing and analyzing vulnerabilities automatically.",
    animation: lottie3,
  },
];

export const dockItems = [
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

export const LANGUAGES = [
  "JavaScript",
  "TypeScript",
  "PHP",
  "Python",
  "Ruby",
  "Java",
  "C#",
  "C++",
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
