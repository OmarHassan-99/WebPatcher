import { motion as Motion } from "framer-motion";
import { Github, Linkedin, X } from "lucide-react";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <Motion.footer
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ amount: 0.4, once: true }}
      transition={{ type: "spring", stiffness: 50 }}
      className="w-full border-t border-primary-700 py-10 text-center text-primary-200"
    >
      <div className="px-6 flex flex-col items-center gap-6">
        {/* Name */}
        <Motion.h2
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ amount: 0.4, once: true }}
          transition={{ duration: 0.6 }}
          className="text-2xl font-semibold text-primary-100"
        >
          WebPatcher
        </Motion.h2>

        {/* Description */}
        <p className="max-w-md text-sm text-primary-300">
          AI-driven vulnerability patch recommendation system — making your web
          applications more secure, automatically.
        </p>

        {/* Social Icons */}
        <div className="flex gap-6 mt-4">
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-primary-100 transition"
          >
            <Github className="w-5 h-5" />
          </a>
          <a
            href="https://linkedin.com"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-primary-100 transition"
          >
            <Linkedin className="w-5 h-5" />
          </a>
          <a
            href="https://x.com"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-primary-100 transition"
          >
            <X className="w-5 h-5" />
          </a>
        </div>

        {/* Divider */}
        <div className="w-full border-t border-primary-700 mt-6" />

        {/* Copyright */}
        <p className="text-sm text-primary-400 mt-4">
          © {currentYear} WebPatcher. All rights reserved.
        </p>
      </div>
    </Motion.footer>
  );
}
