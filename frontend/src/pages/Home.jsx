import Hero from "../components/sections/Hero";
import WhatWeOffer from "../components/sections/WhatWeOffer";
import Footer from "../components/sections/Footer";

export default function HomePage() {
  return (
    <div className="relative flex flex-1 flex-col items-center justify-center text-white text-center">
      <Hero />
      <WhatWeOffer />
      <Footer />
    </div>
  );
}
