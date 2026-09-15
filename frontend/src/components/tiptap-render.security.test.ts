import { describe, it, expect } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { safeHref, safeImageSrc, TiptapRender } from "./tiptap-render";

/**
 * Maqola kontentidagi havola va rasm manbalari ishonchsiz bo'lishi mumkin.
 * Bu testlar XSS protokollarini (javascript:, data:, blob:) rad etishni kafolatlaydi.
 */

describe("safeHref", () => {
  it("http(s) va mailto ruxsat etiladi", () => {
    expect(safeHref("https://example.com")).toBe("https://example.com");
    expect(safeHref("http://example.com")).toBe("http://example.com");
    expect(safeHref("mailto:a@b.com")).toBe("mailto:a@b.com");
  });

  it("nisbiy va anchor havolalar ruxsat etiladi", () => {
    expect(safeHref("/maqola/x")).toBe("/maqola/x");
    expect(safeHref("#bob")).toBe("#bob");
    expect(safeHref("./rasm")).toBe("./rasm");
  });

  it("javascript:, data: va boshqalar # ga almashtiriladi", () => {
    expect(safeHref("javascript:alert(1)")).toBe("#");
    expect(safeHref("data:text/html,<script>")).toBe("#");
    expect(safeHref("vbscript:msgbox(1)")).toBe("#");
  });

  it("string bo'lmagan/bo'sh qiymat → #", () => {
    expect(safeHref(123)).toBe("#");
    expect(safeHref(null)).toBe("#");
    expect(safeHref(undefined)).toBe("#");
  });
});

describe("safeImageSrc", () => {
  it("http(s) ruxsat etiladi", () => {
    expect(safeImageSrc("https://cdn.x.com/a.png")).toBe(
      "https://cdn.x.com/a.png",
    );
  });

  it("nisbiy va protokol-relativ ruxsat etiladi", () => {
    expect(safeImageSrc("/uploads/covers/a.png")).toBe("/uploads/covers/a.png");
    expect(safeImageSrc("//cdn.x.com/a.png")).toBe("//cdn.x.com/a.png");
    expect(safeImageSrc("./a.png")).toBe("./a.png");
  });

  it("data: (SVG XSS), javascript:, blob: → null", () => {
    expect(safeImageSrc("data:image/svg+xml,<svg onload=alert(1)>")).toBeNull();
    expect(safeImageSrc("javascript:alert(1)")).toBeNull();
    expect(safeImageSrc("blob:http://x")).toBeNull();
  });

  it("bo'sh yoki string bo'lmagan → null", () => {
    expect(safeImageSrc("")).toBeNull();
    expect(safeImageSrc("   ")).toBeNull();
    expect(safeImageSrc(null)).toBeNull();
    expect(safeImageSrc(42)).toBeNull();
  });
});

/**
 * Rasm qatori (`imageRow`) — yangi node. Backend maqola kontentini SANITIZE
 * QILMAYDI (`@IsObject` xolos), shuning uchun bu renderer XSS'ga qarshi yagona
 * to'siq: `rowImage.src` ham `safeImageSrc` dan o'tishi SHART.
 */
describe("TiptapRender — imageRow", () => {
  function html(doc: unknown) {
    return renderToStaticMarkup(createElement(TiptapRender, { content: doc }));
  }

  function row(cells: Record<string, unknown>[], attrs: Record<string, unknown> = {}) {
    return {
      type: "doc",
      content: [
        {
          type: "imageRow",
          attrs: { align: "center", float: "none", width: null, ...attrs },
          content: cells.map((a) => ({ type: "rowImage", attrs: a })),
        },
      ],
    };
  }

  it("ikkita rasmni bitta flex qatorda chiqaradi", () => {
    const out = html(row([{ src: "/u/a.jpg", share: 2 }, { src: "/u/b.jpg", share: 1 }]));
    expect(out).toContain('class="rt-row"');
    expect(out.match(/class="rt-cell"/g)).toHaveLength(2);
    expect(out).toContain("--share:2");
    expect(out).toContain('data-fit="auto"');
  });

  it("qator kengligi foizda berilsa data-fit=scale bo'ladi", () => {
    const out = html(row([{ src: "/u/a.jpg", share: 1 }], { width: 60 }));
    expect(out).toContain('data-fit="scale"');
    expect(out).toContain("--rw:60%");
  });

  it("xavfli manba RENDER QILINMAYDI", () => {
    const out = html(
      row([
        { src: "javascript:alert(1)", share: 1 },
        { src: "data:image/svg+xml,<svg onload=alert(1)>", share: 1 },
        { src: "/u/ok.jpg", share: 1 },
      ]),
    );
    expect(out).not.toContain("javascript:");
    expect(out).not.toContain("data:image");
    expect(out).toContain("/u/ok.jpg");
    expect(out.match(/class="rt-cell"/g)).toHaveLength(1);
  });

  it("barcha manbalar xavfli bo'lsa qator umuman chiqmaydi", () => {
    const out = html(row([{ src: "javascript:alert(1)", share: 1 }]));
    expect(out).not.toContain("rt-row");
  });

  it("noaniq align/float/share qiymatlari standart holatga tushadi", () => {
    const out = html(
      row([{ src: "/u/a.jpg", share: "onerror" }], { align: "evil", float: "absolute" }),
    );
    expect(out).toContain('data-align="center"');
    expect(out).toContain('data-float="none"');
    expect(out).toContain("--share:1");
  });

  it("qatordan tashqaridagi rowImage render qilinmaydi", () => {
    const out = html({
      type: "doc",
      content: [{ type: "rowImage", attrs: { src: "/u/a.jpg", share: 1 } }],
    });
    expect(out).not.toContain("/u/a.jpg");
  });
});
