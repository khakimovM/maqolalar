import Image from "@tiptap/extension-image";
import type { Node as PMNode } from "@tiptap/pm/model";
import { placeFloatingBar } from "./editor-bar";

/**
 * MATN ICHIDAGI rasm — inline node, o'lchami o'zgartiriladigan.
 *
 * DIQQAT: blok darajasidagi rasm joylashuvi endi BU YERDA EMAS.
 * Yonma-yon rasmlar, tekislash va qator kengligi `image-row.ts` dagi
 * `imageRow` / `rowImage` node'larining ishi. Bu fayl faqat matn oqimida,
 * so'zlar orasida turadigan rasm uchun qoldi (kichik belgi, eski maqolalar,
 * ro'yxat elementi ichidagi rasm).
 *
 * OLIB TASHLANGAN (va nega)
 * -------------------------
 *   wrap: "free"      — `position: relative` edi, ya'ni rasm oqimdan CHIQMAS,
 *                       eski joyida bo'sh o'ra qolar edi. Va'da qilgan narsani
 *                       bermagani uchun butunlay olib tashlandi.
 *   offset / offsetY  — surish. Foizi goh `margin`, goh `left` sifatida
 *                       qo'llanardi (har rejimda boshqa fizika), bo'luvchi esa
 *                       noto'g'ri edi — sudrash kursordan orqada qolardi.
 *   align tugmalari   — bir vaqtda node `align` va paragraf `textAlign` ni
 *                       yozardi, CSS esa holatga qarab faqat bittasini o'qirdi;
 *                       JSON'da doim ikkita zid qiymat saqlanardi.
 *   transaction tinglovchi — har rasm uchun global listener + har bosishda
 *                       `doc.resolve(getPos())`. Endi holat faqat `update()` dan
 *                       va CSS struktura selektorlaridan olinadi.
 *
 * `align` ATRIBUTI saqlanib qoldi (tugmasi yo'q): eski maqolalarda u bor va
 * sayt rendereri yolg'iz rasm uchun uni hali ham o'qiydi — qayta saqlashda
 * qiymat yo'qolmasin.
 */

type Wrap = "none" | "left" | "right";
type Mode = "prop" | "w" | "h";

const WRAPS: Wrap[] = ["none", "left", "right"];

const WRAP_ICON: Record<Wrap, string> = {
  none: '<svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"><rect x="4" y="2.5" width="8" height="5" rx="1" fill="currentColor" stroke="none"/><line x1="1.5" y1="10.5" x2="14.5" y2="10.5"/><line x1="1.5" y1="13" x2="14.5" y2="13"/></svg>',
  left: '<svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"><rect x="1.5" y="3" width="6" height="6" rx="1" fill="currentColor" stroke="none"/><line x1="9.5" y1="4" x2="14.5" y2="4"/><line x1="9.5" y1="6.5" x2="14.5" y2="6.5"/><line x1="9.5" y1="9" x2="14.5" y2="9"/><line x1="1.5" y1="12" x2="14.5" y2="12"/></svg>',
  right: '<svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"><rect x="8.5" y="3" width="6" height="6" rx="1" fill="currentColor" stroke="none"/><line x1="1.5" y1="4" x2="6.5" y2="4"/><line x1="1.5" y1="6.5" x2="6.5" y2="6.5"/><line x1="1.5" y1="9" x2="6.5" y2="9"/><line x1="1.5" y1="12" x2="14.5" y2="12"/></svg>',
};

const WRAP_TITLE: Record<Wrap, string> = {
  none: "Matn oqimida — rasm matn bilan bir qatorda turadi",
  left: "Rasm chapda, matn o'ng tomonidan o'raladi",
  right: "Rasm o'ngda, matn chap tomonidan o'raladi",
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

function toWrap(value: unknown): Wrap {
  return WRAPS.includes(value as Wrap) ? (value as Wrap) : "none";
}

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
      /** Eski maqolalar uchun saqlanadi — muharrirda tugmasi yo'q. */
      align: {
        default: "center",
        parseHTML: (el: HTMLElement) => el.getAttribute("data-align") || "center",
        renderHTML: (attrs: { align?: string }) => ({
          "data-align": attrs.align || "center",
        }),
      },
      /** none | left | right */
      wrap: {
        default: "none",
        parseHTML: (el: HTMLElement) => toWrap(el.getAttribute("data-wrap")),
        renderHTML: (attrs: { wrap?: string }) => ({
          "data-wrap": toWrap(attrs.wrap),
        }),
      },
    };
  },

  addNodeView() {
    return ({ node, editor, getPos }) => {
      let current = node;

      // Inline node → DOM ham inline bo'lishi SHART (span, div emas).
      const wrapper = document.createElement("span");
      wrapper.className = "rt-img img-resizer";
      // Yolg'iz rasm endi `imageRow` bo'ladi, shuning uchun muharrirda inline
      // rasm har doim "yonida boshqa narsa bor" holatida.
      wrapper.setAttribute("data-solo", "false");
      wrapper.setAttribute("data-align", (current.attrs.align as string) || "center");

      const box = document.createElement("span");
      box.className = "img-resizer-box";

      const img = document.createElement("img");
      box.appendChild(img);

      const bar = document.createElement("span");
      bar.className = "img-resizer-bar";
      const wrapBtns = {} as Record<Wrap, HTMLButtonElement>;
      WRAPS.forEach((w) => {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "img-align-btn";
        b.title = WRAP_TITLE[w];
        b.innerHTML = WRAP_ICON[w];
        b.addEventListener("mousedown", (e) => {
          e.preventDefault();
          e.stopPropagation();
          setAttrs({ wrap: w });
        });
        wrapBtns[w] = b;
        bar.appendChild(b);
      });
      box.appendChild(bar);

      HANDLES.forEach((h) => {
        const el = document.createElement("span");
        el.className = "img-handle img-handle-" + h.cls;
        el.addEventListener("mousedown", (e) => startResize(e, h.mode, h.sx, h.sy));
        box.appendChild(el);
      });

      wrapper.appendChild(box);
      // Panel rasm ustida turadi; yuqorida joy bo'lmasa (hujjat boshi yoki
      // yopishqoq toolbar ostida) pastga o'tkaziladi.
      wrapper.addEventListener("mouseenter", () => placeFloatingBar(bar, wrapper));
      sync(current);

      function sync(n: PMNode) {
        const wrap = toWrap(n.attrs.wrap);
        img.src = (n.attrs.src as string) || "";
        img.alt = (n.attrs.alt as string) || "";
        img.style.width = (n.attrs.width as string) || "";
        img.style.height = (n.attrs.height as string) || "";
        wrapper.setAttribute("data-wrap", wrap);
        wrapper.setAttribute("data-align", (n.attrs.align as string) || "center");
        WRAPS.forEach((w) => wrapBtns[w].classList.toggle("active", w === wrap));
      }

      /** Atributlarni hujjatdagi ENG SO'NGGI holat ustiga yozadi. */
      function setAttrs(attrs: Record<string, unknown>) {
        const pos = typeof getPos === "function" ? getPos() : undefined;
        if (typeof pos !== "number") return;
        const { state } = editor.view;
        const fresh = state.doc.nodeAt(pos);
        if (!fresh || fresh.type.name !== current.type.name) return;
        editor.view.dispatch(
          state.tr.setNodeMarkup(pos, undefined, { ...fresh.attrs, ...attrs }),
        );
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
          placeFloatingBar(bar, wrapper);
        },
        deselectNode() {
          wrapper.classList.remove("selected");
        },
        update(updated: PMNode) {
          if (updated.type.name !== current.type.name) return false;
          current = updated;
          sync(updated);
          return true;
        },
        ignoreMutation() {
          return true;
        },
      };
    };
  },
});
