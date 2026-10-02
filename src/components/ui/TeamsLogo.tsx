/** Pictogramme « réunion Teams » (stylisé, aux couleurs de Microsoft Teams). */
export function TeamsLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden>
      <defs>
        <linearGradient id="teams-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#7b83eb" />
          <stop offset="1" stopColor="#4b53bc" />
        </linearGradient>
      </defs>
      <circle cx="29.5" cy="11" r="4.5" fill="#7b83eb" />
      <rect x="23" y="17" width="14" height="14" rx="5" fill="#7b83eb" opacity="0.75" />
      <rect x="3" y="8" width="24" height="24" rx="6" fill="url(#teams-g)" />
      <path d="M9.5 14.5h11v3.2h-3.9V27h-3.2v-9.3H9.5z" fill="#fff" />
    </svg>
  );
}
