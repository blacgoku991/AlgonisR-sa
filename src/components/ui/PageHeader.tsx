import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

/** En-tête de page : bandeau coloré avec icône, titre, sous-titre et actions. */
export function PageHeader({
  title,
  subtitle,
  actions,
  eyebrow,
  icon: Icon,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  eyebrow?: ReactNode;
  icon?: LucideIcon;
}) {
  return (
    <header className="relative mb-10 overflow-hidden hero rounded-[2.5rem] px-6 py-9 sm:px-12 sm:py-12">
      <svg className="pointer-events-none absolute -top-20 -right-20 hidden size-72 sm:block text-brand-500 opacity-[0.12]" viewBox="0 0 200 200" aria-hidden>
        <circle cx="100" cy="100" r="96" fill="none" stroke="currentColor" strokeWidth="1.2" />
        <circle cx="100" cy="100" r="60" fill="currentColor" />
      </svg>
      <div className="relative flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex min-w-0 items-start gap-5">
          {Icon && (
            <span className="hidden size-14 shrink-0 place-items-center rounded-2xl bg-brand-600 text-accent-fg sm:grid">
              <Icon className="size-6" strokeWidth={1.8} />
            </span>
          )}
          <div className="min-w-0">
            {eyebrow && <p className="mb-2 text-sm font-medium text-brand-700">{eyebrow}</p>}
            <h1 className="text-3xl font-bold tracking-[-0.03em] sm:text-[40px] sm:leading-[1.1]">{title}</h1>
            {subtitle && <p className="mt-2.5 max-w-xl text-[15px] text-muted">{subtitle}</p>}
          </div>
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}
