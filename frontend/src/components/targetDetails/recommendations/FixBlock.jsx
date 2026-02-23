import CopyButton from "./CopyButton";

export default function FixBlock({ text }) {
  return (
    <div className="relative group rounded-xl overflow-hidden border border-emerald-700/40 bg-emerald-950/30">
      <div className="flex items-center justify-between px-4 py-1.5 bg-emerald-900/30 border-b border-emerald-700/30">
        <span className="text-xs font-semibold text-emerald-400">
          Suggested Fix
        </span>
        <CopyButton text={text} />
      </div>
      <p className="p-4 text-sm text-gray-200 leading-relaxed whitespace-pre-wrap">
        {text}
      </p>
    </div>
  );
}
