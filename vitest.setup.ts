// 测试启动文件：在 Vitest 跑每个测试前先执行。
// 这里引入 jest-dom 的扩展断言，让测试里可以用 expect(x).toBeInTheDocument() 这类写法。
import "@testing-library/jest-dom/vitest";
