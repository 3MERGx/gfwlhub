import { ReactNode } from "react";

interface DashboardPageHeaderProps {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  children?: ReactNode;
}

export default function DashboardPageHeader({
  title,
  subtitle,
  icon,
  children,
}: DashboardPageHeaderProps) {
  return (
    <header className="mb-5 sm:mb-6">
      <div className="flex items-start gap-3">
        {icon && (
          <div
            className="flex-shrink-0 p-2 rounded-lg bg-[rgba(var(--color-primary),0.12)] border border-[rgba(var(--color-primary),0.28)]"
            aria-hidden
          >
            {icon}
          </div>
        )}
        <div className="min-w-0">
          <h1 className="text-lg sm:text-xl md:text-2xl font-semibold text-[rgb(var(--text-primary))] tracking-tight">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-1 text-sm text-[rgb(var(--text-secondary))]">
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {children}
    </header>
  );
}
