import { ReactNode } from "react";
import { FaClock } from "react-icons/fa";

interface DashboardEmptyStateProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  onClearFilters?: () => void;
  clearLabel?: string;
}

export default function DashboardEmptyState({
  title,
  description,
  icon,
  onClearFilters,
  clearLabel = "Clear filters",
}: DashboardEmptyStateProps) {
  return (
    <div className="bg-[rgb(var(--bg-card))] rounded-lg border border-[rgb(var(--border-color))] p-8 text-center">
      <div className="mx-auto text-[rgb(var(--text-muted))] mb-3" aria-hidden>
        {icon ?? <FaClock size={48} className="mx-auto" />}
      </div>
      <p className="text-[rgb(var(--text-secondary))]">{title}</p>
      {description && (
        <p className="mt-2 text-sm text-[rgb(var(--text-muted))]">{description}</p>
      )}
      {onClearFilters && (
        <button
          type="button"
          onClick={onClearFilters}
          className="mt-4 inline-flex items-center justify-center px-4 py-2 rounded-lg border border-[rgb(var(--border-color))] bg-[rgb(var(--bg-card-alt))] text-[rgb(var(--text-primary))] text-sm font-medium hover:border-[#107c10] transition-colors"
        >
          {clearLabel}
        </button>
      )}
    </div>
  );
}
