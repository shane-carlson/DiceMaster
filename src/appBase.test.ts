import { describe, expect, it } from "vitest";
import { APP_BASE, HOSTED_ON_RW1, withBase } from "./appBase";

describe("withBase", () => {
  it("leaves root-relative paths unchanged when the app is served at /", () => {
    expect(APP_BASE).toBe("");
    expect(HOSTED_ON_RW1).toBe(false);
    expect(withBase("/api/me")).toBe("/api/me");
    expect(withBase("/fonts/Oswald-Bold.ttf")).toBe("/fonts/Oswald-Bold.ttf");
    expect(withBase("https://example.com/x")).toBe("https://example.com/x");
  });
});
