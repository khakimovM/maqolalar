"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";

export interface ToastInput {
  title: string;
  description?: string;
  icon?: ReactNode;
}
interface ToastItem extends ToastInput {
  id: number;
}
interface ToastCtxType {
  toast: (t: ToastInput) => void;
}

const ToastCtx = createContext<ToastCtxType>({ toast: () => {} });
export function useToast() {
  return useContext(ToastCtx);
}

/** Yengil toast tizimi — o'ng yuqorida qalqib chiqadi, 5s da yo'qoladi. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const remove = useCallback(
    (id: number) => setItems((c) => c.filter((x) => x.id !== id)),
    [],
  );

  const toast = useCallback(
    (t: ToastInput) => {
      const id = Date.now() + Math.floor(Math.random() * 1000);
      setItems((c) => [...c, { ...t, id }]);
      setTimeout(() => remove(id), 5000);
    },
    [remove],
  );

  return (
    <ToastCtx.Provider value={{ toast }}>
      {children}
      <div className="pointer-events-none fixed right-4 top-4 z-[100] flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2">
        <AnimatePresence initial={false}>
          {items.map((t) => (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, x: 40, scale: 0.96 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 40, scale: 0.96 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="pointer-events-auto flex items-start gap-3 rounded-xl border border-border bg-popover p-3 shadow-lg"
            >
              {t.icon && <span className="mt-0.5 shrink-0">{t.icon}</span>}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium leading-snug">{t.title}</p>
                {t.description && (
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {t.description}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => remove(t.id)}
                className="shrink-0 rounded-md p-0.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label="Yopish"
              >
                <X className="h-4 w-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastCtx.Provider>
  );
}
