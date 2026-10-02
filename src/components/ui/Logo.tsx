/** Monogramme monochrome (s'inverse avec le thème). */
export function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <rect width="64" height="64" rx="16" className="fill-zinc-950 dark:fill-white" />
      <path
        d="M22 44V20h12a8 8 0 0 1 0 16H22m12 0 9 8"
        fill="none"
        className="stroke-white dark:stroke-zinc-950"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
