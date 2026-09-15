import { describe, it, expect } from "vitest";
import { normalizeContent, toImageRow, widthPx, type RawNode } from "./editor-content";

/**
 * Eski maqolalar muharrir ochilganda yangi sxemaga o'giriladi (DB'ga tegilmaydi).
 * Bu testlar o'sha o'girishning MATEMATIKASI va CHEGARALARINI qotiradi:
 * noto'g'ri joyda `imageRow` yasash hujjatni JIMGINA yaroqsiz qiladi.
 */

function img(attrs: Record<string, unknown>): RawNode {
  return { type: "image", attrs: { src: "/u/a.jpg", ...attrs } };
}

describe("widthPx", () => {
  it("px, foiz va birliksiz qiymatni tushunadi", () => {
    expect(widthPx("320px")).toBe(320);
    expect(widthPx("50%")).toBe(360); // ustun kengligi 720px
    expect(widthPx("240")).toBe(240);
    expect(widthPx(180)).toBe(180);
  });

  it("noaniq qiymatda null qaytaradi", () => {
    expect(widthPx("auto")).toBeNull();
    expect(widthPx("")).toBeNull();
    expect(widthPx(null)).toBeNull();
    expect(widthPx(0)).toBeNull();
  });
});

describe("toImageRow", () => {
  it("px o'lchamlarni nisbat (share) va qator foiziga o'giradi", () => {
    const row = toImageRow([img({ width: "320px" }), img({ width: "160px" })]);
    // share = w / min(w) → eng kichigi 1, nisbat saqlanadi
    expect(row.content?.map((c) => c.attrs?.share)).toEqual([2, 1]);
    // (320 + 160 + 12px bo'shliq) / 720 * 100 = 68.3 → 68
    expect(row.attrs?.width).toBe(68);
    expect(row.attrs?.float).toBe("none");
  });

  it("o'lchamsiz rasmlar tabiiy o'lchamda qoladi (width: null)", () => {
    const row = toImageRow([img({}), img({})]);
    expect(row.attrs?.width).toBeNull();
    expect(row.content?.map((c) => c.attrs?.share)).toEqual([1, 1]);
  });

  it("bitta rasmda matn o'ralishi saqlanadi, ko'pchilikda esa yo'q", () => {
    expect(toImageRow([img({ wrap: "left" })]).attrs?.float).toBe("left");
    expect(toImageRow([img({ wrap: "left" }), img({})]).attrs?.float).toBe("none");
  });

  it("paragraf tekislashi qator tekislashiga aylanadi", () => {
    expect(toImageRow([img({})], "right").attrs?.align).toBe("right");
    // "justify" qator uchun ma'nosiz — standart holatga tushadi
    expect(toImageRow([img({})], "justify").attrs?.align).toBe("center");
  });

  it("qator kengligi 10..100 oralig'ida cheklanadi", () => {
    expect(toImageRow([img({ width: "4000px" })]).attrs?.width).toBe(100);
    expect(toImageRow([img({ width: "20px" })]).attrs?.width).toBe(10);
  });
});

describe("normalizeContent", () => {
  it("faqat rasmdan iborat paragrafni qatorga aylantiradi", () => {
    const doc = normalizeContent({
      type: "doc",
      content: [
        { type: "paragraph", attrs: { textAlign: "right" }, content: [img({ width: "300px" })] },
      ],
    }) as unknown as RawNode;
    expect(doc.content?.[0]?.type).toBe("imageRow");
    expect(doc.content?.[0]?.attrs?.align).toBe("right");
    expect(doc.content?.[0]?.content?.[0]?.type).toBe("rowImage");
  });

  it("hujjat darajasidagi yolg'iz rasmni ham qatorga o'raydi", () => {
    const doc = normalizeContent({
      type: "doc",
      content: [img({ width: "300px" })],
    }) as unknown as RawNode;
    expect(doc.content?.[0]?.type).toBe("imageRow");
  });

  it("ikkita rasmli paragraf BITTA qatorga tushadi (yonma-yon)", () => {
    const doc = normalizeContent({
      type: "doc",
      content: [{ type: "paragraph", content: [img({}), img({})] }],
    }) as unknown as RawNode;
    expect(doc.content).toHaveLength(1);
    expect(doc.content?.[0]?.content).toHaveLength(2);
  });

  it("matn bilan aralash rasm INLINE bo'lib qoladi", () => {
    const doc = normalizeContent({
      type: "doc",
      content: [
        { type: "paragraph", content: [{ type: "text", text: "salom" }, img({})] },
      ],
    }) as unknown as RawNode;
    expect(doc.content?.[0]?.type).toBe("paragraph");
    expect(JSON.stringify(doc)).not.toContain("imageRow");
  });

  it("sitata ichidagi rasm ham qatorga aylanadi", () => {
    const doc = normalizeContent({
      type: "doc",
      content: [
        { type: "blockquote", content: [{ type: "paragraph", content: [img({})] }] },
      ],
    }) as unknown as RawNode;
    expect(doc.content?.[0]?.content?.[0]?.type).toBe("imageRow");
  });

  it("RO'YXAT elementidagi rasmga TEGMAYDI — sxema u yerda qatorni qabul qilmaydi", () => {
    const doc = normalizeContent({
      type: "doc",
      content: [
        {
          type: "bulletList",
          content: [
            {
              type: "listItem",
              content: [{ type: "paragraph", content: [img({})] }],
            },
          ],
        },
      ],
    }) as unknown as RawNode;
    expect(JSON.stringify(doc)).not.toContain("imageRow");
    expect(JSON.stringify(doc)).toContain('"image"');
  });

  it("olib tashlangan `free` rejimi va surish atributlari tozalanadi", () => {
    const doc = normalizeContent({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "matn" },
            img({ wrap: "free", offset: 42, offsetY: -80 }),
          ],
        },
      ],
    }) as unknown as RawNode;
    const image = doc.content?.[0]?.content?.[1];
    expect(image?.attrs?.wrap).toBe("none");
    expect(image?.attrs).not.toHaveProperty("offset");
    expect(image?.attrs).not.toHaveProperty("offsetY");
  });

  it("allaqachon yangi shakldagi kontentga tegmaydi (idempotent)", () => {
    const already = {
      type: "doc",
      content: [
        {
          type: "imageRow",
          attrs: { align: "center", float: "none", width: 60 },
          content: [{ type: "rowImage", attrs: { src: "/u/a.jpg", alt: null, share: 1 } }],
        },
      ],
    };
    expect(normalizeContent(already)).toEqual(already);
  });

  it("doc bo'lmagan yoki bo'sh kirishda yiqilmaydi", () => {
    expect(normalizeContent(null)).toBeNull();
    expect(normalizeContent(undefined)).toBeNull();
    expect(normalizeContent({ type: "paragraph" })).toEqual({ type: "paragraph" });
  });
});
