"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * TiltCard —— 方案 B「3D 透视跟随」
 *
 * 鼠标在卡片上移动时，卡片基于鼠标位置实时做 3D 透视倾斜
 * (rotateX / rotateY)，并抬起 translateZ；同时一道跟随光标的
 * 霓虹辉光定位到鼠标坐标。离开时回弹复位。
 *
 * - 仅在精确指针设备 (pointer: fine) 上启用跟随；触屏退化为静态卡片。
 * - 通过 React state + transform 变量驱动，无直接 DOM 操作，SSR 安全。
 */
export interface TiltCardProps extends React.ComponentProps<"div"> {
  /** 最大倾斜角度（度），默认 12 */
  maxTilt?: number;
  /** 抬起高度（px），默认 14 */
  lift?: number;
  /** 跟随鼠标的辉光颜色，默认青色 */
  glowColor?: string;
}

export function TiltCard({
  className,
  children,
  maxTilt = 12,
  lift = 14,
  glowColor = "rgba(34,211,238,0.28)",
  ...props
}: TiltCardProps) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = React.useState({ rx: 0, ry: 0, mx: 50, my: 50, active: false });

  const handleMove = React.useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const el = ref.current;
      if (!el) return;
      // 仅精确指针（鼠标）启用 3D 跟随，触屏笔触保持静态
      if (e.pointerType !== "mouse") return;

      const rect = el.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width; // 0~1
      const py = (e.clientY - rect.top) / rect.height; // 0~1
      const rx = (0.5 - py) * maxTilt * 2; // 上下 → rotateX
      const ry = (px - 0.5) * maxTilt * 2; // 左右 → rotateY
      setTilt({ rx, ry, mx: px * 100, my: py * 100, active: true });
    },
    [maxTilt],
  );

  const handleLeave = React.useCallback(() => {
    setTilt((prev) => ({ ...prev, active: false }));
  }, []);

  const transform = tilt.active
    ? `perspective(1000px) rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg) translateY(-${lift}px)`
    : "perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0px)";

  return (
    <div
      ref={ref}
      onPointerMove={handleMove}
      onPointerLeave={handleLeave}
      className={cn(
        "group/tilt relative transform-gpu will-change-transform",
        "rounded-4xl transition-[transform,box-shadow] duration-200 ease-out",
        className,
      )}
      style={{
        transform,
        transitionTimingFunction: tilt.active
          ? "cubic-bezier(0.2, 0, 0.2, 1)"
          : "cubic-bezier(0.34, 1.56, 0.64, 1)",
        // CSS 变量供辉光层与霓虹边框使用
        ["--glow-x" as string]: `${tilt.mx}%`,
        ["--glow-y" as string]: `${tilt.my}%`,
        ["--glow-color" as string]: glowColor,
      }}
      {...props}
    >
      {/* 跟随光标的霓虹辉光层 */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-4xl opacity-0 transition-opacity duration-300 group-hover/tilt:opacity-100"
        style={{
          background:
            "radial-gradient(45% 45% at var(--glow-x) var(--glow-y), var(--glow-color), transparent 70%)",
        }}
      />
      {/* 渐变霓虹描边层（mask 合成 1px 边框） */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-4xl opacity-50 transition-opacity duration-300 group-hover/tilt:opacity-100"
        style={{
          padding: "1px",
          background: "linear-gradient(130deg, #22d3ee, #7c5cff, #ec4899)",
          WebkitMask:
            "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
          WebkitMaskComposite: "xor",
          maskComposite: "exclude",
        }}
      />
      <div className="relative z-10 h-full">{children}</div>
    </div>
  );
}
