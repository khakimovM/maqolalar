import Image from "@tiptap/extension-image";

type Align = "left" | "center" | "right";
/** "none" — rasm alohida qatorda; "left"/"right" — matn rasmning yonidan o'raladi. */
type Wrap = "none" | "left" | "right";
type Mode = "prop" | "w" | "h";

const ICON: Record<Align, string> = {
  left: '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><line x1="2" y1="4" x2="14" y2="4"/><line x1="2" y1="8" x2="10" y2="8"/><line x1="2" y1="12" x2="12" y2="12"/></svg>',
  center: '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><line x1="2" y1="4" x2="14" y2="4"/><line x1="4" y1="8" x2="12" y2="8"/><line x1="3" y1="12" x2="13" y2="12"/></svg>',
  right: '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><line x1="2" y1="4" x2="14" y2="4"/><line x1="6" y1="8" x2="14" y2="8"/><line x1="4" y1="12" x2="14" y2="12"/></svg>',
};

/** Rejim ikonkalari: rasm + matn qanday joylashishini ko'rsatadi. */
const WRAP_ICON: Record<Wrap, string> = {
  left: '<svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"><rect x="1.5" y="3" width="6" height="6" rx="1" fill="currentColor" stroke="none"/><line x1="9.5" y1="4" x2="14.5" y2="4"/><line x1="9.5" y1="6.5" x2="14.5" y2="6.5"/><line x1="9.5" y1="9" x2="14.5" y2="9"/><line x1="1.5" y1="12" x2="14.5" y2="12"/></svg>',
  none: '<svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"><rect x="4" y="2.5" width="8" height="5" rx="1" fill="currentColor" stroke="none"/><line x1="1.5" y1="10.5" x2="14.5" y2="10.5"/><line x1="1.5" y1="13" x2="14.5" y2="13"/></svg>',
  right: '<svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"><rect x="8.5" y="3" width="6" height="6" rx="1" fill="currentColor" stroke="none"/><line x1="1.5" y1="4" x2="6.5" y2="4"/><line x1="1.5" y1="6.5" x2="6.5" y2="6.5"/><line x1="1.5" y1="9" x2="6.5" y2="9"/><line x1="1.5" y1="12" x2="14.5" y2="12"/></svg>',
};

const WRAP_TITLE: Record<Wrap, string> = {
  left: "Matn o'ngidan o'raladi (rasm chapda)",
  none: "Alohida qator (matn o'ralmaydi)",
  right: "Matn chapidan o'raladi (rasm o'ngda)",
};

const ALIGN_TITLE: Record<Align, string> = {
  left: "Chapga",
  center: "Markazga",
  right: "O'ngga",
};

const HANDLES: { cls: string; mode: Mode; sx: number; sy: number }[] = [
  { cls: "tl", mode: "prop", sx: -1, sy: 0 },
  { cls: "tr", mode: "prop", sx: 1, sy: 0 },
  { cls: "bl", mode: "prop", sx: -1, sy: 0 },
  { cls: "br", mode: "prop", sx: 1, sy: 0 },
  { cls: "rm", mode: "w", sx: 1, sy: 0 },
  { cls: "lm", mode: "w", sx: -1, sy: 0 },
  { cls: "tm", mode: "h", sx: 0, sy: -1 },
  { cls: "bm", mode: "h", sx: 0, sy: 1 },
];

/**
 * O'lchami o'zgartiriladigan + joylashtiriladigan rasm (Google Docs / Word kabi).
 *
 * Attrlar:
 *   width  — "320px" yoki null (avto)
 *   height — "200px" yoki null (avto)
 *   wrap   — "none" (alohida qator) | "left" | "right" (matn yonidan o'raladi)
 *   align  — faqat wrap="none" da ishlaydi: chap / markaz / o'ng
 *
 * Burchak handle'lar — mutanosib; chekka handle'lar — faqat width yoki faqat height.
 */
export const ResizableImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null,
        parseHTML: (el: HTMLElement) =>
          el.style.width || el.getAttribute("width") || null,
        renderHTML: (attrs: { width?: string | null }) =>
          attrs.width ? { style: `width: ${attrs.width}` } : {},
      },
      height: {
        default: null,
        parseHTML: (el: HTMLElement) => el.style.height || null,
        renderHTML: (attrs: { height?: string | null }) =>
          attrs.height ? { style: `height: ${attrs.height}` } : {},
      },
      align: {
        default: "center",
        parseHTML: (el: HTMLElement) => el.getAttribute("data-align") || "center",
        renderHTML: (attrs: { align?: string }) => ({
          "data-align": attrs.align || "center",
        }),
      },
      wrap: {
        default: "none",
        parseHTML: (el: HTMLElement) => el.getAttribute("data-wrap") || "none",
        renderHTML: (attrs: { wrap?: string }) => ({
          "data-wrap": attrs.wrap || "none",
        }),
      },
    };
  },

  addNodeView() {
    return ({ node, editor, getPos }) => {
      let current = node;

      const wrapper = document.createElement("div");
      wrapper.className = "img-resizer";

      const box = document.createElement("div");
      box.className = "img-resizer-box";

      const img = document.createElement("img");
      img.src = (current.attrs.src as string) || "";
      img.alt = (current.attrs.alt as string) || "";
      if (current.attrs.width) img.style.width = current.attrs.width as string;
      if (current.attrs.height) img.style.height = current.attrs.height as string;
      box.appendChild(img);

      // ── Panel: rejim (o'ralish) + joylashuv ──────────────────────────
      const bar = document.createElement("div");
      bar.className = "img-resizer-bar";

      const wrapBtns: Record<Wrap, HTMLButtonElement> = {} as Record<
        Wrap,
        HTMLButtonElement
      >;
      const alignBtns: Record<Align, HTMLButtonElement> = {} as Record<
        Align,
        HTMLButtonElement
      >;

      function makeBtn(title: string, html: string, onPick: () => void) {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "img-align-btn";
        b.title = title;
        b.innerHTML = html;
        b.addEventListener("mousedown", (e) => {
          e.preventDefault();
          e.stopPropagation();
          onPick();
        });
        return b;
      }

      (["left", "none", "right"] as Wrap[]).forEach((w) => {
        const b = makeBtn(WRAP_TITLE[w], WRAP_ICON[w], () => setAttrs({ wrap: w }));
        wrapBtns[w] = b;
        bar.appendChild(b);
      });

      const sep = document.createElement("span");
      sep.className = "img-bar-sep";
      bar.appendChild(sep);

      const alignGroup = document.createElement("span");
      alignGroup.className = "img-align-group";
      (["left", "center", "right"] as Align[]).forEach((a) => {
        const b = makeBtn(ALIGN_TITLE[a], ICON[a], () => setAttrs({ align: a }));
        alignBtns[a] = b;
        alignGroup.appendChild(b);
      });
      bar.appendChild(alignGroup);

      box.appendChild(bar);

      /** Panel tugmalarini joriy holatga moslaydi. */
      function syncBar() {
        const wrap = ((current.attrs.wrap as Wrap) || "none") as Wrap;
        const align = ((current.attrs.align as Align) || "center") as Align;
        (Object.keys(wrapBtns) as Wrap[]).forEach((w) =>
          wrapBtns[w].classList.toggle("active", w === wrap),
        );
        (Object.keys(alignBtns) as Align[]).forEach((a) =>
          alignBtns[a].classList.toggle("active", a === align),
        );
        // Joylashuv faqat "alohida qator" rejimida ma'noga ega
        const off = wrap !== "none";
        alignGroup.classList.toggle("disabled", off);
        sep.classList.toggle("disabled", off);
        wrapper.setAttribute("data-wrap", wrap);
        wrapper.setAttribute("data-align", align);
      }

      // Handle'lar
      HANDLES.forEach((h) => {
        const el = document.createElement("span");
        el.className = "img-handle img-handle-" + h.cls;
        el.addEventListener("mousedown", (e) => startResize(e, h.mode, h.sx, h.sy));
        box.appendChild(el);
      });

      wrapper.appendChild(box);
      syncBar();

      function setAttrs(attrs: Record<string, unknown>) {
        if (typeof getPos !== "function") return;
        const pos = getPos();
        if (typeof pos !== "number") return;
        const tr = editor.view.state.tr.setNodeMarkup(pos, undefined, {
          ...current.attrs,
          ...attrs,
        });
        editor.view.dispatch(tr);
      }

      function startResize(e: MouseEvent, mode: Mode, sx: number, sy: number) {
        e.preventDefault();
        e.stopPropagation();
        const startX = e.clientX;
        const startY = e.clientY;
        const rect = img.getBoundingClientRect();
        const startW = rect.width;
        const startH = rect.height;
        const maxW = editor.view.dom.getBoundingClientRect().width;

        if (mode === "w") img.style.height = startH + "px";
        if (mode === "h") img.style.width = startW + "px";
        if (mode === "prop") img.style.height = "";

        const onMove = (ev: MouseEvent) => {
          if (mode === "h") {
            const h = Math.max(40, Math.round(startH + (ev.clientY - startY) * sy));
            img.style.height = h + "px";
          } else {
            const w = Math.max(
              40,
              Math.min(maxW, Math.round(startW + (ev.clientX - startX) * sx)),
            );
            img.style.width = w + "px";
          }
        };
        const onUp = () => {
          document.removeEventListener("mousemove", onMove);
          document.removeEventListener("mouseup", onUp);
          if (mode === "prop") {
            setAttrs({ width: img.style.width, height: null });
          } else {
            setAttrs({ width: img.style.width, height: img.style.height });
          }
        };
        document.addEventListener("mousemove", onMove);
        document.addEventListener("mouseup", onUp);
      }

      return {
        dom: wrapper,
        selectNode() {
          wrapper.classList.add("selected");
        },
        deselectNode() {
          wrapper.classList.remove("selected");
        },
        update(updated) {
          if (updated.type.name !== current.type.name) return false;
          current = updated;
          img.src = (updated.attrs.src as string) || "";
          img.alt = (updated.attrs.alt as string) || "";
          img.style.width = (updated.attrs.width as string) || "";
          img.style.height = (updated.attrs.height as string) || "";
          syncBar();
          return true;
        },
        ignoreMutation() {
          return true;
        },
      };
    };
  },
});
