"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface DecomposeResult {
  researchType: string;
  depth: string;
  sampleSize: string;
  duration: string;
  strategy: string;
  deliverables: string[];
  conflicts: string[];
  fuzzyMarks: string[];
}

export default function Project3Demo() {
  const [rawRequirement, setRawRequirement] = useState("");
  const [result, setResult] = useState<DecomposeResult | null>(null);
  const [showTRD, setShowTRD] = useState(false);

  const decompose = () => {
    const text = rawRequirement.toLowerCase();
    
    // 模拟拆解逻辑
    const fuzzyWords = ["更深入", "越多越好", "尽快", "高端", "大概", "差不多"];
    const foundFuzzy = fuzzyWords.filter(w => text.includes(w));
    
    const result: DecomposeResult = {
      researchType: text.includes("多少") || text.includes("比例") ? "定量研究" : "定性研究",
      depth: text.includes("深入") || text.includes("动机") ? "L3 深度访谈（30-60分钟）" : 
             text.includes("了解") ? "L2 探索访谈（15-20分钟）" : "L1 筛查访谈（5-10分钟）",
      sampleSize: text.includes("大量") || text.includes("很多") ? "⚠️ 数量不明确，建议澄清" :
                  text.includes("100") ? "100人" : text.includes("50") ? "50人" : "建议 15-30 人",
      duration: text.includes("3天") || text.includes("一周") ? "⚠️ 时间紧张，建议调整" : "2-3 周",
      strategy: text.includes("年轻") || text.includes("妈妈") ? "情感探测 + 场景追问" : "标准追问策略",
      deliverables: ["访谈摘要报告", "关键洞察提炼", "用户画像卡片"],
      conflicts: [],
      fuzzyMarks: foundFuzzy,
    };

    // 冲突检测
    if (text.includes("100") && text.includes("深入") && text.includes("一周")) {
      result.conflicts.push("样本量大 + 深度访谈 + 时间短，不可行");
    }
    if (text.includes("高端") && !text.includes("收入") && !text.includes("消费")) {
      result.conflicts.push("「高端用户」定义不明确");
    }

    setResult(result);
    setShowTRD(false);
  };

  const generateTRD = () => {
    setShowTRD(true);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* 头部 */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-gray-900">项目 3：客户研究需求标准化拆解</h1>
          <p className="text-gray-600">将模糊客户需求自动翻译为可执行的技术方案</p>
        </div>

        {/* 输入区 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">客户原始需求</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder="请输入客户的原始需求（例如：我们想更深入地了解年轻妈妈群体的购买决策，样本越多越好，尽快交付）"
              value={rawRequirement}
              onChange={(e) => setRawRequirement(e.target.value)}
              className="min-h-[100px]"
            />
            <div className="flex gap-2">
              <Button onClick={decompose} className="flex-1">智能拆解</Button>
              {result && (
                <Button onClick={generateTRD} variant="outline" className="flex-1">
                  生成技术需求文档
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 拆解结果 */}
        {result && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">结构化拆解结果</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-600">研究类型</span>
                  <Badge>{result.researchType}</Badge>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-600">访谈深度</span>
                  <Badge variant="secondary">{result.depth}</Badge>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-600">建议样本量</span>
                  <Badge variant={result.sampleSize.includes("⚠️") ? "destructive" : "outline"}>
                    {result.sampleSize}
                  </Badge>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-600">预计周期</span>
                  <Badge variant={result.duration.includes("⚠️") ? "destructive" : "outline"}>
                    {result.duration}
                  </Badge>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-600">追问策略</span>
                  <span className="text-sm font-medium">{result.strategy}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">质量检查</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {result.fuzzyMarks.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-yellow-700 mb-2">模糊表述标记：</p>
                    <div className="flex flex-wrap gap-2">
                      {result.fuzzyMarks.map((mark, idx) => (
                        <Badge key={idx} variant="secondary" className="bg-yellow-100 text-yellow-800">
                          {mark}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                
                {result.conflicts.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-red-700 mb-2">冲突检测：</p>
                    <div className="space-y-2">
                      {result.conflicts.map((conflict, idx) => (
                        <div key={idx} className="p-2 bg-red-50 border border-red-200 rounded text-sm text-red-800">
                          ⚠️ {conflict}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {result.fuzzyMarks.length === 0 && result.conflicts.length === 0 && (
                  <div className="text-center text-green-600 py-4">
                    ✅ 需求清晰，无冲突
                  </div>
                )}

                <div className="pt-2">
                  <p className="text-sm font-medium text-gray-700 mb-2">交付物清单：</p>
                  <div className="flex flex-wrap gap-2">
                    {result.deliverables.map((item, idx) => (
                      <Badge key={idx} variant="outline">{item}</Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* TRD 预览 */}
        {showTRD && result && (
          <Card className="border-2 border-blue-200">
            <CardHeader>
              <CardTitle className="text-lg text-blue-900">技术需求文档（TRD）预览</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-gray-900 text-gray-100 p-4 rounded-lg font-mono text-sm space-y-2">
                <p className="text-green-400"># AI 模型配置</p>
                <p>追问深度模式: {result.depth.includes("L3") ? "深度" : result.depth.includes("L2") ? "标准" : "精简"}</p>
                <p>行业知识库: {rawRequirement.includes("妈妈") ? "母婴消费" : "通用"}</p>
                <p>情感探测: {result.strategy.includes("情感") ? "开启" : "关闭"}</p>
                <p>多轮记忆: 5轮</p>
                <br />
                <p className="text-green-400"># Prompt 模板</p>
                <p>系统Prompt: 你是一位专业的用户研究访谈员...</p>
                <p>追问策略: {result.strategy}</p>
                <br />
                <p className="text-green-400"># 数据标签体系</p>
                <p>情感标签、主题标签、行为标签、需求标签</p>
                <br />
                <p className="text-green-400"># 报告框架</p>
                <p>{result.deliverables.join(" + ")}</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">导出 Markdown</Button>
                <Button variant="outline" size="sm">导出 PDF</Button>
                <Button variant="outline" size="sm">同步到 Jira</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 流程说明 */}
        <Card className="bg-gray-100 border-0">
          <CardContent className="pt-6">
            <h3 className="font-semibold mb-2">需求拆解流程</h3>
            <div className="flex items-center justify-between text-sm text-gray-600">
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-500 text-white rounded-full flex items-center justify-center mx-auto mb-1">1</div>
                <p>录入原始需求</p>
              </div>
              <div className="flex-1 h-0.5 bg-gray-300 mx-2"></div>
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-500 text-white rounded-full flex items-center justify-center mx-auto mb-1">2</div>
                <p>智能拆解</p>
              </div>
              <div className="flex-1 h-0.5 bg-gray-300 mx-2"></div>
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-500 text-white rounded-full flex items-center justify-center mx-auto mb-1">3</div>
                <p>冲突检测</p>
              </div>
              <div className="flex-1 h-0.5 bg-gray-300 mx-2"></div>
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-500 text-white rounded-full flex items-center justify-center mx-auto mb-1">4</div>
                <p>生成 TRD</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
