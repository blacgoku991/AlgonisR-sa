import { Popover as P } from "radix-ui";
import type { ReactNode } from "react";
import { cn } from "../../lib/cn";

interface PopoverProps {
  trigger: ReactNode;
  children: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  align?: "start" | "center" | "end";
  className?: string;
}

export function Popover({ trigger, children, open, onOpenChange, align = "start", className }: PopoverProps) {
  return (
    <P.Root open={open} onOpenChange={onOpenChange}>
      <P.Trigger asChild>{trigger}</P.Trigger>
      <P.Portal>
        <P.Content
          align={align}
          sideOffset={8}
          collisionPadding={12}
          className={cn(
            "z-[60] rounded-xl border border-zinc-200/80 bg-white/95 p-3 shadow-2xl shadow-zinc-900/10 backdrop-blur-xl outline-none dark:border-white/10 dark:bg-[#161618]/95",
            "origin-[var(--radix-popover-content-transform-origin)] data-[state=open]:animate-pop",
            className,
          )}
        >
          {children}
        </P.Content>
      </P.Portal>
    </P.Root>
  );
}

export const PopoverClose = P.Close;
