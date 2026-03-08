import { lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";
import LightRays from "../../react-bits/LightRays";
import ShinyText from "../../react-bits/ShinyText";

const AnimatedBackground = lazy(() => import("./AnimatedBackground"));

export default function Loading() {
  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen gap-4">
      <Suspense fallback={null}>
        <AnimatedBackground />
      </Suspense>
      <div className="fixed top-0 size-full -z-10 pointer-events-none">
        <LightRays raysSpeed={1} rayLength={0.7} mouseInfluence={0.1} />
      </div>

      <div className="relative z-10 flex flex-col items-center gap-6 glass-card p-8 rounded-3xl border border-white/5 bg-black/40 backdrop-blur-lg">
        <div className="relative">
          <div className="absolute -inset-4 rounded-full border-t-2 border-primary-400 opacity-30 animate-[spin_3s_linear_infinite]" />
          <div className="absolute -inset-2 rounded-full border-b-2 border-primary-200 opacity-50 animate-[spin_2s_linear_reverse_infinite]" />

          <Loader2 className="size-10 text-primary-200 animate-spin" />
        </div>

        <div className="text-xl font-bold tracking-wider uppercase flex">
          <ShinyText
            text="Initializing Webpatcher..."
            disabled={false}
            speed={2.5}
            className="mr-2"
            color="#d1d5db" // text-gray-300
            shineColor="#a78bfa" // primary-300 tone
          />
        </div>
      </div>
    </div>
  );
}
