import { motion as Motion } from "framer-motion";
import { Facebook, Github, Linkedin } from "lucide-react";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <Motion.footer
      initial={{ opacity: 0, y: -20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ amount: 0.2, once: true }}
      transition={{ type: "spring" }}
      className="w-full border-t border-white/10 px-5 py-7 text-primary-200 overflow-hidden"
    >
      <div className="flex items-center justify-between">
        <p className="text-sm text-white text-left">
          © {currentYear} WebPatcher. All rights reserved.
        </p>
        <div className="flex gap-6">
          <a
            href="https://github.com/abdullah12q"
            target="_blank"
            rel="noopener noreferrer"
            className="text-white hover:text-primary-100 transition"
          >
            <Github className="size-5" />
          </a>
          <a
            href="https://linkedin.com/in/abdullah-mohamed-1q1q"
            target="_blank"
            rel="noopener noreferrer"
            className="text-white hover:text-primary-100 transition"
          >
            <Linkedin className="size-5" />
          </a>
          <a
            href="https://facebook.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-white hover:text-primary-100 transition"
          >
            <Facebook className="size-5" />
          </a>
        </div>
      </div>
    </Motion.footer>
  );
}
