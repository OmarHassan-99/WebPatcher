export default function Shimmer() {
  return (
    <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none">
      <div className="absolute -top-24 -left-24 w-72 h-72 rounded-full bg-violet-600/8 blur-3xl" />
      <div className="absolute -bottom-20 -right-20 w-64 h-64 rounded-full bg-indigo-500/6 blur-3xl" />
      <div
        className="absolute inset-0 opacity-[0.015]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(255,255,255,0.1) 3px,rgba(255,255,255,0.1) 4px)",
        }}
      />
    </div>
  );
}
