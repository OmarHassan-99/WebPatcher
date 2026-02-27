import { Loader2 } from "lucide-react";

export default function LoadingSpinner() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-primary-900 gap-4">
      <Loader2 className="size-10 text-primary-200 animate-spin" />
      <p className="text-sm font-medium text-primary-200 animate-pulse tracking-wide">
        Loading WebPatcher...
      </p>
    </div>
  );
}
