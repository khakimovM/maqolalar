import { describe, it, expect, beforeEach } from "vitest";
import { useAuth } from "./auth";

/**
 * Auth store — access token FAQAT xotirada, user persist qilinadi.
 * Holat o'tishlari to'g'riligini tekshiramiz (login/refresh/logout).
 */

const user = {
  id: "u1",
  username: "aziz",
  email: "a@b.com",
  role: "USER",
} as never;

describe("useAuth store", () => {
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
    expect(useAuth.getState().hydrated).toBe(false);
    useAuth.getState().setHydrated(true);
    expect(useAuth.getState().hydrated).toBe(true);
  });
});
