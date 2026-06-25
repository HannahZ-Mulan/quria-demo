"use client";

import { useState } from "react";
import { useI18n } from "@/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { callDecomposeAI, callTrdAI } from "@/lib/ai-client";
import type { DecomposeResult } from "@/lib/types";

export default function Project3Demo() {
  const { t } = useI18n();
  const [rawRequirement, setRawRequirement] = useState("");
  const [result, setResult] = useState<DecomposeResult | null>(null);
  const [showTRD, setShowTRD] = useState(false);
  const [trdText, setTrdText] = useState("");
  const [loadingDecompose, setLoadingDecompose] = useState(false);
  const [loadingTrd, setLoadingTrd] = useState(false);
  const [usedAI, setUsedAI] = useState(true);

  const decompose = async () => {
    if (loadingDecompose) return;
    setLoadingDecompose(true);
    setShowTRD(false);
    setTrdText("");
    try {
      const { result: decomposed, usedAI: ai } = await callDecomposeAI(rawRequirement);
      setResult(decomposed);
      setUsedAI(ai);
    } finally {
      setLoadingDecompose(false);
    }
  };

  const generateTRD = async () => {
    if (!result || loadingTrd) return;
    setLoadingTrd(true);
    try {
      const { trd, usedAI: ai } = await callTrdAI(result);
      setTrdText(trd);
      setUsedAI(ai);
      setShowTRD(true);
    } finally {
      setLoadingTrd(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* 语言切换 */}
        <div className="absolute top-4 end-4 z-50">
          <LanguageSwitcher />
        </div>

        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-gray-900">{t("project3_title")}</h1>
          <p className="text-gray-600">{t("project3_desc")}</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t("raw_requirement")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder={t("requirement_placeholder")}
              value={rawRequirement}
              onChange={(e) => setRawRequirement(e.target.value)}
              className="min-h-[100px]"
            />
            <div className="flex gap-2">
              <Button onClick={decompose} disabled={loadingDecompose} className="flex-1">
                {loadingDecompose ? t("ai_loading") : t("smart_decompose")}
              </Button>
              {result && (
                <Button onClick={generateTRD} disabled={loadingTrd} variant="outline" className="flex-1">
                  {loadingTrd ? t("ai_loading") : t("generate_trd")}
                </Button>
              )}
            </div>
            {result && !usedAI && (
              <Badge variant="outline" className="text-gray-500">{t("ai_local_mode")}</Badge>
            )}
          </CardContent>
        </Card>

        {result && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t("decompose_result")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="p-3 bg-blue-50 rounded-lg">
                  <span className="text-xs text-blue-600 font-medium">{t("field_research_goal")}</span>
                  <p className="text-sm text-blue-900">{result.researchGoal}</p>
                </div>
                <div className="p-3 bg-green-50 rounded-lg">
                  <span className="text-xs text-green-600 font-medium">{t("field_target_audience")}</span>
                  <p className="text-sm text-green-900">{result.targetAudience}</p>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-600">{t("field_research_scene")}</span>
                  <Badge>{result.researchScene}</Badge>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-600">{t("field_research_type")}</span>
                  <Badge variant="secondary">{result.researchType}</Badge>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-600">{t("field_depth")}</span>
                  <Badge variant="secondary">{result.depth}</Badge>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-600">{t("field_sample_size")}</span>
                  <Badge variant={result.sampleSize.includes("建议") ? "outline" : "default"}>
                    {result.sampleSize}
                  </Badge>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-600">{t("field_duration")}</span>
                  <Badge variant={result.duration.includes("紧") ? "destructive" : "outline"}>
                    {result.duration}
                  </Badge>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-600">{t("field_strategy")}</span>
                  <span className="text-sm font-medium">{result.strategy}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t("quality_check")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {result.fuzzyMarks.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-yellow-700 mb-2">{t("fuzzy_marks")}：</p>
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
                    <p className="text-sm font-medium text-red-700 mb-2">{t("conflict_detection")}：</p>
                    <div className="space-y-2">
                      {result.conflicts.map((conflict, idx) => (
                        <div key={idx} className="p-2 bg-red-50 border border-red-200 rounded text-sm text-red-800">
                          {conflict}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {result.fuzzyMarks.length === 0 && result.conflicts.length === 0 && (
                  <div className="text-center text-green-600 py-4">
                    ✅ {t("no_conflict")}
                  </div>
                )}

                <div className="pt-2">
                  <p className="text-sm font-medium text-gray-700 mb-2">{t("deliverables")}：</p>
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

        {showTRD && trdText && (
          <Card className="border-2 border-blue-200">
            <CardHeader>
              <CardTitle className="text-lg text-blue-900">{t("trd_preview")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-gray-900 text-gray-100 p-4 rounded-lg font-mono text-sm whitespace-pre-wrap break-words">
                {trdText}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">{t("export_md")}</Button>
                <Button variant="outline" size="sm">{t("export_pdf")}</Button>
                <Button variant="outline" size="sm">{t("sync_jira")}</Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="bg-gray-100 border-0">
          <CardContent className="pt-6">
            <h3 className="font-semibold mb-2">{t("flow_title")}</h3>
            <div className="flex items-center justify-between text-sm text-gray-600">
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-500 text-white rounded-full flex items-center justify-center mx-auto mb-1">1</div>
                <p>{t("flow_step1")}</p>
              </div>
              <div className="flex-1 h-0.5 bg-gray-300 mx-2"></div>
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-500 text-white rounded-full flex items-center justify-center mx-auto mb-1">2</div>
                <p>{t("flow_step2")}</p>
              </div>
              <div className="flex-1 h-0.5 bg-gray-300 mx-2"></div>
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-500 text-white rounded-full flex items-center justify-center mx-auto mb-1">3</div>
                <p>{t("flow_step3")}</p>
              </div>
              <div className="flex-1 h-0.5 bg-gray-300 mx-2"></div>
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-500 text-white rounded-full flex items-center justify-center mx-auto mb-1">4</div>
                <p>{t("flow_step4")}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
