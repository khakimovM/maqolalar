"use client";

import { useMemo, useRef, useState } from "react";
import { X } from "lucide-react";
import katex from "katex";

export type MathMode = "inline" | "block";

interface Sym {
  /** Tugmada ko'rsatiladigan LaTeX (qisqa). */
  label: string;
  /** Matnga qo'shiladigan LaTeX. */
  tex: string;
}

interface Group {
  title: string;
  items: Sym[];
}

const GROUPS: Group[] = [
  {
    title: "Asoslar",
    items: [
      { label: "\\frac{a}{b}", tex: "\\frac{a}{b}" },
      { label: "\\sqrt{x}", tex: "\\sqrt{x}" },
      { label: "\\sqrt[n]{x}", tex: "\\sqrt[n]{x}" },
      { label: "x^{2}", tex: "x^{2}" },
      { label: "x_{i}", tex: "x_{i}" },
      { label: "x_{a}^{b}", tex: "x_{a}^{b}" },
      { label: "\\bar{x}", tex: "\\bar{x}" },
      { label: "\\hat{x}", tex: "\\hat{x}" },
      { label: "\\vec{x}", tex: "\\vec{x}" },
    ],
  },
  {
    title: "Operatorlar",
    items: [
      { label: "\\sum", tex: "\\sum_{i=1}^{n} " },
      { label: "\\prod", tex: "\\prod_{i=1}^{n} " },
      { label: "\\int", tex: "\\int_{a}^{b} " },
      { label: "\\oint", tex: "\\oint " },
      { label: "\\lim", tex: "\\lim_{x \\to 0} " },
      { label: "\\bigcap", tex: "\\bigcap " },
      { label: "\\bigcup", tex: "\\bigcup " },
      { label: "\\partial", tex: "\\partial " },
      { label: "\\nabla", tex: "\\nabla " },
    ],
  },
  {
    title: "Qavslar",
    items: [
      { label: "(\\;)", tex: "\\left( x \\right)" },
      { label: "[\\;]", tex: "\\left[ x \\right]" },
      { label: "\\{\\;\\}", tex: "\\left\\{ x \\right\\}" },
      { label: "|x|", tex: "\\left| x \\right|" },
      { label: "\\langle\\rangle", tex: "\\langle x \\rangle" },
    ],
  },
  {
    title: "Munosabatlar",
    items: [
      { label: "=", tex: "=" },
      { label: "\\neq", tex: "\\neq " },
      { label: "\\leq", tex: "\\leq " },
      { label: "\\geq", tex: "\\geq " },
      { label: "\\approx", tex: "\\approx " },
      { label: "\\equiv", tex: "\\equiv " },
      { label: "\\times", tex: "\\times " },
      { label: "\\div", tex: "\\div " },
      { label: "\\pm", tex: "\\pm " },
      { label: "\\cdot", tex: "\\cdot " },
      { label: "\\infty", tex: "\\infty " },
      { label: "\\to", tex: "\\to " },
      { label: "\\Rightarrow", tex: "\\Rightarrow " },
    ],
  },
  {
    title: "Yunon harflari",
    items: [
      { label: "\\alpha", tex: "\\alpha " },
      { label: "\\beta", tex: "\\beta " },
      { label: "\\gamma", tex: "\\gamma " },
      { label: "\\delta", tex: "\\delta " },
      { label: "\\theta", tex: "\\theta " },
      { label: "\\lambda", tex: "\\lambda " },
      { label: "\\mu", tex: "\\mu " },
      { label: "\\pi", tex: "\\pi " },
      { label: "\\rho", tex: "\\rho " },
      { label: "\\sigma", tex: "\\sigma " },
      { label: "\\phi", tex: "\\phi " },
      { label: "\\omega", tex: "\\omega " },
      { label: "\\Delta", tex: "\\Delta " },
      { label: "\\Sigma", tex: "\\Sigma " },
      { label: "\\Omega", tex: "\\Omega " },
    ],
  },
];

function tex2html(tex: string, displayMode: boolean): string {
  try {
    return katex.renderToString(tex, { throwOnError: false, displayMode });
  } catch {
    return tex;
  }
}

export function MathDialog({
  initial,
  onSubmit,
  onClose,
}: {
  initial: { latex: string; mode: MathMode };
  onSubmit: (latex: string, mode: MathMode) => void;
  onClose: () => void;
}) {
  const [latex, setLatex] = useState(initial.latex);
  const [mode, setMode] = useState<MathMode>(initial.mode);
  const taRef = useRef<HTMLTextAreaElement>(null);

  const preview = useMemo(
    () => tex2html(latex || "", mode === "block"),
    [latex, mode],
  );

  function insert(snippet: string) {
    const ta = taRef.current;
    const start = ta?.selectionStart ?? latex.length;
    const end = ta?.selectionEnd ?? latex.length;
    const next = latex.slice(0, start) + snippet + latex.slice(end);
    setLatex(next);
    requestAnimationFrame(() => {
      if (ta) {
        ta.focus();
        const pos = start + snippet.length;
        ta.setSelectionRange(pos, pos);
      }
    });
  }

  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-xl">
        {/* Sarlavha */}
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <h3 className="font-medium">Formula qo&apos;shish</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground hover:bg-muted"
            aria-label="Yopish"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {/* Inline / blok tanlash */}
          <div className="mb-4 flex gap-2">
            {(["inline", "block"] as MathMode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={
                  "rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors " +
                  (mode === m
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-input text-muted-foreground hover:text-foreground")
                }
              >
                {m === "inline" ? "Matn ichida" : "Alohida qator"}
              </button>
            ))}
          </div>

          {/* Belgilar paneli */}
          <div className="mb-4 space-y-3">
            {GROUPS.map((g) => (
              <div key={g.title}>
                <p className="mb-1.5 text-xs font-medium text-muted-foreground">
                  {g.title}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {g.items.map((s) => (
                    <button
                      key={s.tex}
                      type="button"
                      onClick={() => insert(s.tex)}
                      title={s.tex}
                      className="flex h-9 min-w-9 items-center justify-center rounded-md border border-border bg-background px-2 text-foreground transition-colors hover:border-primary/50 hover:bg-muted"
                      dangerouslySetInnerHTML={{ __html: tex2html(s.label, false) }}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* LaTeX maydon */}
          <div className="mb-4 space-y-1.5">
            <label htmlFor="latex" className="block text-sm font-medium">
              LaTeX kod
            </label>
            <textarea
              id="latex"
              ref={taRef}
              value={latex}
              onChange={(e) => setLatex(e.target.value)}
              rows={3}
              placeholder="Masalan:  x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}"
              className="w-full resize-y rounded-lg border border-input bg-background px-3.5 py-2.5 font-mono text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/25"
            />
          </div>

          {/* Jonli ko'rinish */}
          <div className="space-y-1.5">
            <span className="block text-sm font-medium">Ko&apos;rinishi</span>
            <div
              className="min-h-[3rem] overflow-x-auto rounded-lg border border-border bg-muted/20 px-4 py-3 text-center"
              dangerouslySetInnerHTML={{
                __html: latex.trim()
                  ? preview
                  : "<span style='color:var(--muted-foreground)'>Formula shu yerda ko'rinadi</span>",
              }}
            />
          </div>
        </div>

        {/* Amallar */}
        <div className="flex justify-end gap-3 border-t border-border px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
          >
            Bekor qilish
          </button>
          <button
            type="button"
            onClick={() => onSubmit(latex.trim(), mode)}
            disabled={!latex.trim()}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            Qo&apos;shish
          </button>
        </div>
      </div>
    </div>
  );
}
