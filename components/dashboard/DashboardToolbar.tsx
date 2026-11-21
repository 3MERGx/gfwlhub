import type { ReactNode } from "react";
import { FaFilter } from "react-icons/fa";

interface DashboardToolbarProps {
  search: ReactNode;
  filters: ReactNode;
  chips?: ReactNode;
  filtersOpen: boolean;
  onToggleFilters: () => void;
  filtersActive?: boolean;
}

export default function DashboardToolbar({
  search,
  filters,
  chips,
  filtersOpen,
  onToggleFilters,
  filtersActive = false,
}: DashboardToolbarProps) {
  return (
    <div className="dashboard-surface p-3 sm:p-4 mb-5">
      <div className="flex flex-col gap-3">
        <div className="w-full min-w-0">{search}</div>
        <button
          type="button"
          onClick={onToggleFilters}
          className={`md:hidden w-full flex items-center justify-center gap-2 py-2.5 min-h-[44px] rounded-lg border touch-manipulation ${
            filtersActive
              ? "bg-[rgba(var(--color-primary),0.12)] border-[rgba(var(--color-primary),0.4)] text-[rgb(var(--text-primary))]"
              : "bg-[rgb(var(--bg-card-alt))] border-[rgb(var(--border-color))] text-[rgb(var(--text-primary))]"
          }`}
        >
          <FaFilter size={14} />
          <span>Filters</span>
          {filtersActive && (
            <span className="bg-[rgb(var(--color-primary))] text-white text-[10px] font-bold rounded-full px-1.5 py-0.5">
              On
            </span>
          )}
        </button>
        <div
          className={`${
            filtersOpen ? "flex" : "hidden"
          } md:flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2`}
        >
          {filters}
        </div>
      </div>
      {chips ? <div className="mt-3 flex flex-wrap gap-2">{chips}</div> : null}
    </div>
  );
}

interface FilterChipProps {
  label: string;
  onClear: () => void;
}

export function FilterChip({ label, onClear }: FilterChipProps) {
  return (
    <button
      type="button"
      onClick={onClear}
      className="inline-flex items-center gap-1.5 rounded-full border border-[rgb(var(--border-color))] bg-[rgb(var(--bg-card-alt))] px-2.5 py-1 text-xs text-[rgb(var(--text-secondary))] hover:border-[rgb(var(--color-primary))] hover:text-[rgb(var(--text-primary))]"
    >
      {label}
      <span aria-hidden className="text-[rgb(var(--text-muted))]">
        ×
      </span>
    </button>
  );
}
