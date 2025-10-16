import { ClipboardList, Plus } from "lucide-react";
import { Link } from "react-router-dom";

export default function TargetPage() {
  return (
    <div className="flex flex-col justify-center items-center gap-1 w-full text-white text-center">
      <div className="flex gap-1 justify-center">
        <ClipboardList />
        <p>You don&apos;t have any targets yet.</p>
      </div>
      <p>Start adding your first target to get started.</p>
      <Link
        to="/targets/new"
        className="mt-4 border border-primary-300 rounded-full px-4 py-2 hover:bg-primary-300 hover:text-primary-100 transition-colors duration-500"
      >
        <div className="flex items-center justify-center gap-2">
          <Plus />
          Add Target
        </div>
      </Link>
    </div>
  );
}
