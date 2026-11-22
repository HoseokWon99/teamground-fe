import { describe, expect, it } from "vitest";
import { avatarColors } from "./avatar-colors";

describe("avatar text contrast", () => {
  it.each([
    ["#7664cf", "#fff"],
    ["#db956d", "#000"],
    ["#669d8b", "#000"],
    ["#7191ba", "#000"],
    ["#c28daa", "#000"],
    ["#000000", "#fff"],
    ["#ffffff", "#000"],
    ["#757575", "#fff"],
    ["#767676", "#000"],
  ])("uses readable text on %s", (background, color) => {
    expect(avatarColors(background)).toEqual({ background, color });
  });

  it.each([undefined, "", "invalid", "transparent"])("uses an opaque fallback for %s", (color) => {
    expect(avatarColors(color)).toEqual({ background: "#dde9df", color: "#000" });
  });
});
