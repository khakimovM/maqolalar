import { describe, it, expect } from "vitest";
import { cn } from "./utils";

/** cn() — clsx + tailwind-merge: shartli klasslar va ziddiyatlarni hal qiladi. */
describe("cn", () => {
  it("klasslarni birlashtiradi", () => {
    expect(cn("a", "b")).toBe("a b");
  });

  it("falsy qiymatlarni tashlab ketadi", () => {
    expect(cn("a", false, null, undefined, "c")).toBe("a c");
  });

  it("Tailwind ziddiyatida oxirgisi yutadi (twMerge)", () => {
    expect(cn("p-2", "p-4")).toBe("p-4");
  });

  it("shartli obyekt sintaksisi", () => {
    expect(cn("base", { active: true, hidden: false })).toBe("base active");
  });
});
