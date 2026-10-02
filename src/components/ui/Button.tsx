import { LoaderCircle } from "lucide-react";
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "../../lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "teams" | "soft";
type Size = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: ReactNode;
  iconRight?: ReactNode;
}

const variants: Record<Variant, string> = {
  primary: "bg-brand-600 text-accent-fg hover:opacity-85 active:opacity-75",
  secondary: "border border-line bg-transparent text-zinc-900 hover:bg-surface dark:text-zinc-100",
  ghost: "text-muted hover:bg-surface hover:text-zinc-950 dark:hover:text-white",
  soft: "bg-surface text-zinc-900 hover:bg-surface-2 dark:text-zinc-100",
  danger: "bg-rose-600 text-white hover:bg-rose-500 active:bg-rose-700",
  teams: "bg-teams text-white hover:brightness-110",
};

const sizes: Record<Size, string> = {
  sm: "h-8 gap-1.5 rounded-full px-3.5 text-[13px]",
  md: "h-10 gap-2 rounded-full px-5 text-sm",
  lg: "h-12 gap-2 rounded-full px-6 text-[15px]",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", loading, icon, iconRight, className, children, disabled, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        "relative inline-flex shrink-0 select-none items-center justify-center font-medium whitespace-nowrap transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {loading ? <LoaderCircle className="animate-spin" /> : icon}
      {children}
      {iconRight}
    </button>
  );
});
