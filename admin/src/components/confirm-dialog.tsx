"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle } from "lucide-react";

interface ConfirmOptions {
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
}

interface PromptOptions {
  title: string;
  description?: string;
  placeholder?: string;
  defaultValue?: string;
  confirmText?: string;
  cancelText?: string;
  required?: boolean;
}

type ConfirmFn = (opts: ConfirmOptions) => Promise<boolean>;
type PromptFn = (opts: PromptOptions) => Promise<string | null>;

interface DialogCtxType {
  confirm: ConfirmFn;
  prompt: PromptFn;
}

const DialogCtx = createContext<DialogCtxType>({
  confirm: async () => false,
  prompt: async () => null,
});

export function useConfirm() {
  return useContext(DialogCtx).confirm;
}
export function usePrompt() {
  return useContext(DialogCtx).prompt;
}

type State =
  | { kind: "confirm"; opts: ConfirmOptions }
  | { kind: "prompt"; opts: PromptOptions }
  | null;

/**
 * Tasdiqlash (confirm) va kiritish (prompt) modali — Promise qaytaradi.
 */
export function DialogProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<State>(null);
  const [value, setValue] = useState("");
  const resolver = useRef<((v: unknown) => void) | null>(null);

  const confirm = useCallback<ConfirmFn>((opts) => {
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve as (v: unknown) => void;
      setState({ kind: "confirm", opts });
    });
  }, []);

  const prompt = useCallback<PromptFn>((opts) => {
    return new Promise<string | null>((resolve) => {
      resolver.current = resolve as (v: unknown) => void;
      setValue(opts.defaultValue ?? "");
      setState({ kind: "prompt", opts });
    });
  }, []);

  const finish = useCallback((result: boolean | string | null) => {
    resolver.current?.(result);
    resolver.current = null;
    setState(null);
  }, []);

  useEffect(() => {
    if (!state) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") finish(state!.kind === "prompt" ? null : false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [state, finish]);

  const danger = state?.kind === "confirm" && state.opts.danger;
  const promptInvalid =
    state?.kind === "prompt" && state.opts.required && !value.trim();

  return (
    <DialogCtx.Provider value={{ confirm, prompt }}>
      {children}
      <AnimatePresence>
        {state && (
          <motion.div
            className="fixed inset-0 z-[95] grid place-items-center bg-black/60 p-4 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={() => finish(state.kind === "prompt" ? null : false)}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              onClick={(e) => e.stopPropagation()}
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-xl"
            >
              <div className="flex items-start gap-3">
                {danger && (
                  <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                    <AlertTriangle className="h-5 w-5" />
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <h3 className="font-medium">{state.opts.title}</h3>
                  {state.opts.description && (
                    <p className="mt-1 text-sm text-muted-foreground">
                      {state.opts.description}
                    </p>
                  )}
                </div>
              </div>

              {state.kind === "prompt" && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!promptInvalid) finish(value.trim());
                  }}
                  className="mt-4"
                >
                  <input
                    autoFocus
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    placeholder={state.opts.placeholder}
                    className="w-full rounded-lg border border-input bg-background px-3.5 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/25"
                  />
                </form>
              )}

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => finish(state.kind === "prompt" ? null : false)}
                  className="rounded-lg border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
                >
                  {state.opts.cancelText ?? "Bekor qilish"}
                </button>
                <button
                  type="button"
                  autoFocus={state.kind === "confirm"}
                  disabled={!!promptInvalid}
                  onClick={() =>
                    finish(state.kind === "prompt" ? value.trim() : true)
                  }
                  className={
                    "rounded-lg px-4 py-2 text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-50 " +
                    (danger
                      ? "bg-destructive text-white"
                      : "bg-primary text-primary-foreground")
                  }
                >
                  {state.opts.confirmText ??
                    (state.kind === "prompt" ? "Yuborish" : "Tasdiqlash")}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </DialogCtx.Provider>
  );
}
