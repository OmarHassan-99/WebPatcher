import { useMemo } from "react";

export default function AnimatedBackground() {
  const particles = useMemo(
    () =>
      Array.from({ length: 90 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 2 + 0.5,
        duration: Math.random() * 15 + 10,
        delay: Math.random() * 10,
        opacity: Math.random() * 0.5 + 0.1,
        glow: Math.random() > 0.85, // ~15% of dots will be glowing
        twinkle: Math.random() > 0.7, // ~30% will have a twinkle
        twinkleDuration: Math.random() * 3 + 2,
      })),
    [],
  );

  return (
    <>
      <style>{`
        @keyframes orb1 {
          0%   { transform: translate(0, 0) scale(1); }
          25%  { transform: translate(120px, -80px) scale(1.15); }
          50%  { transform: translate(-40px, 90px) scale(0.9); }
          75%  { transform: translate(60px, -40px) scale(1.05); }
          100% { transform: translate(0, 0) scale(1); }
        }
        @keyframes orb2 {
          0%   { transform: translate(0, 0) scale(1); }
          33%  { transform: translate(-160px, 120px) scale(1.3); }
          66%  { transform: translate(100px, -80px) scale(0.85); }
          100% { transform: translate(0, 0) scale(1); }
        }
        @keyframes orb3 {
          0%   { transform: translate(-50%, -50%) scale(1); }
          30%  { transform: translate(calc(-50% + 160px), calc(-50% + 40px)) scale(1.1); }
          60%  { transform: translate(calc(-50% - 80px), calc(-50% - 160px)) scale(0.9); }
          100% { transform: translate(-50%, -50%) scale(1); }
        }
        @keyframes orb4 {
          0%   { transform: translate(0, 0) scale(1); }
          40%  { transform: translate(80px, -120px) scale(1.2); }
          80%  { transform: translate(-60px, 60px) scale(0.8); }
          100% { transform: translate(0, 0) scale(1); }
        }
        @keyframes drift {
          0%   { transform: translateY(0px) translateX(0px); opacity: var(--op); }
          50%  { transform: translateY(-30px) translateX(10px); opacity: calc(var(--op) * 0.4); }
          100% { transform: translateY(0px) translateX(0px); opacity: var(--op); }
        }
        @keyframes twinkle {
          0%, 100% { opacity: var(--op); filter: brightness(1); }
          50%      { opacity: 1; filter: brightness(2.5); }
        }
        @keyframes aurora {
          0%   { opacity: 0.4; transform: skewX(0deg) scaleX(1); }
          50%  { opacity: 0.7; transform: skewX(3deg) scaleX(1.05); }
          100% { opacity: 0.4; transform: skewX(0deg) scaleX(1); }
        }
        @keyframes baseBg {
          0%   { background-position: 0% 50%; }
          50%  { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
      `}</style>

      <div
        className="absolute inset-0 w-full h-full -z-20 overflow-hidden pointer-events-none"
        style={{
          background:
            "linear-gradient(135deg, #030014 0%, #050020 25%, #030014 50%, #0a0018 75%, #030014 100%)",
          backgroundSize: "400% 400%",
          animation: "baseBg 5s ease-in-out infinite",
        }}
      >
        {/* Grid */}
        <div
          className="absolute inset-0 w-full h-full"
          style={{
            backgroundImage: `
              linear-gradient(to right, rgba(255,255,255,0.04) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(255,255,255,0.04) 1px, transparent 1px)
            `,
            backgroundSize: "48px 48px",
            maskImage:
              "radial-gradient(ellipse 80% 60% at 50% 50%, black 30%, transparent 100%)",
            WebkitMaskImage:
              "radial-gradient(ellipse 80% 60% at 50% 50%, black 30%, transparent 100%)",
          }}
        />

        {/* Aurora band 1 */}
        <div
          style={{
            position: "absolute",
            top: "15%",
            left: "-10%",
            width: "120%",
            height: "200px",
            background:
              "linear-gradient(90deg, transparent, rgba(16,185,129,0.08) 30%, rgba(99,102,241,0.12) 60%, transparent)",
            filter: "blur(40px)",
            animation: "aurora 12s ease-in-out infinite",
            transformOrigin: "center",
          }}
        />

        {/* Aurora band 2 */}
        <div
          style={{
            position: "absolute",
            bottom: "20%",
            left: "-10%",
            width: "120%",
            height: "160px",
            background:
              "linear-gradient(90deg, transparent, rgba(168,85,247,0.1) 40%, rgba(16,185,129,0.07) 70%, transparent)",
            filter: "blur(50px)",
            animation: "aurora 16s ease-in-out infinite reverse",
            transformOrigin: "center",
          }}
        />

        {/* Orb 1 — emerald */}
        <div
          style={{
            position: "absolute",
            top: "20%",
            left: "20%",
            width: "500px",
            height: "500px",
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(16,185,129,0.18) 0%, transparent 65%)",
            animation: "orb1 15s ease-in-out infinite",
            willChange: "transform",
          }}
        />

        {/* Orb 2 — indigo */}
        <div
          style={{
            position: "absolute",
            bottom: "15%",
            right: "15%",
            width: "620px",
            height: "620px",
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(99,102,241,0.16) 0%, transparent 65%)",
            animation: "orb2 20s ease-in-out infinite",
            willChange: "transform",
          }}
        />

        {/* Orb 3 — violet center */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            width: "420px",
            height: "420px",
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(168,85,247,0.14) 0%, transparent 65%)",
            animation: "orb3 18s ease-in-out infinite",
            willChange: "transform",
          }}
        />

        {/* Orb 4 — warm rose accent */}
        <div
          style={{
            position: "absolute",
            top: "60%",
            left: "10%",
            width: "350px",
            height: "350px",
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(244,63,94,0.1) 0%, transparent 65%)",
            animation: "orb4 22s ease-in-out infinite",
            willChange: "transform",
          }}
        />

        {/* Particles — dots + glowing halos + twinkle stars */}
        {particles.map((p) => (
          <div
            key={p.id}
            style={{
              position: "absolute",
              left: `${p.x}%`,
              top: `${p.y}%`,
              width: `${p.size}px`,
              height: `${p.size}px`,
              borderRadius: "50%",
              background: p.glow
                ? "radial-gradient(circle, rgba(168,85,247,0.9) 0%, rgba(99,102,241,0.4) 40%, transparent 70%)"
                : "white",
              "--op": p.opacity,
              opacity: p.opacity,
              boxShadow: p.glow
                ? `0 0 ${p.size * 4}px ${p.size}px rgba(168,85,247,0.3)`
                : "none",
              animation: p.twinkle
                ? `twinkle ${p.twinkleDuration}s ease-in-out ${p.delay}s infinite`
                : `drift ${p.duration}s ease-in-out ${p.delay}s infinite`,
              willChange: "transform, opacity",
            }}
          />
        ))}

        {/* Radial vignette */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 100% 100% at 50% 50%, transparent 40%, #030014 100%)",
          }}
        />

        {/* Top & bottom edge fade */}
        <div
          className="absolute inset-x-0 top-0 h-32"
          style={{
            background: "linear-gradient(to bottom, #030014, transparent)",
          }}
        />
        <div
          className="absolute inset-x-0 bottom-0 h-32"
          style={{
            background: "linear-gradient(to top, #030014, transparent)",
          }}
        />
      </div>
    </>
  );
}
