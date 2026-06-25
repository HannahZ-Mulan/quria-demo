import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// ESM 模式下没有自带的 __dirname，这里手动算出当前文件所在目录
const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Vitest（单元测试工具）的配置。
 *
 * 主要设置：
 * - 启用 React 插件（让测试能解析 JSX/TSX）
 * - 把 "@" 别名指向 ./src（和项目里的导入路径一致）
 * - 测试环境用 jsdom（模拟浏览器环境）
 * - 开启全局 API（describe/it/expect 不用 import 也能直接用）
 * - 覆盖率统计：统计 src 下代码，排除测试文件和 UI 基础组件
 */
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/**/*.test.{ts,tsx}", "src/components/ui/**"],
    },
  },
});
