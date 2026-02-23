import { ArrowDown, ArrowUp, Filter } from "lucide-react";
import FilterPill from "../FilterPill";
import { SEVERITY_FILTER } from "../../../data/constants";

export default function Filters({ filters, setFilters }) {
  const { severityFilter, sortOption, expandAll } = filters;

  return (
    <div className="sm:sticky sm:top-20 sm:z-10 flex items-center flex-wrap gap-3 p-3 w-fit mx-4 lg:mx-auto rounded-2xl shadow-lg bg-transparent backdrop-blur-sm border border-white/8">
      <div className="flex items-center gap-2">
        <Filter className="size-5 text-primary-100" />
        <span className="font-semibold text-primary-100">Filters</span>
      </div>

      <div className="flex gap-1 sm:gap-2 flex-wrap">
        {SEVERITY_FILTER.map((sev) => (
          <FilterPill
            key={sev}
            active={severityFilter === sev}
            onClick={() =>
              setFilters((prev) => ({ ...prev, severityFilter: sev }))
            }
          >
            {sev}
          </FilterPill>
        ))}
      </div>

      <div className="h-px w-full sm:w-px sm:h-6 bg-white mx-1" />

      <div className="flex gap-1 sm:gap-2 flex-wrap items-center">
        <FilterPill
          active={sortOption === "None"}
          onClick={() =>
            setFilters((prev) => ({ ...prev, sortOption: "None" }))
          }
        >
          No Sort
        </FilterPill>

        <FilterPill
          active={sortOption === "asc"}
          onClick={() => setFilters((prev) => ({ ...prev, sortOption: "asc" }))}
          icon={ArrowUp}
        >
          Low → High
        </FilterPill>

        <FilterPill
          active={sortOption === "desc"}
          onClick={() =>
            setFilters((prev) => ({ ...prev, sortOption: "desc" }))
          }
          icon={ArrowDown}
        >
          High → Low
        </FilterPill>
      </div>

      <div className="h-px w-full sm:w-px sm:h-6 bg-white mx-1" />

      <button
        onClick={() =>
          setFilters((prev) => ({ ...prev, expandAll: !prev.expandAll }))
        }
        className="px-3 py-2 hover:bg-white/10 rounded-full transition duration-300 font-medium text-white cursor-pointer"
      >
        {expandAll ? "Collapse All" : "Expand All"}
      </button>
    </div>
  );
}
