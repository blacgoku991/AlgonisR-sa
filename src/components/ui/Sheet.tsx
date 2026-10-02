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
                className="fixed inset-0 z-50 bg-slate-950/30 backdrop-blur-[3px] dark:bg-black/50"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              />
            </Dialog.Overlay>
            <Dialog.Content asChild forceMount {...(description ? {} : { "aria-describedby": undefined })}>
              <motion.div
                className={cn(
                  "fixed z-50 flex flex-col overflow-hidden bg-white shadow-2xl outline-none dark:bg-[#11131f]",
                  desktop
                    ? "top-3 right-3 bottom-3 w-[min(560px,calc(100vw-24px))] rounded-[28px] border border-slate-200/70 dark:border-white/10"
                    : "inset-x-0 bottom-0 max-h-[94dvh] rounded-t-[28px]",
                  className,
                )}
                initial={desktop ? { x: 40, opacity: 0 } : { y: "100%" }}
                animate={desktop ? { x: 0, opacity: 1 } : { y: 0 }}
                exit={desktop ? { x: 40, opacity: 0 } : { y: "100%" }}
                transition={{ type: "spring", damping: 32, stiffness: 380 }}
              >
                <Dialog.Title className="sr-only">{title}</Dialog.Title>
                {description && <Dialog.Description className="sr-only">{description}</Dialog.Description>}
                {!desktop && <div className="mx-auto mt-2.5 h-1.5 w-10 shrink-0 rounded-full bg-slate-300 dark:bg-slate-700" />}
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
