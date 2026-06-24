import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="max-w-2xl w-full space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-gray-900">Quria 产品优化方案</h1>
          <p className="text-gray-600">为悦数洞察 AI 访谈系统设计的两个核心优化项目</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="text-xl text-blue-900">项目 1</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <h3 className="font-semibold text-lg">AI 追问长度动态优化</h3>
              <p className="text-sm text-gray-600">
                解决当前 AI 访谈中追问过长、受访者体验下降的问题。
                根据回答长度、设备类型、访谈模式动态控制追问字数。
              </p>
              <Link href="/project1">
                <Button className="w-full">查看演示</Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="text-xl text-green-900">项目 3</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <h3 className="font-semibold text-lg">客户需求标准化拆解</h3>
              <p className="text-sm text-gray-600">
                将模糊的客户需求自动翻译为可执行的技术方案。
                支持冲突检测、模糊标记、一键生成 TRD。
              </p>
              <Link href="/project3">
                <Button className="w-full">查看演示</Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        <div className="text-center text-sm text-gray-400">
          基于对 Quria 产品的实际体验设计 · 2026
        </div>
      </div>
    </div>
  );
}
