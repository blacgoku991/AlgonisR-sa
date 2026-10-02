/** Logo : calendrier stylisé sur pastille turquoise. */
export function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <rect width="64" height="64" rx="18" className="fill-brand-600" />
      <rect x="15" y="19" width="34" height="29" rx="7" fill="none" className="stroke-accent-fg" strokeWidth="4" />
      <path d="M15 28h34M25 14v9M39 14v9" fill="none" className="stroke-accent-fg" strokeWidth="4" strokeLinecap="round" />
      <circle cx="32" cy="38" r="3.5" className="fill-accent-fg" />
    </svg>
  );
}
