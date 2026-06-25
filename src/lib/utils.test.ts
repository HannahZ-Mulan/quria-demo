import { describe, it, expect } from "vitest";
import { cn } from "./utils";

describe("cn", () => {
  it("merges multiple class name strings", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  it("filters falsy values (supports clsx object/array forms)", () => {
    expect(cn("a", false, null, undefined, "", "b")).toBe("a b");
    expect(cn({ c: true, d: false })).toBe("c");
    expect(cn(["e", "f", 0, false])).toBe("e f");
  });

  it("dedupes conflicting tailwind classes via twMerge", () => {
    // later utility wins for the same property group
    expect(cn("px-2", "px-4")).toBe("px-4");
    expect(cn("text-red-500", "text-blue-500")).toBe("text-blue-500");
    // unrelated classes are preserved alongside the winner
    expect(cn("p-2", "px-4", "m-1")).toBe("p-2 px-4 m-1");
  });

  it("returns an empty string for no/falsy inputs", () => {
    expect(cn()).toBe("");
    expect(cn("", false, null)).toBe("");
  });

  it("keeps non-conflicting classes intact", () => {
    expect(cn("flex", "items-center", "gap-2")).toBe("flex items-center gap-2");
  });
});
