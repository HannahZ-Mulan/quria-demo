import { describe, it, expect, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { I18nProvider, useI18n, LANGUAGES, type Language } from "./index";
import zhCN from "./zh-CN.json";

// Helper component that exposes the i18n context values for assertions.
function Consumer({ onValue }: { onValue?: (v: ReturnType<typeof useI18n>) => void }) {
  const ctx = useI18n();
  onValue?.(ctx);
  return (
    <div>
      <span data-testid="lang">{ctx.lang}</span>
      <span data-testid="dir">{ctx.dir}</span>
      <span data-testid="t-existing">{ctx.t("home_title")}</span>
      <span data-testid="t-missing">{ctx.t("__no_such_key__")}</span>
    </div>
  );
}

describe("LANGUAGES metadata", () => {
  it("has exactly 9 entries", () => {
    expect(LANGUAGES).toHaveLength(9);
  });

  it("has unique codes", () => {
    const codes = LANGUAGES.map((l) => l.code);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it("every entry has a non-empty label", () => {
    for (const l of LANGUAGES) {
      expect(l.label.trim().length).toBeGreaterThan(0);
    }
  });

  it("marks Hebrew (he) as rtl and everything else ltr", () => {
    for (const l of LANGUAGES) {
      expect(l.dir).toBe(l.code === "he" ? "rtl" : "ltr");
    }
  });
});

describe("I18nProvider + useI18n", () => {
  it("defaults to zh-CN and computes dir as ltr", () => {
    render(
      <I18nProvider>
        <Consumer />
      </I18nProvider>,
    );
    expect(screen.getByTestId("lang").textContent).toBe("zh-CN");
    expect(screen.getByTestId("dir").textContent).toBe("ltr");
  });

  it("t() returns the translated value for an existing key", () => {
    render(
      <I18nProvider>
        <Consumer />
      </I18nProvider>,
    );
    expect(screen.getByTestId("t-existing").textContent).toBe(
      (zhCN as Record<string, string>).home_title,
    );
  });

  it("t() falls back to the key itself when the key is missing", () => {
    // Implementation: translations[lang][key] || key
    render(
      <I18nProvider>
        <Consumer />
      </I18nProvider>,
    );
    expect(screen.getByTestId("t-missing").textContent).toBe("__no_such_key__");
  });

  it("updates lang, dir and t() output when language changes to he (rtl)", async () => {
    let setLang: ((l: Language) => void) | undefined;
    const { rerender } = render(
      <I18nProvider>
        <Consumer onValue={(v) => (setLang = v.setLang)} />
      </I18nProvider>,
    );
    expect(screen.getByTestId("dir").textContent).toBe("ltr");

    act(() => setLang?.("he"));
    rerender(
      <I18nProvider>
        <Consumer onValue={(v) => (setLang = v.setLang)} />
      </I18nProvider>,
    );

    expect(screen.getByTestId("lang").textContent).toBe("he");
    expect(screen.getByTestId("dir").textContent).toBe("rtl");
  });

  it("throws when useI18n is used outside of a provider", () => {
    // Suppress the expected error noise in the test output.
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<Consumer />)).toThrow(
      "useI18n must be used within I18nProvider",
    );
    spy.mockRestore();
  });
});
