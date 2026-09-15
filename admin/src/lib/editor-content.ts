/**
 * Maqola kontentini (Tiptap JSON) muharrir sxemasiga moslash.
 *
 * Bu modul ATAYLAB sof — React va Tiptap importlari yo'q, chunki vitest uni
 * node muhitida, brauzersiz ishga tushiradi (`vitest.config.ts`).
 *
 * NEGA KERAK
 * ----------
 * Rasm joylashuvi endi CSS siljishlari bilan emas, STRUKTURA bilan hal qilinadi:
 *
 *   imageRow  — blok node, ichida 1..4 ta `rowImage` (flexbox qator)
 *   rowImage  — atom blok: src, alt va `share` (flex-grow ulushi)
 *   image     — inline node, faqat MATN ICHIDAGI rasm uchun qoladi
 *
 * Eski maqolalarda rasm paragraf ichidagi inline node bo'lib, joylashuvi
 * `align`/`wrap`/`offset`/`offsetY` atributlarida saqlangan. Bu yerdagi
 * funksiyalar shu eski shaklni muharrirga berishdan OLDIN yangisiga o'giradi.
 * Ma'lumotlar bazasiga tegilmaydi — maqola qayta saqlanganda o'z-o'zidan yangi
 * shaklga o'tadi, shuning uchun sayt rendereri IKKALA shaklni ham tushunishi shart.
 */

export type RawNode = {
  type?: string;
  attrs?: Record<string, unknown>;
  content?: RawNode[];
  text?: string;
  marks?: unknown[];
};

export type Json = Record<string, unknown>;

/** Sayt matn ustuni: `max-w-3xl` (768px) minus `px-6` (2x24px). */
export const COLUMN_PX = 720;
/** Qatordagi rasmlar orasidagi bo'shliq — CSS dagi `--rt-gap` bilan bir xil. */
export const ROW_GAP_PX = 12;
/** Bitta qatordagi rasmlarning eng ko'p soni. */
export const MAX_ROW_IMAGES = 4;

export type RowAlign = "left" | "center" | "right";
export type RowFloat = "none" | "left" | "right";

export const ROW_ALIGNS: RowAlign[] = ["left", "center", "right"];
export const ROW_FLOATS: RowFloat[] = ["none", "left", "right"];

/** Ichida INLINE kontent turadigan node'lar. */
const TEXT_BLOCKS = ["paragraph", "heading"];
/** `imageRow` ni bevosita bola sifatida qabul qila oladigan node'lar. */
const ROW_PARENTS = ["doc", "blockquote"];

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/** Ikki kasr xonagacha yaxlitlash — JSON'da uzun o'nlik saqlanmasin. */
export function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function toRowAlign(value: unknown): RowAlign {
  return ROW_ALIGNS.includes(value as RowAlign) ? (value as RowAlign) : "center";
}

export function toRowFloat(value: unknown): RowFloat {
  return ROW_FLOATS.includes(value as RowFloat) ? (value as RowFloat) : "none";
}

/**
 * Qatordagi ulush (flex-grow). Eng kichigi 1 ga keltiriladi — `flex-grow`
 * yig'indisi 1 dan kichik bo'lsa flex konteyner qatorni TO'LIQ TO'LDIRMAYDI
 * va qator o'ng chetidan kesilgandek ko'rinadi.
 */
export function toShare(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? clamp(n, 0.05, 16) : 1;
}

/** Qator kengligi — ustun kengligining foizi, yoki `null` (tabiiy o'lcham). */
export function toRowWidth(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return clamp(Math.round(n), 10, 100);
}

/**
 * Eski `width` atributini pikselga keltiradi.
 * `"320px"`, `"45%"` (ustun kengligiga nisbatan) va birliksiz raqam qabul qilinadi.
 */
export function widthPx(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) && value > 0 ? value : null;
  if (typeof value !== "string") return null;
  const s = value.trim();
  let m = /^(\d+(?:\.\d+)?)\s*px$/i.exec(s);
  if (m) return Number(m[1]);
  m = /^(\d+(?:\.\d+)?)\s*%$/.exec(s);
  if (m) return (Number(m[1]) / 100) * COLUMN_PX;
  m = /^(\d+(?:\.\d+)?)$/.exec(s);
  if (m) return Number(m[1]);
  return null;
}

/** Faqat rasmlardan iborat (matnsiz) paragrafmi? */
export function isImageOnly(node: RawNode): boolean {
  return (
    Array.isArray(node.content) &&
    node.content.length > 0 &&
    node.content.every((c) => c?.type === "image")
  );
}

/**
 * Eski inline rasmlar to'plamini `imageRow` node'iga aylantiradi.
 *
 * O'LCHAM MATEMATIKASI
 *   share_i = w_i / min(w)                    — nisbat saqlanadi, eng kichigi 1
 *   width   = (sum(w) + (n-1)*gap) / 720 * 100 — ustun kengligining foizi
 *
 * Agar rasmlarning birortasida o'lcham ko'rsatilmagan bo'lsa `width: null`
 * qaytadi — bu "tabiiy o'lcham" rejimi (`data-fit="auto"`). Aks holda 300px
 * lik eski rasm 100% ga cho'zilib ketardi.
 */
export function toImageRow(images: RawNode[], textAlign?: unknown): RawNode {
  const ws = images.map((n) => widthPx(n.attrs?.width));
  const known = ws.length > 0 && ws.every((w): w is number => w !== null && w > 0);
  const nums = known ? (ws as number[]) : [];
  const base = known ? Math.min(...nums) : 1;

  const content: RawNode[] = images.map((n, i) => ({
    type: "rowImage",
    attrs: {
      src: typeof n.attrs?.src === "string" ? n.attrs.src : null,
      alt: typeof n.attrs?.alt === "string" ? n.attrs.alt : null,
      share: known ? clamp(round2(nums[i] / base), 1, 8) : 1,
    },
  }));

  const sum = known ? nums.reduce((a, b) => a + b, 0) : 0;
  const width = known
    ? clamp(
        Math.round(((sum + (images.length - 1) * ROW_GAP_PX) / COLUMN_PX) * 100),
        10,
        100,
      )
    : null;

  const first = images[0]?.attrs ?? {};
  const wrap = String(first.wrap ?? "none");
  // Matn o'ralishi faqat YOLG'IZ rasmda ma'noli
  const float: RowFloat =
    images.length === 1 && (wrap === "left" || wrap === "right") ? wrap : "none";

  return {
    type: "imageRow",
    attrs: {
      align: ROW_ALIGNS.includes(textAlign as RowAlign)
        ? (textAlign as RowAlign)
        : toRowAlign(first.align),
      float,
      width,
    },
    content,
  };
}

/**
 * Matn ichida qoladigan inline rasm. `wrap: "free"` rejimi olib tashlandi
 * (u `position: relative` edi — rasm oqimdan chiqmas, eski joyida bo'sh o'ra
 * qolar edi), surish atributlari ham endi ishlatilmaydi.
 */
function sanitizeInlineImage(node: RawNode): RawNode {
  const attrs = { ...(node.attrs ?? {}) };
  if (attrs.wrap !== "left" && attrs.wrap !== "right") attrs.wrap = "none";
  delete attrs.offset;
  delete attrs.offsetY;
  return { ...node, attrs };
}

/**
 * Qator qo'yib bo'lmaydigan joyda (ro'yxat elementi va h.k.) turgan yolg'iz
 * rasmni paragrafga o'raydi: rasm INLINE node, sxemaga to'g'ri kelmagan node'ni
 * ProseMirror JIMGINA TASHLAB YUBORADI — ya'ni rasm yo'qoladi.
 */
function wrapInlineImage(node: RawNode): RawNode {
  const align = String(node.attrs?.align ?? "center");
  const textAlign = ROW_ALIGNS.includes(align as RowAlign) ? align : null;
  return { type: "paragraph", attrs: { textAlign }, content: [sanitizeInlineImage(node)] };
}

function normalizeNode(node: RawNode): RawNode {
  if (!node || typeof node !== "object") return node;
  if (!Array.isArray(node.content)) {
    return node.type === "image" ? sanitizeInlineImage(node) : node;
  }

  const type = node.type ?? "";
  const canHostRow = ROW_PARENTS.includes(type);
  const isTextBlock = TEXT_BLOCKS.includes(type);
  const out: RawNode[] = [];

  for (const child of node.content) {
    const n = normalizeNode(child);
    if (canHostRow) {
      if (n?.type === "image") {
        out.push(toImageRow([n]));
      } else if (n?.type === "paragraph" && isImageOnly(n)) {
        out.push(toImageRow(n.content as RawNode[], n.attrs?.textAlign));
      } else {
        out.push(n);
      }
      continue;
    }
    // Qator qo'yib bo'lmaydigan joy: rasm hech bo'lmasa paragrafga o'ralsin
    if (!isTextBlock && n?.type === "image") {
      out.push(wrapInlineImage(n));
      continue;
    }
    out.push(n);
  }

  return { ...node, content: out };
}

/** Muharrirga berishdan oldin kontentni joriy sxemaga moslaydi. */
export function normalizeContent(json: Json | null | undefined): Json | null {
  if (!json || typeof json !== "object") return null;
  const doc = json as RawNode;
  if (doc.type !== "doc" || !Array.isArray(doc.content)) return json as Json;
  return normalizeNode(doc) as unknown as Json;
}
