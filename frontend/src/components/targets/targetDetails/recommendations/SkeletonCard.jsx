export default function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-white/5 bg-gray-900/60 p-5 space-y-3 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="w-5 h-5 rounded bg-gray-700/70" />
        <div className="h-4 w-48 rounded bg-gray-700/70" />
        <div className="h-5 w-16 rounded-full bg-gray-700/70" />
      </div>
      <div className="h-3 w-72 rounded bg-gray-700/50" />
      <div className="h-3 w-24 rounded bg-indigo-900/50" />
    </div>
  );
}
