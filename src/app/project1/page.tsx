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
    
    // 动态长度上限（仅用于显示和参考，实际追问按模式预生成）
    let maxLength: number;
    if (answerLength <= 20) maxLength = 30;
    else if (answerLength <= 100) maxLength = 45;
    else maxLength = 60;
    
    if (device === "移动端") maxLength = Math.floor(maxLength * 0.75);

    const lowerAnswer = answer.toLowerCase();
    
    let shortQuestion: string;      // 精简模式
    let mediumQuestion: string;     // 标准模式
    let longQuestion: string;       // 深度模式
    let matchedStrategy = "关键词匹配";

    // ===== 价格相关 =====
    if (lowerAnswer.includes("价格") || lowerAnswer.includes("贵") || lowerAnswer.includes("便宜") || lowerAnswer.includes("钱")) {
      shortQuestion = "多少钱合适？";
      mediumQuestion = "您提到价格，能说说心目中的合理价位吗？";
      longQuestion = "您提到价格因素，能具体说说您心目中的合理价位是多少？这个价格和您的预期差距大吗？";
      matchedStrategy = "价格敏感度";
    }
    // ===== 体验相关 =====
    else if (lowerAnswer.includes("方便") || lowerAnswer.includes("麻烦") || lowerAnswer.includes("难用") || lowerAnswer.includes("好用")) {
      shortQuestion = "哪里不方便？";
      mediumQuestion = "您提到使用体验，能描述最让您不便的场景吗？";
      longQuestion = "您提到使用体验，能描述一下最让您感到不便的具体场景吗？当时是什么情况，您希望怎样改进？";
      matchedStrategy = "使用场景";
    }
    // ===== 正面评价 =====
    else if (lowerAnswer.includes("喜欢") || lowerAnswer.includes("满意") || lowerAnswer.includes("好") || lowerAnswer.includes("不错")) {
      shortQuestion = "最喜欢哪个点？";
      mediumQuestion = "您对产品比较认可，能说说最打动您的功能吗？";
      longQuestion = "您对产品比较认可，能说说最打动您的那个功能或特点吗？如果推荐给朋友，您会怎么描述？";
      matchedStrategy = "偏好挖掘";
    }
    // ===== 负面评价 =====
    else if (lowerAnswer.includes("不喜欢") || lowerAnswer.includes("失望") || lowerAnswer.includes("问题") || lowerAnswer.includes("缺点")) {
      shortQuestion = "主要问题是什么？";
      mediumQuestion = "您提到一些顾虑，如果产品能改善，会改变想法吗？";
      longQuestion = "您提到一些顾虑，能具体说说是什么让您不满意吗？如果产品能改善这一点，您愿意再给它一次机会吗？";
      matchedStrategy = "顾虑澄清";
    }
    // ===== 品牌相关 =====
    else if (lowerAnswer.includes("品牌") || lowerAnswer.includes("牌子") || lowerAnswer.includes("知名度")) {
      shortQuestion = "品牌重要吗？";
      mediumQuestion = "您提到品牌，品牌知名度对购买决策影响大吗？";
      longQuestion = "您提到品牌因素，品牌知名度对您的购买决策影响有多大？您会为了品牌多付费吗？";
      matchedStrategy = "品牌认知";
    }
    // ===== 推荐相关 =====
    else if (lowerAnswer.includes("朋友") || lowerAnswer.includes("推荐") || lowerAnswer.includes("口碑") || lowerAnswer.includes("别人")) {
      shortQuestion = "谁推荐的？";
      mediumQuestion = "您提到他人推荐，更信任哪类人的推荐？";
      longQuestion = "您提到他人推荐，能说说您更信任哪类人的推荐吗？他们的推荐具体影响了您哪些决策？";
      matchedStrategy = "社交影响";
    }
    // ===== 回答很短 =====
    else if (answerLength <= 10) {
      shortQuestion = "能简单说下吗？";
      mediumQuestion = "您刚才的回答比较简洁，方便展开说说想法吗？";
      longQuestion = "您刚才的回答比较简洁，能展开说说您的想法吗？是什么让您有这样的感受？";
      matchedStrategy = "短回答引导";
    }
    // ===== 默认通用 =====
    else {
      shortQuestion = "能具体说说吗？";
      mediumQuestion = "您刚才提到的观点，能具体展开说说吗？";
      longQuestion = "您刚才提到的观点，能具体展开说说吗？这个经历中，最让您印象深刻的部分是什么？";
      matchedStrategy = "通用追问";
    }

    // 根据模式选择追问
    let finalQuestion: string;
    let strategy: string;
    
    if (mode === "精简") {
      finalQuestion = shortQuestion;
      strategy = matchedStrategy + "（精简模式）";
    } else if (mode === "标准") {
      finalQuestion = mediumQuestion;
      strategy = matchedStrategy + "（标准模式）";
    } else {
      finalQuestion = longQuestion;
      strategy = matchedStrategy + "（深度模式）";
    }

    // 移动端额外缩减（如果追问仍超过移动端限制，回退到短版本）
    if (device === "移动端" && finalQuestion.length > maxLength) {
      finalQuestion = shortQuestion;
      strategy = matchedStrategy + "（移动端适配）";
    }

    const result: QuestionResult = {
      question: finalQuestion,
      wordCount: finalQuestion.length,
      strategy,
      originalLength: finalQuestion.length,
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
          <h1 className="text-3xl font-bold text-gray-900">{t("project1_title")}</h1>
          <p className="text-gray-600">{t("project1_desc")}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t("answer_input")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder={t("answer_placeholder")}
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
                  <TabsTrigger value="精简" className="flex-1">{t("mode_compact")}</TabsTrigger>
                  <TabsTrigger value="标准" className="flex-1">{t("mode_standard")}</TabsTrigger>
                  <TabsTrigger value="深度" className="flex-1">{t("mode_deep")}</TabsTrigger>
                </TabsList>
              </Tabs>

              <div className="flex gap-2">
                <Button 
                  variant={device === "PC" ? "default" : "outline"} 
                  onClick={() => setDevice("PC")}
                  className="flex-1"
                >
                  {t("device_pc")}
                </Button>
                <Button 
                  variant={device === "移动端" ? "default" : "outline"} 
                  onClick={() => setDevice("移动端")}
                  className="flex-1"
                >
                  {t("device_mobile")}
                </Button>
              </div>

              <Button onClick={generateQuestion} className="w-full">
                {t("generate_question")}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t("question_output")}</CardTitle>
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
                      <div className="text-xs text-gray-500">{t("final_length")}</div>
                    </div>
                    <div className="text-center p-3 bg-gray-100 rounded-lg">
                      <div className="text-2xl font-bold text-gray-900">{result.originalLength}</div>
                      <div className="text-xs text-gray-500">{t("original_length")}</div>
                    </div>
                    <div className="text-center p-3 bg-gray-100 rounded-lg">
                      <div className="text-lg font-bold text-gray-900">{result.strategy}</div>
                      <div className="text-xs text-gray-500">{t("strategy")}</div>
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
              <CardTitle className="text-lg">{t("recent_records")}</CardTitle>
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
            <h3 className="font-semibold mb-2">{t("rule_title")}</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• {t("rule_1")}</li>
              <li>• {t("rule_2")}</li>
              <li>• {t("rule_3")}</li>
              <li>• {t("rule_4")}</li>
              <li>• {t("rule_5")}</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}