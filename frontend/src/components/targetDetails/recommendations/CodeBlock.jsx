import CopyButton from "./CopyButton";

export default function CodeBlock({ code, lang }) {
  return (
    <div className="relative group rounded-xl overflow-hidden border border-gray-700/60 bg-gray-950/80">
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-1.5 bg-gray-800/80 border-b border-gray-700/60">
        <span className="text-xs font-mono text-gray-400">
          {lang || "code"}
        </span>
        <CopyButton text={code} />
      </div>
      <pre className="p-4 text-sm font-mono text-gray-200 overflow-x-auto whitespace-pre-wrap leading-relaxed">
        {code}
      </pre>
    </div>
  );
}
