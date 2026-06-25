// 这是一个工具文件，只导出一个组合 CSS 类名的小函数 cn()。
// 它在所有 UI 组件里都会用到，用来把多个 Tailwind 类名合并、去重。

// clsx：把各种零散的类名（字符串、数组、对象）拼成一个字符串
import { clsx, type ClassValue } from "clsx"
// tailwind-merge：把冲突的 Tailwind 类名合并，保留最后一个（比如 px-2 和 px-4 只留 px-4）
import { twMerge } from "tailwind-merge"

/**
 * 把多个 CSS 类名合并成一个，并自动处理 Tailwind 类名冲突。
 *
 * 用法示例：`cn("px-2", condition && "px-4", "text-red-500")`
 * —— 如果 condition 为真，最终 `px-4` 会覆盖前面的 `px-2`。
 *
 * @param inputs - 一堆类名（可以是字符串、数组、或条件对象）
 * @returns 合并、去重后的一个类名字符串
 */
export function cn(...inputs: ClassValue[]) {
  // 先用 clsx 把零散的类名拼成字符串，再用 twMerge 解决 Tailwind 冲突
  return twMerge(clsx(inputs))
}
