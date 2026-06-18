import Image from "@tiptap/extension-image";

type Align = "left" | "center" | "right";
type Mode = "prop" | "w" | "h";

const ICON: Record<Align, string> = {
  left: '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><line x1="2" y1="4" x2="14" y2="4"/><line x1="2" y1="8" x2="10" y2="8"/><line x1="2" y1="12" x2="12" y2="12"/></svg>',
  center: '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><line x1="2" y1="4" x2="14" y2="4"/><line x1="4" y1="8" x2="12" y2="8"/><line x1="3" y1="12" x2="13" y2="12"/></svg>',
  right: '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><line x1="2" y1="4" x2="14" y2="4"/><line x1="6" y1="8" x2="14" y2="8"/><line x1="4" y1="12" x2="14" y2="12"/></svg>',
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
 * O'lchami o'zgartiriladigan + joylashtiriladigan rasm (Google Docs kabi).
 * Attrlar: width ("320px"), height ("200px"|null), align.
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
    };
  },

  addNodeView() {
    return ({ node, editor, getPos }) => {
      let current = node;

      const wrapper = document.createElement("div");
      wrapper.className = "img-resizer";
      wrapper.setAttribute("data-align", (current.attrs.align as string) || "center");

      const box = document.createElement("div");
      box.className = "img-resizer-box";

      const img = document.createElement("img");
      img.src = (current.attrs.src as string) || "";
      img.alt = (current.attrs.alt as string) || "";
      if (current.attrs.width) img.style.width = current.attrs.width as string;
      if (current.attrs.height) img.style.height = current.attrs.height as string;
      box.appendChild(img);

      // Joylashuv paneli
      const bar = document.createElement("div");
      bar.className = "img-resizer-bar";
      (["left", "center", "right"] as Align[]).forEach((a) => {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "img-align-btn";
        b.title = a === "left" ? "Chapga" : a === "center" ? "Markazga" : "O'ngga";
        b.innerHTML = ICON[a];
        b.addEventListener("mousedown", (e) => {
          e.preventDefault();
          e.stopPropagation();
          setAttrs({ align: a });
        });
        bar.appendChild(b);
      });
      box.appendChild(bar);

      // Handle'lar
      HANDLES.forEach((h) => {
        const el = document.createElement("span");
        el.className = "img-handle img-handle-" + h.cls;
        el.addEventListener("mousedown", (e) => startResize(e, h.mode, h.sx, h.sy));
        box.appendChild(el);
      });

      wrapper.appendChild(box);

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
          wrapper.setAttribute(
            "data-align",
            (updated.attrs.align as string) || "center",
          );
          img.src = (updated.attrs.src as string) || "";
          img.alt = (updated.attrs.alt as string) || "";
          img.style.width = (updated.attrs.width as string) || "";
          img.style.height = (updated.attrs.height as string) || "";
          return true;
        },
        ignoreMutation() {
          return true;
        },
      };
    };
  },
});
