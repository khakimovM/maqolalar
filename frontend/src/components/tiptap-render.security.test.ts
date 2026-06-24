import { describe, it, expect } from "vitest";
import { safeHref, safeImageSrc } from "./tiptap-render";

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
