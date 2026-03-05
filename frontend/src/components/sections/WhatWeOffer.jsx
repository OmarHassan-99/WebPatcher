import Lottie from "lottie-react";
import { motion as Motion } from "framer-motion";
import { FEATURES } from "../../data/constants";
import SpotlightCard from "../../react-bits/SpotlightCard";

export default function WhatWeOffer() {
  return (
    <Motion.section
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ amount: 0.2, once: true }}
      transition={{ type: "spring", stiffness: 50 }}
      className="py-16"
    >
      <div className="mx-auto text-center">
        {/* Section Heading */}
        <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
          What{" "}
          <span className="hero-gradient-text font-serif italic">
            WebPatcher
          </span>{" "}
          Offers
        </h2>
        <p className="text-white mb-10 italic">
          WebPatcher — your AI-powered assistant for fixing vulnerabilities
          faster.
        </p>

        {/* Features */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mx-6">
          {FEATURES.map((f, i) => (
            <Motion.div
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ amount: 0.2, once: true }}
              transition={{
                type: "spring",
                stiffness: 50,
                delay: i * 0.15,
              }}
              key={i}
            >
              <SpotlightCard
                className="flex flex-col items-center h-full glass-card rounded-3xl"
                spotlightColor="rgba(120, 119, 198, 0.2)"
              >
                <Lottie
                  className="h-44"
                  animationData={f.animation}
                  loop
                  autoplay
                />
                <h3 className="text-xl text-white font-semibold">{f.title}</h3>
                <p className="text-primary-100 mt-2">{f.desc}</p>
              </SpotlightCard>
            </Motion.div>
          ))}
        </div>
      </div>
    </Motion.section>
  );
}
