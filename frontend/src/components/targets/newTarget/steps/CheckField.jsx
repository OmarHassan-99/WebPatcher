import { Check } from "lucide-react";

export default function CheckField({ spanText }) {
  return (
    <div className="flex items-center gap-2">
      <Check className="w-7 h-7 text-green-500" />
      <span className="ml-2 text-sm">{spanText}</span>
    </div>
  );
}
