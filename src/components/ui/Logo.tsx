export function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <defs>
        <linearGradient id="logo-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#6366f1" />
          <stop offset="1" stopColor="#a855f7" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="18" fill="url(#logo-g)" />
      <rect x="14" y="18" width="36" height="32" rx="8" fill="none" stroke="#fff" strokeWidth="4" />
      <path d="M14 28h36" stroke="#fff" strokeWidth="4" />
      <path d="M24 13v9M40 13v9" stroke="#fff" strokeWidth="4" strokeLinecap="round" />
      <path d="m25 38 5 5 9-10" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
