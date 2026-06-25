"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { LANGUAGES, useI18n } from "@/i18n";

/**
 * 紧凑的语言切换下拉菜单（可复用）。
 *
 * 按钮上显示一个地球图标 + 当前语言的名称；点开后列出所有支持的语言，
 * 当前选中的语言会打勾。点菜单外面、按 Esc、或选中某项后都会自动关闭。
 * 每个页面都能直接用这个组件。
 */
export function LanguageSwitcher() {
  const { lang, setLang } = useI18n();
  // 菜单是否展开
  const [open, setOpen] = useState(false);
  // 引用整个组件的根元素，用来判断"点的是不是菜单外面"
  const rootRef = useRef<HTMLDivElement>(null);

  // 当前语言的显示名称
  const activeLabel = LANGUAGES.find((l) => l.code === lang)?.label ?? lang;

  // 菜单展开时：监听点击和按键，点外面或按 Esc 就关闭菜单
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

  /**
   * 选中某个语言：设置当前语言并关闭菜单。
   */
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
