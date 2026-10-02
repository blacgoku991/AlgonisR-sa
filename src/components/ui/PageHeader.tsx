import type { ReactNode } from "react";

/** En-tête de page : grand titre, sous-titre discret, actions à droite. */
export function PageHeader({
  title,
  subtitle,
  actions,
  eyebrow,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  eyebrow?: ReactNode;
}) {
  return (
    <header className="mb-10 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && <p className="mb-2 text-sm text-muted">{eyebrow}</p>}
        <h1 className="text-3xl font-semibold tracking-[-0.03em] sm:text-[44px] sm:leading-[1.05]">{title}</h1>
        {subtitle && <p className="mt-3 max-w-xl text-[15px] text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}
