import { describe, it, expect } from "vitest";
import zhCN from "./zh-CN.json";
import zhTW from "./zh-TW.json";
import en from "./en.json";
import ja from "./ja.json";
import itJson from "./it.json";
import fr from "./fr.json";
import he from "./he.json";
import pt from "./pt.json";
import es from "./es.json";

// zh-CN is the single source of truth; every other locale must expose the same
// set of keys so that switching languages never leaves UI showing a raw key.
const baseline = Object.keys(zhCN).sort();

const locales: Record<string, Record<string, string>> = {
  "zh-TW": zhTW,
  en,
  ja,
  it: itJson,
  fr,
  he,
  pt,
  es,
};

describe("translation files share the same key set as zh-CN", () => {
  it("baseline zh-CN has a non-empty key set", () => {
    expect(baseline.length).toBeGreaterThan(0);
  });

  for (const [code, dict] of Object.entries(locales)) {
    it(`${code} has exactly the same keys as zh-CN`, () => {
      const keys = Object.keys(dict).sort();
      const missing = baseline.filter((k) => !keys.includes(k));
      const extra = keys.filter((k) => !baseline.includes(k));
      expect(
        { missing, extra },
        `${code} diverges from zh-CN — missing: [${missing.join(", ")}], extra: [${extra.join(", ")}]`,
      ).toEqual({ missing: [], extra: [] });
    });
  }
});
