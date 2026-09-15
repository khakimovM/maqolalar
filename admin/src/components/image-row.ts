import { Node, mergeAttributes } from "@tiptap/core";
import { NodeSelection, Plugin, PluginKey } from "@tiptap/pm/state";
import type { EditorState } from "@tiptap/pm/state";
import type { Node as PMNode } from "@tiptap/pm/model";
import type { ViewMutationRecord } from "@tiptap/pm/view";
import { placeFloatingBar } from "./editor-bar";
import {
  MAX_ROW_IMAGES,
  ROW_ALIGNS,
  ROW_FLOATS,
  clamp,
  round2,
  toRowAlign,
  toRowFloat,
  toRowWidth,
  toShare,
  type RowAlign,
  type RowFloat,
} from "@/lib/editor-content";

/**
 * RASM QATORI — "ikkita rasmni yonma-yon qo'yish" muammosining yechimi.
 *
 * ARXITEKTURA (muhim!)
 * --------------------
 * Ilgari rasm INLINE node edi va yonma-yon turish `display:inline-block` +
 * `margin` ga tayanardi. Bu MATEMATIK jihatdan ishonchsiz: ikkita rasm aniq
 * 50% qilinsa ham `50% + 50% + 4x4px > 100%` bo'lib, ikkinchisi pastga tushardi.
 *
 * Endi struktura aniq:
 *
 *   imageRow (blok)  content: "rowImage*"   → display:flex
 *     rowImage (atom blok)                  → flex: var(--share) 1 0
 *
 * `flex-basis: 0` + `flex-grow: share` bo'lgani uchun flex `gap` ni AVTOMATIK
 * hisobga oladi — yonma-yon turish endi kafolatlangan. Nisbat `share` da
 * saqlanadi (60/40 → 1.5 va 1), shuning uchun sayt ustuni torroq bo'lsa ham
 * nisbat o'zgarmaydi.
 *
 * NEGA `content: "rowImage*"`, `"image+"` EMAS
 * --------------------------------------------
 * `image` inline bo'lgani uchun `content: "image+"` qator node'ini TEXTBLOCK
 * qilib qo'yardi (`NodeType.isTextblock = isBlock && inlineContent`). U holda
 * ProseMirror har render'da qator ichiga `<br class="ProseMirror-trailingBreak">`
 * va (oxirgi bola contentEditable=false bo'lgani uchun Chrome/Safari'da)
 * `<img class="ProseMirror-separator">` qo'shadi — ular flex ITEM bo'lib,
 * qator oxiriga ortiqcha `gap` qo'shadi va rasmlarni siqadi.
 * Bundan tashqari `rowImage` ALOHIDA BLOK bo'lgani uchun uchta narsa tekinga keladi:
 *   • DragHandle uni ushlay oladi (u inline atomlarni ataylab chetlab o'tadi);
 *   • rasmni qatordan tashqariga sudraganda `dropPoint` `findWrapping` orqali
 *     avtomatik YANGI QATOR yasaydi — `handleDrop` yozish shart emas;
 *   • eski px `width` atributi qator ichiga sizib kira olmaydi.
 *
 * `rowImage` ga ATAYLAB `group` berilmagan: u hujjatda `imageRow` dan tashqarida
 * hech qachon paydo bo'lolmaydi.
 *
 * Joylashuv qoidalari `.rt-row` CSS blokida (globals.css) va u admin bilan
 * frontend'da AYNAN bir xil.
 */

/** Ajratgichni sudrashda har bir rasm juftlikning kamida shuncha qismini egallaydi. */
const MIN_SPLIT = 0.15;
/** Qatorning eng kichik kengligi — ustun kengligining foizi. */
const MIN_ROW_WIDTH = 10;

const ALIGN_ICON: Record<RowAlign, string> = {
  left: '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><line x1="2" y1="4" x2="14" y2="4"/><line x1="2" y1="8" x2="10" y2="8"/><line x1="2" y1="12" x2="12" y2="12"/></svg>',
  center: '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><line x1="2" y1="4" x2="14" y2="4"/><line x1="4" y1="8" x2="12" y2="8"/><line x1="3" y1="12" x2="13" y2="12"/></svg>',
  right: '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><line x1="2" y1="4" x2="14" y2="4"/><line x1="6" y1="8" x2="14" y2="8"/><line x1="4" y1="12" x2="14" y2="12"/></svg>',
};

const FLOAT_ICON: Record<RowFloat, string> = {
  none: '<svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"><rect x="4" y="2.5" width="8" height="5" rx="1" fill="currentColor" stroke="none"/><line x1="1.5" y1="10.5" x2="14.5" y2="10.5"/><line x1="1.5" y1="13" x2="14.5" y2="13"/></svg>',
  left: '<svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"><rect x="1.5" y="3" width="6" height="6" rx="1" fill="currentColor" stroke="none"/><line x1="9.5" y1="4" x2="14.5" y2="4"/><line x1="9.5" y1="6.5" x2="14.5" y2="6.5"/><line x1="9.5" y1="9" x2="14.5" y2="9"/><line x1="1.5" y1="12" x2="14.5" y2="12"/></svg>',
  right: '<svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"><rect x="8.5" y="3" width="6" height="6" rx="1" fill="currentColor" stroke="none"/><line x1="1.5" y1="4" x2="6.5" y2="4"/><line x1="1.5" y1="6.5" x2="6.5" y2="6.5"/><line x1="1.5" y1="9" x2="6.5" y2="9"/><line x1="1.5" y1="12" x2="14.5" y2="12"/></svg>',
};

const CLOSE_ICON =
  '<svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="4" y1="4" x2="12" y2="12"/><line x1="12" y1="4" x2="4" y2="12"/></svg>';

const TRASH_ICON =
  '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><line x1="2.5" y1="4" x2="13.5" y2="4"/><path d="M5.5 4V2.6h5V4"/><path d="M4 4l.7 9.4h6.6L12 4"/><line x1="6.6" y1="6.4" x2="6.8" y2="11"/><line x1="9.4" y1="6.4" x2="9.2" y2="11"/></svg>';

const ALIGN_TITLE: Record<RowAlign, string> = {
  left: "Qatorni chapga",
  center: "Qatorni markazga",
  right: "Qatorni o'ngga",
};

const FLOAT_TITLE: Record<RowFloat, string> = {
  none: "Matn oqimida — qator o'z joyini egallaydi",
  left: "Qator chapda, matn o'ng tomonidan o'raladi",
  right: "Qator o'ngda, matn chap tomonidan o'raladi",
};

function makeBtn(cls: string, title: string, html: string, onPick: () => void) {
  const b = document.createElement("button");
  b.type = "button";
  b.className = "rt-bar-btn " + cls;
  b.title = title;
  b.innerHTML = html;
  b.addEventListener("mousedown", (e) => {
    e.preventDefault();
    e.stopPropagation();
    onPick();
  });
  return b;
}

function sepEl() {
  const s = document.createElement("span");
  s.className = "rt-bar-sep";
  return s;
}

/** Qator DOM'ini hujjat holatiga moslaydi. `renderHTML` bilan bir xil shakl. */
function applyRowAttrs(dom: HTMLElement, attrs: Record<string, unknown>) {
  const width = toRowWidth(attrs.width);
  dom.className = "rt-row";
  dom.setAttribute("data-type", "image-row");
  dom.setAttribute("data-align", toRowAlign(attrs.align));
  dom.setAttribute("data-float", toRowFloat(attrs.float));
  dom.setAttribute("data-fit", width === null ? "auto" : "scale");
  if (width === null) {
    dom.removeAttribute("data-width");
    dom.style.removeProperty("--rw");
  } else {
    dom.setAttribute("data-width", String(width));
    dom.style.setProperty("--rw", width + "%");
  }
}

/** Tanlov ichidagi `imageRow` (bo'lmasa `null`). */
export function findImageRow(
  state: EditorState,
): { node: PMNode; pos: number } | null {
  const sel = state.selection;
  if (sel instanceof NodeSelection && sel.node.type.name === "imageRow") {
    return { node: sel.node, pos: sel.from };
  }
  const $from = sel.$from;
  for (let d = $from.depth; d > 0; d--) {
    const n = $from.node(d);
    if (n.type.name === "imageRow") return { node: n, pos: $from.before(d) };
  }
  return null;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    imageRow: {
      /** Joriy blokdan KEYIN rasm qatori qo'yadi. */
      insertImageRow: (srcs: string[]) => ReturnType;
      /** Joriy qatorga yana bitta rasm qo'shadi (yonma-yon). */
      addImageToRow: (src: string) => ReturnType;
      setImageRowAlign: (align: RowAlign) => ReturnType;
      setImageRowFloat: (float: RowFloat) => ReturnType;
      setImageRowWidth: (width: number | null) => ReturnType;
    };
  }
}

const HOUSEKEEPING = new PluginKey("imageRowHousekeeping");

/**
 * Qator "gigiyenasi" — har tranzaksiyadan keyin sxemani toza holatga keltiradi:
 *   1. faqat rasmlardan iborat paragrafni `imageRow` ga o'giradi (sudrab
 *      tashlash, joylashtirish va eski kontentdan keyin o'z-o'zini tuzatadi);
 *   2. bo'sh qatorni o'chiradi;
 *   3. 4 tadan ortiq rasmni keyingi qatorga ko'chiradi;
 *   4. eng kichik `share` ni 1 ga keltiradi (flex-grow yig'indisi 1 dan kichik
 *      bo'lsa qator to'liq to'lmaydi).
 *
 * Undo bilan muammo yo'q: `appendTransaction` natijasi `appended` deb
 * belgilanadi va bir xil undo qadamiga qo'shiladi — bitta Ctrl+Z hammasini qaytaradi.
 */
function housekeeping() {
  return new Plugin({
    key: HOUSEKEEPING,
    appendTransaction(trs, _oldState, state) {
      if (!trs.some((t) => t.docChanged)) return null;
      const rowType = state.schema.nodes.imageRow;
      const cellType = state.schema.nodes.rowImage;
      if (!rowType || !cellType) return null;

      // ── 1-bosqich: paragraf → qator ────────────────────────────────────
      // Faqat shuni qilamiz: o'zgarish bo'lsa ProseMirror appendTransaction'ni
      // qaytadan chaqiradi va 2-bosqich toza hujjatda, tiniq pozitsiyalar
      // bilan ishlaydi.
      const conv = state.tr;
      let converted = false;
      state.doc.descendants((node, pos, parent, index) => {
        if (node.type.name !== "paragraph") return true;
        if (node.childCount === 0 || !parent) return false;
        let onlyImages = true;
        node.forEach((c) => {
          if (c.type.name !== "image") onlyImages = false;
        });
        if (!onlyImages) return false;
        // Sxema ruxsat bermasa (masalan ro'yxat elementining birinchi bolasi)
        // tegmaymiz — aks holda hujjat JIMGINA yaroqsiz bo'lib qoladi.
        if (!parent.canReplaceWith(index, index + 1, rowType)) return false;

        const cells: PMNode[] = [];
        node.forEach((im) =>
          cells.push(
            cellType.create({
              src: im.attrs.src ?? null,
              alt: im.attrs.alt ?? null,
              share: 1,
            }),
          ),
        );
        conv.replaceWith(
          conv.mapping.map(pos),
          conv.mapping.map(pos + node.nodeSize),
          rowType.create(
            { align: toRowAlign(node.attrs.textAlign), float: "none", width: null },
            cells,
          ),
        );
        converted = true;
        return false;
      });
      if (converted) return conv;

      // ── 2-bosqich: qatorlarni tozalash ─────────────────────────────────
      const rows: { pos: number; node: PMNode }[] = [];
      state.doc.descendants((n, p) => {
        if (n.type.name !== "imageRow") return true;
        rows.push({ pos: p, node: n });
        return false;
      });
      if (rows.length === 0) return null;

      const tr = state.tr;
      let changed = false;
      // TESKARI tartibda — oldingi pozitsiyalar siljimaydi, mapping kerak emas.
      for (let i = rows.length - 1; i >= 0; i--) {
        const { pos, node } = rows[i];

        if (node.childCount === 0) {
          tr.delete(pos, pos + node.nodeSize);
          changed = true;
          continue;
        }

        if (node.childCount > MAX_ROW_IMAGES) {
          const keep: PMNode[] = [];
          const extra: PMNode[] = [];
          node.forEach((c, _offset, idx) =>
            (idx < MAX_ROW_IMAGES ? keep : extra).push(c),
          );
          tr.replaceWith(pos, pos + node.nodeSize, [
            rowType.create(node.attrs, keep),
            rowType.create(node.attrs, extra),
          ]);
          changed = true;
          continue;
        }

        let min = Infinity;
        node.forEach((c) => {
          min = Math.min(min, toShare(c.attrs.share));
        });
        if (min > 0 && min < 1) {
          // Barcha ulushni bir xil koeffitsiyentga ko'paytiramiz — NISBAT
          // o'zgarmaydi, faqat eng kichigi 1 ga keladi.
          const k = 1 / min;
          let off = pos + 1;
          node.forEach((c) => {
            tr.setNodeAttribute(off, "share", round2(toShare(c.attrs.share) * k));
            off += c.nodeSize;
          });
          changed = true;
        }
      }
      return changed ? tr : null;
    },
  });
}

/** Qatordagi bitta rasm — atom blok. */
export const RowImage = Node.create({
  name: "rowImage",
  atom: true,
  draggable: true,
  selectable: true,
  // group ATAYLAB yo'q: faqat `imageRow` ichida yashaydi.

  addAttributes() {
    return {
      src: {
        default: null,
        parseHTML: (el: HTMLElement) =>
          el.querySelector("img")?.getAttribute("src") ?? null,
        renderHTML: () => ({}),
      },
      alt: {
        default: null,
        parseHTML: (el: HTMLElement) =>
          el.querySelector("img")?.getAttribute("alt") ?? null,
        renderHTML: () => ({}),
      },
      /** Qatordagi nisbiy ulush (flex-grow). */
      share: {
        default: 1,
        parseHTML: (el: HTMLElement) => toShare(el.getAttribute("data-share")),
        renderHTML: () => ({}),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'figure[data-type="row-image"]' }];
  },

  renderHTML({ node, HTMLAttributes }) {
    const share = toShare(node.attrs.share);
    return [
      "figure",
      mergeAttributes(HTMLAttributes, {
        class: "rt-cell",
        "data-type": "row-image",
        "data-share": String(share),
        style: `--share: ${share}`,
      }),
      ["img", { src: (node.attrs.src as string) || "", alt: (node.attrs.alt as string) || "" }],
    ];
  },

  addNodeView() {
    return ({ node, editor, getPos }) => {
      let current = node;

      const dom = document.createElement("figure");
      dom.className = "rt-cell";
      dom.setAttribute("data-type", "row-image");

      const img = document.createElement("img");
      img.draggable = false;
      dom.appendChild(img);

      // Qator paneli — CSS uni faqat BIRINCHI katakda ko'rsatadi, shuning uchun
      // bu yerda indeksni bilish shart emas. Tugmalarning "faol" holati ham
      // toza CSS: `.rt-row[data-align="center"] .rt-b-align-center { ... }`.
      const bar = buildBar();
      dom.appendChild(bar);

      // Panel ko'rinishidan oldin joyini aniqlaymiz: qator hujjatning eng
      // boshida yoki yopishqoq toolbar ostida bo'lsa — panel pastga o'tadi.
      dom.addEventListener("mouseenter", () =>
        placeFloatingBar(bar, dom.parentElement ?? dom),
      );

      // Har katakning O'ZIDA o'chirish tugmasi: panel faqat birinchi katakda
      // turgani uchun undagi savat butun QATORNI o'chiradi, bu esa AYNAN shu
      // rasmni. Ikkalasi bir-biri bilan aralashib ketmasligi uchun alohida.
      const del = makeBtn("rt-cell-del", "Bu rasmni o'chirish", CLOSE_ICON, removeCell);
      dom.appendChild(del);

      const split = document.createElement("span");
      split.className = "rt-split";
      split.title = "Nisbatni o'zgartirish — ushlab suring";
      split.addEventListener("mousedown", startSplit);
      dom.appendChild(split);

      // Kenglik ushlagichlari IKKALA tomonda. Qaysi biri ko'rinishini CSS hal
      // qiladi: joylashuv qotirgan chetni sudrab bo'lmaydi (o'ngga tekislangan
      // qatorning o'ng cheti ustunga taqalgan — u qimirlamaydi), shuning uchun
      // faqat SILJIY OLADIGAN tomondagi ushlagich chiqadi.
      (["left", "right"] as const).forEach((side) => {
        const edge = document.createElement("span");
        edge.className = side === "left" ? "rt-edge-left" : "rt-edge";
        edge.title = "Qator kengligi — ushlab suring (ikki marta bosilsa tabiiy o'lcham)";
        edge.addEventListener("mousedown", (e) => startRowResize(e, side));
        edge.addEventListener("dblclick", (e) => {
          e.preventDefault();
          e.stopPropagation();
          setRowAttr("width", null);
        });
        dom.appendChild(edge);
      });

      sync(current);

      function sync(n: PMNode) {
        img.src = (n.attrs.src as string) || "";
        img.alt = (n.attrs.alt as string) || "";
        dom.style.setProperty("--share", String(toShare(n.attrs.share)));
      }

      /**
       * Joriy katak haqidagi TIRIK ma'lumot. `getPos()` faqat imperativ
       * hodisalarda (mousedown/click) chaqiriladi — o'sha yerda u kafolatlangan
       * holda yangi. Har tranzaksiyada `doc.resolve()` chaqirish ESKI usul edi:
       * u eskirgan pozitsiyada `RangeError` berardi.
       */
      function rowInfo() {
        const pos = typeof getPos === "function" ? getPos() : undefined;
        if (typeof pos !== "number") return null;
        const { doc } = editor.state;
        if (pos < 0 || pos >= doc.content.size) return null;
        const $pos = doc.resolve(pos);
        if ($pos.depth < 1) return null;
        const row = $pos.parent;
        if (row.type.name !== "imageRow") return null;
        return {
          row,
          rowPos: $pos.before($pos.depth),
          index: $pos.index(),
          cellPos: pos,
        };
      }

      function setRowAttr(name: string, value: unknown) {
        const info = rowInfo();
        if (!info) return;
        editor.view.dispatch(
          editor.view.state.tr.setNodeAttribute(info.rowPos, name, value),
        );
      }

      function removeCell() {
        const info = rowInfo();
        if (!info) return;
        const { state } = editor.view;
        const cell = state.doc.nodeAt(info.cellPos);
        if (!cell || cell.type.name !== "rowImage") return;
        // Oxirgi rasm bo'lsa qator bo'shab qoladi — uni housekeeping o'chiradi.
        editor.view.dispatch(
          state.tr.delete(info.cellPos, info.cellPos + cell.nodeSize),
        );
      }

      function removeRow() {
        const info = rowInfo();
        if (!info) return;
        const { state } = editor.view;
        const node = state.doc.nodeAt(info.rowPos);
        if (!node || node.type.name !== "imageRow") return;
        editor.view.dispatch(state.tr.delete(info.rowPos, info.rowPos + node.nodeSize));
      }

      function cellElements(): HTMLElement[] {
        const parent = dom.parentElement;
        if (!parent) return [];
        return Array.from(parent.children).filter(
          (el): el is HTMLElement =>
            el instanceof HTMLElement && el.dataset.type === "row-image",
        );
      }

      /** Matn ustunining SOF kengligi (padding'siz) — foizlar shunga nisbatan. */
      function columnWidth(): number {
        const host = editor.view.dom as HTMLElement;
        const cs = getComputedStyle(host);
        return (
          host.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight)
        );
      }

      /**
       * Kataklarning HOZIRGI piksel kengligidan normalizatsiyalangan ulush
       * (eng kichigi — 1). "Tabiiy o'lcham" rejimidan foizli rejimga
       * SAKRASHSIZ o'tish uchun kerak: auto rejimda kataklar `flex: 0 1 auto`
       * bo'lib `--share` ga umuman quloq solmaydi, shuning uchun o'tish paytida
       * ulushlarni ekrandagi haqiqiy kengliklardan olamiz.
       */
      function sharesFromPixels(widths: number[]): number[] {
        const valid = widths.filter((w) => w > 0);
        const base = valid.length > 0 ? Math.min(...valid) : 1;
        return widths.map((w) => clamp(round2((w > 0 ? w : base) / base), 0.05, 16));
      }

      /**
       * Ajratgichni sudrash — qatordagi barcha ulushni BITTA tranzaksiyada
       * yangilaydi. `setNodeAttribute` (AttrStep) node o'lchamini
       * o'zgartirmaydi, shuning uchun qo'shni pozitsiyalarni qayta xaritalash
       * (mapping) SHART EMAS.
       */
      function startSplit(e: MouseEvent) {
        e.preventDefault();
        e.stopPropagation();
        const info = rowInfo();
        const rowEl = dom.parentElement;
        if (!info || !rowEl) return;
        const { row, index } = info;
        if (index >= row.childCount - 1) return;

        const els = cellElements();
        if (els.length !== row.childCount) return;
        const pxs = els.map((el) => el.getBoundingClientRect().width);
        const w0 = pxs[index];
        const sumW = w0 + pxs[index + 1];
        const contW = columnWidth();
        if (!(sumW > 0) || !(contW > 0)) return;

        const wasAuto = toRowWidth(row.attrs.width) === null;
        const rowPct = clamp(
          Math.round((rowEl.getBoundingClientRect().width / contW) * 100),
          MIN_ROW_WIDTH,
          100,
        );

        const startX = e.clientX;
        let shares = sharesFromPixels(pxs);

        /** DOM'ni joriy holatga bo'yaydi. */
        const paint = () => {
          rowEl.setAttribute("data-fit", "scale");
          if (wasAuto) rowEl.style.setProperty("--rw", rowPct + "%");
          els.forEach((el, i) => el.style.setProperty("--share", String(shares[i])));
        };

        const onMove = (ev: MouseEvent) => {
          const leftW = clamp(
            w0 + (ev.clientX - startX),
            sumW * MIN_SPLIT,
            sumW * (1 - MIN_SPLIT),
          );
          const next = pxs.slice();
          next[index] = leftW;
          next[index + 1] = sumW - leftW;
          shares = sharesFromPixels(next);
          paint();
        };

        const onUp = () => {
          document.removeEventListener("mousemove", onMove);
          document.removeEventListener("mouseup", onUp);
          // DIQQAT: agar yangi qiymat eskisiga TENG bo'lsa ProseMirror node'ni
          // o'zgarmagan deb hisoblaydi va nodeView.update() ni CHAQIRMAYDI —
          // u holda DOM sudrash paytidagi oraliq qiymatda qotib qolardi.
          // Shuning uchun oxirgi holatni o'zimiz yozamiz.
          paint();
          const fresh = rowInfo();
          if (!fresh || fresh.row.childCount !== shares.length) return;
          const tr = editor.view.state.tr;
          if (wasAuto) tr.setNodeAttribute(fresh.rowPos, "width", rowPct);
          fresh.row.forEach((_c, offset, i) => {
            tr.setNodeAttribute(fresh.rowPos + 1 + offset, "share", shares[i]);
          });
          editor.view.dispatch(tr);
        };
        document.addEventListener("mousemove", onMove);
        document.addEventListener("mouseup", onUp);
      }

      /**
       * Butun qator kengligini o'zgartirish — FOIZDA saqlanadi.
       *
       * `side` — qaysi chetdan sudralyapti. Hisob QOTIRILGAN chetga nisbatan
       * yuritiladi: qotirilgan chet joyida qoladi, ikkinchisi kursor ortidan
       * yuradi. Shuning uchun ushlagichni TASHQARIGA sudrash har doim
       * kattalashtiradi — joylashuv qanday bo'lishidan qat'i nazar.
       */
      function startRowResize(e: MouseEvent, side: "left" | "right") {
        e.preventDefault();
        e.stopPropagation();
        const info = rowInfo();
        const rowEl = dom.parentElement;
        if (!info || !rowEl) return;
        const contW = columnWidth();
        if (!(contW > 0)) return;

        const els = cellElements();
        const wasAuto = toRowWidth(info.row.attrs.width) === null;
        const shares = sharesFromPixels(els.map((el) => el.getBoundingClientRect().width));

        // Qaysi chet QOTIRILGAN? Matn o'ralganda buni FLOAT tomoni belgilaydi
        // (tekislash margin'lari float qoidalari bilan bekor qilinadi), aks
        // holda tekislash: chapda — chap chet, o'ngda — o'ng chet, markazda —
        // markaz (u holda kenglik ikki barobar tez o'zgaradi).
        const rect = rowEl.getBoundingClientRect();
        const float = toRowFloat(info.row.attrs.float);
        const align = toRowAlign(info.row.attrs.align);
        const fixed = float !== "none" ? float : align;
        const anchorX =
          fixed === "left" ? rect.left : fixed === "right" ? rect.right : (rect.left + rect.right) / 2;
        const sign = side === "right" ? 1 : -1;
        const mult = fixed === "center" ? 2 : 1;

        let pct = clamp(Math.round((rect.width / contW) * 100), MIN_ROW_WIDTH, 100);
        const paint = () => {
          rowEl.setAttribute("data-fit", "scale");
          rowEl.style.setProperty("--rw", pct + "%");
          if (wasAuto) {
            els.forEach((el, i) => el.style.setProperty("--share", String(shares[i])));
          }
        };

        const onMove = (ev: MouseEvent) => {
          const w = clamp((ev.clientX - anchorX) * sign * mult, 40, contW);
          pct = clamp(Math.round((w / contW) * 100), MIN_ROW_WIDTH, 100);
          paint();
        };
        const onUp = () => {
          document.removeEventListener("mousemove", onMove);
          document.removeEventListener("mouseup", onUp);
          paint();
          const fresh = rowInfo();
          if (!fresh) return;
          const tr = editor.view.state.tr.setNodeAttribute(fresh.rowPos, "width", pct);
          if (wasAuto && fresh.row.childCount === shares.length) {
            fresh.row.forEach((_c, offset, i) => {
              tr.setNodeAttribute(fresh.rowPos + 1 + offset, "share", shares[i]);
            });
          }
          editor.view.dispatch(tr);
        };
        document.addEventListener("mousemove", onMove);
        document.addEventListener("mouseup", onUp);
      }

      function buildBar() {
        const bar = document.createElement("span");
        bar.className = "rt-row-bar";

        const alignGroup = document.createElement("span");
        alignGroup.className = "rt-bar-group rt-bar-align";
        ROW_ALIGNS.forEach((a) =>
          alignGroup.appendChild(
            makeBtn("rt-b-align-" + a, ALIGN_TITLE[a], ALIGN_ICON[a], () =>
              setRowAttr("align", a),
            ),
          ),
        );
        bar.appendChild(alignGroup);
        bar.appendChild(sepEl());

        const floatGroup = document.createElement("span");
        floatGroup.className = "rt-bar-group";
        ROW_FLOATS.forEach((f) =>
          floatGroup.appendChild(
            makeBtn("rt-b-float-" + f, FLOAT_TITLE[f], FLOAT_ICON[f], () =>
              setRowAttr("float", f),
            ),
          ),
        );
        bar.appendChild(floatGroup);
        bar.appendChild(sepEl());

        bar.appendChild(makeBtn("rt-b-remove", "Butun qatorni o'chirish", TRASH_ICON, removeRow));
        return bar;
      }

      return {
        dom,
        update(updated: PMNode) {
          if (updated.type.name !== current.type.name) return false;
          current = updated;
          sync(updated);
          return true;
        },
        selectNode() {
          dom.classList.add("selected");
          placeFloatingBar(bar, dom.parentElement ?? dom);
        },
        deselectNode() {
          dom.classList.remove("selected");
        },
        ignoreMutation() {
          return true;
        },
      };
    };
  },
});

/** Rasm qatori — flexbox konteyner. */
export const ImageRow = Node.create({
  name: "imageRow",
  group: "block",
  content: "rowImage*",
  defining: true,
  isolating: true,
  draggable: true,
  selectable: true,

  addAttributes() {
    return {
      align: {
        default: "center",
        parseHTML: (el: HTMLElement) => toRowAlign(el.getAttribute("data-align")),
        renderHTML: () => ({}),
      },
      float: {
        default: "none",
        parseHTML: (el: HTMLElement) => toRowFloat(el.getAttribute("data-float")),
        renderHTML: () => ({}),
      },
      /** Ustun kengligining foizi, yoki `null` — tabiiy o'lcham. */
      width: {
        default: null,
        parseHTML: (el: HTMLElement) => toRowWidth(el.getAttribute("data-width")),
        renderHTML: () => ({}),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="image-row"]' }];
  },

  renderHTML({ node, HTMLAttributes }) {
    const width = toRowWidth(node.attrs.width);
    const attrs: Record<string, string> = {
      class: "rt-row",
      "data-type": "image-row",
      "data-align": toRowAlign(node.attrs.align),
      "data-float": toRowFloat(node.attrs.float),
      "data-fit": width === null ? "auto" : "scale",
    };
    if (width !== null) {
      attrs["data-width"] = String(width);
      attrs.style = `--rw: ${width}%`;
    }
    return ["div", mergeAttributes(HTMLAttributes, attrs), 0];
  },

  addNodeView() {
    return ({ node }) => {
      const dom = document.createElement("div");
      applyRowAttrs(dom, node.attrs);
      return {
        dom,
        // contentDOM === dom: `.rt-row` `.tiptap` ning BEVOSITA bolasi bo'lib
        // qoladi — DragHandle ning `findClosestTopLevelBlock` i shuni talab qiladi.
        contentDOM: dom,
        update(updated: PMNode) {
          if (updated.type.name !== "imageRow") return false;
          applyRowAttrs(dom, updated.attrs);
          return true;
        },
        // Sudrash paytida `--rw` va `data-fit` ni O'ZIMIZ yozamiz — ProseMirror
        // bu atribut o'zgarishini hujjat o'zgarishi deb o'qib yubormasin.
        // (Bola node'lar o'zgarishi — childList — odatdagidek ishlanadi.)
        ignoreMutation(m: ViewMutationRecord) {
          return m.type === "attributes";
        },
      };
    };
  },

  addCommands() {
    return {
      insertImageRow:
        (srcs: string[]) =>
        ({ state, tr, dispatch }) => {
          const rowType = state.schema.nodes.imageRow;
          const cellType = state.schema.nodes.rowImage;
          const list = (srcs ?? [])
            .filter((s) => typeof s === "string" && s.length > 0)
            .slice(0, MAX_ROW_IMAGES);
          if (!rowType || !cellType || list.length === 0) return false;
          if (dispatch) {
            const cells = list.map((src) => cellType.create({ src, alt: null, share: 1 }));
            const sel = state.selection;
            // NodeSelection'da $from.depth 0 bo'lishi mumkin — after(1) RangeError beradi
            const at = sel.$from.depth > 0 ? sel.$from.after(1) : sel.to;
            tr.insert(at, rowType.create({ align: "center", float: "none", width: null }, cells));
            tr.setSelection(NodeSelection.create(tr.doc, at + 1));
            dispatch(tr.scrollIntoView());
          }
          return true;
        },

      addImageToRow:
        (src: string) =>
        ({ state, tr, dispatch }) => {
          const cellType = state.schema.nodes.rowImage;
          const info = findImageRow(state);
          if (!cellType || !src || !info) return false;
          if (info.node.childCount >= MAX_ROW_IMAGES) return false;
          if (dispatch) {
            // Qatorning yopilish tegidan oldin
            const at = info.pos + info.node.nodeSize - 1;
            tr.insert(at, cellType.create({ src, alt: null, share: 1 }));
            tr.setSelection(NodeSelection.create(tr.doc, at));
            dispatch(tr.scrollIntoView());
          }
          return true;
        },

      setImageRowAlign:
        (align: RowAlign) =>
        ({ state, tr, dispatch }) => {
          const info = findImageRow(state);
          if (!info) return false;
          if (dispatch) dispatch(tr.setNodeAttribute(info.pos, "align", toRowAlign(align)));
          return true;
        },

      setImageRowFloat:
        (float: RowFloat) =>
        ({ state, tr, dispatch }) => {
          const info = findImageRow(state);
          if (!info) return false;
          if (dispatch) dispatch(tr.setNodeAttribute(info.pos, "float", toRowFloat(float)));
          return true;
        },

      setImageRowWidth:
        (width: number | null) =>
        ({ state, tr, dispatch }) => {
          const info = findImageRow(state);
          if (!info) return false;
          if (dispatch) dispatch(tr.setNodeAttribute(info.pos, "width", toRowWidth(width)));
          return true;
        },
    };
  },

  addProseMirrorPlugins() {
    return [housekeeping()];
  },
});
