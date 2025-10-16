import Lottie from "lottie-react";
import { Link, useRouteLoaderData } from "react-router-dom";
import { motion as Motion } from "motion/react";
import { Features } from "../../data/constants";

export default function WhatWeOffer() {
  const session = useRouteLoaderData("root");
  const { user } = session;

  return (
    <section className="py-16 mx-6">
      <div className="mx-auto text-center">
        {/* Section Heading */}
        <h2 className="text-3xl sm:text-4xl font-bold text-primary-100 mb-4">
          What <span className="font-serif italic">WebPatcher</span> Offers
        </h2>
        <p className="text-primary-300 mb-10 italic">
          WebPatcher — your AI-powered assistant for fixing vulnerabilities
          faster.
        </p>

        {/* Features */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Features.map((f, i) => (
            <Motion.div
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ amount: 0.4, once: true }}
              whileHover={{
                scale: 1.01,
                rotate: 1,
              }}
              transition={{ type: "spring", stiffness: 50 }}
              key={i}
              className="flex flex-col items-center p-6 bg-primary-700 shadow-lg rounded-2xl hover:shadow-xl hover:bg-primary-600"
            >
              <Lottie
                className="h-44"
                animationData={f.animation}
                loop
                autoplay
              />
              <h3 className="text-xl font-semibold text-primary-100">
                {f.title}
              </h3>
              <p className="text-primary-200 mt-2">{f.desc}</p>
            </Motion.div>
          ))}
        </div>

        {/* CTA Section */}
        <div className="mt-16 flex flex-col items-center">
          <Link
            to={user ? "/targets" : "/auth?mode=login"}
            className="flex items-center px-8 py-4 text-lg font-semibold rounded-2xl shadow-md bg-primary-400 hover:bg-primary-300 text-white transition-colors duration-500"
          >
            <p>
              🚀 Get Started with <span className="italic">WebPatcher</span>
            </p>
          </Link>
          <p className="mt-3 text-sm text-primary-200">
            Secure your web apps faster, smarter, and safer.
          </p>
        </div>
      </div>
    </section>
  );
}
