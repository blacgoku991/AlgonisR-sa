import { AnimatePresence, motion } from "motion/react";
import { Dialog } from "radix-ui";
import { useEffect, useState, type ReactNode } from "react";
import { cn } from "../../lib/cn";

function useIsDesktop() {
  const query = "(min-width: 768px)";
  const [desktop, setDesktop] = useState(() => typeof window !== "undefined" && window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const onChange = () => setDesktop(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return desktop;
}

interface SheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}

/** Panneau latéral (bureau) / feuille glissante depuis le bas (mobile). */
export function Sheet({ open, onOpenChange, title, description, children, className }: SheetProps) {
  const desktop = useIsDesktop();
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild forceMount>
              <motion.div
                className="fixed inset-0 z-50 bg-black/40 dark:bg-black/60"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              />
            </Dialog.Overlay>
            <Dialog.Content asChild forceMount {...(description ? {} : { "aria-describedby": undefined })}>
              <motion.div
                className={cn(
                  "fixed z-50 flex flex-col overflow-hidden bg-[var(--bg)] shadow-2xl outline-none",
                  desktop
                    ? "top-0 right-0 bottom-0 w-[min(520px,100vw)] border-l border-line"
                    : "inset-x-0 bottom-0 max-h-[94dvh] rounded-t-xl",
                  className,
                )}
                initial={desktop ? { x: 24, opacity: 0 } : { y: "100%" }}
                animate={desktop ? { x: 0, opacity: 1 } : { y: 0 }}
                exit={desktop ? { x: 24, opacity: 0 } : { y: "100%" }}
                transition={{ type: "tween", ease: [0.2, 0.8, 0.2, 1], duration: 0.22 }}
              >
                <Dialog.Title className="sr-only">{title}</Dialog.Title>
                {description && <Dialog.Description className="sr-only">{description}</Dialog.Description>}
                {!desktop && <div className="mx-auto mt-2.5 h-1.5 w-10 shrink-0 rounded-full bg-zinc-300 dark:bg-zinc-700" />}
                {children}
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}

export const SheetClose = Dialog.Close;
