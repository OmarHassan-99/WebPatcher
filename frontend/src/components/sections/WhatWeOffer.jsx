import Lottie from "lottie-react";
import { motion as Motion } from "motion/react";
import { FEATURES } from "../../data/constants";

export default function WhatWeOffer() {
  return (
    <section className="py-16 mx-6">
      <div className="mx-auto text-center">
        {/* Section Heading */}
        <h2 className="text-3xl sm:text-4xl font-bold text-primary-100 mb-4">
          What <span className="font-serif italic">WebPatcher</span> Offers
        </h2>
        <p className="text-white mb-10 italic">
          WebPatcher — your AI-powered assistant for fixing vulnerabilities
          faster.
        </p>

        {/* Features */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((f, i) => (
            <Motion.div
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ amount: 0.2, once: true }}
              whileHover={{
                scale: 1.02,
                rotate: 1,
              }}
              transition={{ type: "spring", stiffness: 50 }}
              key={i}
              className="flex flex-col items-center p-8 glass-card rounded-3xl"
            >
              <Lottie
                className="h-44"
                animationData={f.animation}
                loop
                autoplay
              />
              <h3 className="text-xl text-white font-semibold">{f.title}</h3>
              <p className="text-primary-100 mt-2">{f.desc}</p>
            </Motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
