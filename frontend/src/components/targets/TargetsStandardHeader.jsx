import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import { STATUS_OPTIONS } from "../../data/constants";
import CustomSelect from "../ui/CustomSelect";

export default function TargetsStandardHeader({
  statusFilter,
  handleFilterChange,
  scans,
}) {
  return (
    <>
      <div>
        <h1 className="text-3xl font-bold text-white tracking-tight mb-1.5">
          Target Scans
        </h1>
        <p className="text-gray-400 text-sm flex items-center gap-2">
          <span className="size-2 rounded-full bg-primary-100 animate-pulse" />
          Manage and monitor your vulnerability scans
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
        {/* Custom Styled Select */}
        <div className="w-[180px]">
          <CustomSelect
            value={statusFilter}
            onChange={(val) => handleFilterChange(val)}
            options={[
              { value: "all", label: "All Statuses" },
              ...STATUS_OPTIONS.map((status) => ({
                value: status,
                label: status.charAt(0).toUpperCase() + status.slice(1),
              })),
            ]}
          />
        </div>
        {scans?.length > 0 && (
          <Link
            to="/targets/new"
            className="flex items-center gap-2 bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400 text-white px-5 py-2.5 rounded-xl transition-all font-medium text-sm shadow-lg shadow-primary-500/20 hover:shadow-primary-500/40 active:scale-95 duration-500"
          >
            <Plus size={18} />
            New Target
          </Link>
        )}
      </div>
    </>
  );
}
