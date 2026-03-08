import { lazy, Suspense } from "react";

import Hero from "../components/sections/Hero";
const WhatWeOffer = lazy(() => import("../components/sections/WhatWeOffer"));
const Footer = lazy(() => import("../components/sections/Footer"));

export default function HomePage() {
  return (
    <div className="relative flex flex-1 flex-col items-center justify-center text-white text-center">
      <Hero />
      <Suspense fallback={null}>
        <WhatWeOffer />
        <Footer />
      </Suspense>
    </div>
  );
}
