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
    <header className="mb-6">
      <div className="flex items-start gap-3 sm:gap-4">
        {icon && (
          <div
            className="flex-shrink-0 p-2.5 rounded-lg bg-[#107c10]/15 border border-[#107c10]/30"
            aria-hidden
          >
            {icon}
          </div>
        )}
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-[rgb(var(--text-primary))] tracking-tight">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-1.5 text-sm sm:text-base text-[rgb(var(--text-secondary))]">
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {children}
    </header>
  );
}
