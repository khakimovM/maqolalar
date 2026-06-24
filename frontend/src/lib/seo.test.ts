import { describe, it, expect } from "vitest";
import { absUrl } from "./seo";

/** absUrl() — OG/Twitter rasm yo'llarini absolyut URL'ga aylantiradi. */
describe("absUrl", () => {
  it("null/undefined/bo'sh → undefined", () => {
    expect(absUrl(null)).toBeUndefined();
    expect(absUrl(undefined)).toBeUndefined();
    expect(absUrl("")).toBeUndefined();
  });

  it("to'liq http(s) URL o'zgarmaydi", () => {
    expect(absUrl("https://x.com/a.png")).toBe("https://x.com/a.png");
    expect(absUrl("http://x.com/a.png")).toBe("http://x.com/a.png");
  });

  it("nisbiy yo'l (/ bilan) API bazasiga ulanadi", () => {
    expect(absUrl("/uploads/a.png")?.endsWith("/uploads/a.png")).toBe(true);
  });

  it("boshida / bo'lmasa ham bitta / bilan ulaydi", () => {
    const r = absUrl("uploads/a.png");
    expect(r?.endsWith("/uploads/a.png")).toBe(true);
    expect(r?.includes("//uploads")).toBe(false);
  });
});
