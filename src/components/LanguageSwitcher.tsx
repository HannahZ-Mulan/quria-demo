"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { LANGUAGES, useI18n } from "@/i18n";

/**
 * Compact language dropdown.
 *
 * Trigger shows a globe icon + the active language's label; the menu lists all
 * supported languages with the active one marked. Closes on outside-click,
 * Escape, or selection. Reusable across every page.
 */
export function LanguageSwitcher() {
  const { lang, setLang } = useI18n();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const activeLabel = LANGUAGES.find((l) => l.code === lang)?.label ?? lang;

  // Close on outside click and Escape.
  useEffect(() => {
    if (!open) return;

    const onPointerDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const select = (code: typeof lang) => {
    setLang(code);
    setOpen(false);
  };

  return (
    <div ref={rootRef} className="relative">
      <Button
        variant="outline"
        size="sm"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <Languages />
        <span>{activeLabel}</span>
        <ChevronDown
          className={cn(
            "transition-transform",
            open && "rotate-180"
          )}
        />
      </Button>

      {open && (
        <div
          role="menu"
          aria-label="Select language"
          className="absolute end-0 mt-2 w-40 overflow-hidden rounded-xl border border-border bg-popover p-1 shadow-md z-50"
        >
          {LANGUAGES.map((l) => {
            const isActive = l.code === lang;
            return (
              <button
                key={l.code}
                type="button"
                role="menuitemradio"
                aria-checked={isActive}
                onClick={() => select(l.code)}
                className={cn(
                  "flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-start text-sm transition-colors",
                  "hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
                  isActive && "bg-muted font-medium"
                )}
              >
                <span>{l.label}</span>
                {isActive && <Check className="size-4 shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
