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
    <header className="relative mb-14 overflow-hidden hero rounded-[2.5rem] px-6 py-10 sm:px-14 sm:py-16">
      <div className="relative flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex min-w-0 items-start gap-5">
          {Icon && (
            <span className="hidden size-14 shrink-0 place-items-center rounded-2xl bg-brand-600 text-accent-fg sm:grid">
              <Icon className="size-6" strokeWidth={1.8} />
            </span>
          )}
          <div className="min-w-0">
            {eyebrow && <p className="mb-2 text-sm font-medium text-brand-700">{eyebrow}</p>}
            <h1 className="font-display text-4xl font-medium tracking-[-0.02em] sm:text-[52px] sm:leading-[1.08]">{title}</h1>
            {subtitle && <p className="mt-4 max-w-xl text-base leading-relaxed text-muted">{subtitle}</p>}
          </div>
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}
