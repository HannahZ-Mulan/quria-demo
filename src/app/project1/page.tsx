"use client";

import { useState } from "react";
import { useI18n } from "@/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { ChatPanel } from "@/components/ChatPanel";
import { callFollowupAI } from "@/lib/ai-client";
import type { Mode, QuestionResult } from "@/lib/types";

export default function Project1Demo() {
  const { t } = useI18n();
  const [answer, setAnswer] = useState("");
  const [mode, setMode] = useState<Mode>("标准");
  const [device, setDevice] = useState<"PC" | "移动端">("PC");
  const [result, setResult] = useState<QuestionResult | null>(null);
  const [usedAI, setUsedAI] = useState(true);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<QuestionResult[]>([]);

  const generateQuestion = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const { data, usedAI: ai } = await callFollowupAI(answer, mode, device);
      setResult(data);
      setUsedAI(ai);
      setHistory((prev) => [data, ...prev].slice(0, 5));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-gray-50 p-6">
      {/* 语言切换 */}
      <div className="absolute top-4 end-4 z-50">
        <LanguageSwitcher />
      </div>

      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-gray-900">{t("project1_title")}</h1>
          <p className="text-gray-600">{t("project1_desc")}</p>
        </div>

        {/* 单轮 / 多轮 模式切换 */}
        <Tabs defaultValue="single" className="w-full">
          <TabsList className="w-full">
            <TabsTrigger value="single" className="flex-1">{t("single_turn_mode")}</TabsTrigger>
            <TabsTrigger value="chat" className="flex-1">{t("chat_mode")}</TabsTrigger>
          </TabsList>

          {/* ===== 单轮追问 ===== */}
          <TabsContent value="single">
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
                <span>{t("answer_count").replace("{n}", String(answer.length))}</span>
                <span>{t("suggested_limit").replace("{n}", String(
                  answer.length <= 20 ? 30 :
                  answer.length <= 100 ? 45 : 60
                ))}</span>
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

              <Button onClick={generateQuestion} disabled={loading} className="w-full">
                {loading ? t("ai_loading") : t("generate_question")}
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
                    <Badge variant="secondary">{t("mode_label").replace("{m}", mode)}</Badge>
                    <Badge variant="secondary">{t("device_label").replace("{d}", device)}</Badge>
                    <Badge variant="outline">{t("compression_rate").replace(
                      "{n}",
                      String(Math.round((1 - result.wordCount / result.originalLength) * 100))
                    )}</Badge>
                    {!usedAI && (
                      <Badge variant="outline" className="text-gray-500">{t("ai_local_mode")}</Badge>
                    )}
                  </div>
                </>
              ) : (
                <div className="text-center text-gray-400 py-12">
                  {t("generate_question_hint")}
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
                      <span>{item.wordCount}{t("char_unit")}</span>
                      <span>·</span>
                      <span>{item.strategy}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
          </TabsContent>

          {/* ===== 多轮对话 ===== */}
          <TabsContent value="chat">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t("chat_mode_title")}</CardTitle>
              </CardHeader>
              <CardContent>
                <ChatPanel />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

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