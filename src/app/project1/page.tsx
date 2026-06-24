"use client";

import { useState } from "react";
import { useI18n, Language } from "@/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Mode = "精简" | "标准" | "深度";

interface QuestionResult {
  question: string;
  wordCount: number;
  strategy: string;
  originalLength: number;
}

export default function Project1Demo() {
  const { t, lang, setLang } = useI18n();
  const [answer, setAnswer] = useState("");
  const [mode, setMode] = useState<Mode>("标准");
  const [device, setDevice] = useState<"PC" | "移动端">("PC");
  const [result, setResult] = useState<QuestionResult | null>(null);
  const [history, setHistory] = useState<QuestionResult[]>([]);

  const generateQuestion = () => {
    const answerLength = answer.trim().length;
    let maxLength: number;
    
    if (answerLength <= 20) maxLength = 30;
    else if (answerLength <= 100) maxLength = 45;
    else maxLength = 60;
    
    if (device === "移动端") maxLength = Math.floor(maxLength * 0.75);
    if (mode === "精简") maxLength = Math.floor(maxLength * 0.7);
    if (mode === "深度") maxLength = Math.floor(maxLength * 1.3);

    const lowerAnswer = answer.toLowerCase();
    
    let baseQuestion: string;
    let matchedStrategy = "关键词匹配";
    
    if (lowerAnswer.includes("价格") || lowerAnswer.includes("贵") || lowerAnswer.includes("便宜") || lowerAnswer.includes("钱")) {
      baseQuestion = "您提到价格因素，能具体说说您心目中的合理价位是多少吗？";
    } else if (lowerAnswer.includes("方便") || lowerAnswer.includes("麻烦") || lowerAnswer.includes("难用") || lowerAnswer.includes("好用")) {
      baseQuestion = "您提到使用体验，能描述一下最让您感到不便的具体场景吗？";
    } else if (lowerAnswer.includes("喜欢") || lowerAnswer.includes("满意") || lowerAnswer.includes("好") || lowerAnswer.includes("不错")) {
      baseQuestion = "您对产品比较认可，能说说最打动您的那个功能或特点吗？";
    } else if (lowerAnswer.includes("不喜欢") || lowerAnswer.includes("失望") || lowerAnswer.includes("问题") || lowerAnswer.includes("缺点")) {
      baseQuestion = "您提到一些顾虑，如果产品能改善这一点，会改变您的想法吗？";
    } else if (lowerAnswer.includes("品牌") || lowerAnswer.includes("牌子") || lowerAnswer.includes("知名度")) {
      baseQuestion = "您提到品牌因素，品牌知名度对您的购买决策影响有多大？";
    } else if (lowerAnswer.includes("朋友") || lowerAnswer.includes("推荐") || lowerAnswer.includes("口碑") || lowerAnswer.includes("别人")) {
      baseQuestion = "您提到他人推荐，能说说您更信任哪类人的推荐吗？";
    } else if (answerLength <= 10) {
      baseQuestion = "您刚才的回答比较简洁，方便展开说说您的想法吗？";
      matchedStrategy = "短回答引导";
    } else {
      const strategies = [
        "您刚才提到的观点，能具体展开说说吗？",
        "这个经历中，最让您印象深刻的部分是什么？",
        "能举一个具体的例子来说明您的想法吗？",
        "您提到这一点，这和您平时的习惯有什么不同？",
        "如果让您用一个词形容当时的感受，会是什么？",
      ];
      baseQuestion = strategies[Math.floor(Math.random() * strategies.length)];
      matchedStrategy = "通用追问";
    }

    let finalQuestion = baseQuestion;
    let strategy = matchedStrategy;
    
    if (baseQuestion.length > maxLength) {
      if (mode === "精简") {
        finalQuestion = baseQuestion.slice(0, maxLength) + "...";
        strategy = matchedStrategy + " + 截断压缩";
      } else {
        finalQuestion = "先问：" + baseQuestion.slice(0, Math.floor(maxLength / 2)) + "？";
        strategy = matchedStrategy + " + 拆分追问";
      }
    }

    const result: QuestionResult = {
      question: finalQuestion,
      wordCount: finalQuestion.length,
      strategy,
      originalLength: baseQuestion.length,
    };

    setResult(result);
    setHistory(prev => [result, ...prev].slice(0, 5));
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* 语言切换 */}
      <div className="max-w-4xl mx-auto mb-4 flex justify-end gap-2">
        {["zh-CN", "zh-TW", "en", "yue", "ja"].map((l) => (
          <Button
            key={l}
            variant={lang === l ? "default" : "outline"}
            size="sm"
            onClick={() => setLang(l as Language)}
          >
            {l === "zh-CN" ? "简" : l === "zh-TW" ? "繁" : l === "en" ? "EN" : l === "yue" ? "粤" : "日"}
          </Button>
        ))}
      </div>
      
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-gray-900">项目 1：AI 追问长度动态优化</h1>
          <p className="text-gray-600">模拟 Quria AI 访谈中追问长度的智能控制机制</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">受访者回答模拟</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder="请输入模拟的受访者回答（例如：我觉得这个产品还行，就是价格有点贵）"
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                className="min-h-[120px]"
              />
              
              <div className="flex items-center justify-between text-sm text-gray-500">
                <span>回答字数：{answer.length} 字</span>
                <span>建议追问上限：{
                  answer.length <= 20 ? 30 : 
                  answer.length <= 100 ? 45 : 60
                } 字</span>
              </div>

              <Tabs value={mode} onValueChange={(v) => setMode(v as Mode)}>
                <TabsList className="w-full">
                  <TabsTrigger value="精简" className="flex-1">精简模式</TabsTrigger>
                  <TabsTrigger value="标准" className="flex-1">标准模式</TabsTrigger>
                  <TabsTrigger value="深度" className="flex-1">深度模式</TabsTrigger>
                </TabsList>
              </Tabs>

              <div className="flex gap-2">
                <Button 
                  variant={device === "PC" ? "default" : "outline"} 
                  onClick={() => setDevice("PC")}
                  className="flex-1"
                >
                  PC 端
                </Button>
                <Button 
                  variant={device === "移动端" ? "default" : "outline"} 
                  onClick={() => setDevice("移动端")}
                  className="flex-1"
                >
                  移动端
                </Button>
              </div>

              <Button onClick={generateQuestion} className="w-full">
                生成追问
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">AI 追问输出</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {result ? (
                <>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-lg font-medium text-blue-900">{result.question}</p>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2">
                    <div className="text-center p-3 bg-gray-100 rounded-lg">
                      <div className="text-2xl font-bold text-gray-900">{result.wordCount}</div>
                      <div className="text-xs text-gray-500">最终字数</div>
                    </div>
                    <div className="text-center p-3 bg-gray-100 rounded-lg">
                      <div className="text-2xl font-bold text-gray-900">{result.originalLength}</div>
                      <div className="text-xs text-gray-500">原始字数</div>
                    </div>
                    <div className="text-center p-3 bg-gray-100 rounded-lg">
                      <div className="text-lg font-bold text-gray-900">{result.strategy}</div>
                      <div className="text-xs text-gray-500">处理策略</div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary">模式：{mode}</Badge>
                    <Badge variant="secondary">设备：{device}</Badge>
                    <Badge variant="outline">压缩率：{Math.round((1 - result.wordCount / result.originalLength) * 100)}%</Badge>
                  </div>
                </>
              ) : (
                <div className="text-center text-gray-400 py-12">
                  点击「生成追问」查看效果
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {history.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">最近 5 次生成记录</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {history.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm truncate flex-1 mr-4">{item.question}</span>
                    <div className="flex gap-2 text-xs text-gray-500">
                      <span>{item.wordCount}字</span>
                      <span>·</span>
                      <span>{item.strategy}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="bg-gray-100 border-0">
          <CardContent className="pt-6">
            <h3 className="font-semibold mb-2">动态长度计算规则</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• 回答 ≤ 20 字 → 追问上限 30 字</li>
              <li>• 20 &lt; 回答 ≤ 100 字 → 追问上限 45 字</li>
              <li>• 回答 &gt; 100 字 → 追问上限 60 字</li>
              <li>• 移动端额外缩减 25%</li>
              <li>• 精简模式缩减 30%，深度模式放宽 30%</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}