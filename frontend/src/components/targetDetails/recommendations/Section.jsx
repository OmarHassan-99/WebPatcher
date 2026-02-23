export default function Section({ icon, label, children }) {
  const Icon = icon;
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm font-semibold text-primary-200">
        <Icon size={15} className="shrink-0" />
        <span>{label}</span>
      </div>
      {children}
    </div>
  );
}
