import { describe, it, expect, beforeEach } from "vitest";
import { useAuth } from "./auth";

/**
 * Admin auth store — access token FAQAT xotirada, user persist qilinadi.
 * Holat o'tishlari to'g'riligini tekshiramiz.
 */

const user = {
  id: "a1",
  username: "admin",
  email: "admin@maqolalar.uz",
  role: "ADMIN",
} as never;

describe("admin useAuth store", () => {
  beforeEach(() => {
    useAuth.setState({ user: null, accessToken: null, hydrated: false });
  });

  it("setAuth user va access tokenni o'rnatadi", () => {
    useAuth.getState().setAuth({ user, accessToken: "tok" });
    expect(useAuth.getState().user).toEqual(user);
    expect(useAuth.getState().accessToken).toBe("tok");
  });

  it("setAccessToken faqat tokenni yangilaydi (user tegilmaydi)", () => {
    useAuth.getState().setAuth({ user, accessToken: "tok" });
    useAuth.getState().setAccessToken("tok2");
    expect(useAuth.getState().accessToken).toBe("tok2");
    expect(useAuth.getState().user).toEqual(user);
  });

  it("logout user va tokenni tozalaydi", () => {
    useAuth.getState().setAuth({ user, accessToken: "tok" });
    useAuth.getState().logout();
    expect(useAuth.getState().user).toBeNull();
    expect(useAuth.getState().accessToken).toBeNull();
  });

  it("setHydrated bootstrap bayrog'ini o'rnatadi", () => {
    useAuth.getState().setHydrated(true);
    expect(useAuth.getState().hydrated).toBe(true);
  });
});
