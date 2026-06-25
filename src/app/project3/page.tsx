"use client";

import { useState } from "react";
import { useI18n, Language } from "@/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

interface DecomposeResult {
  researchGoal: string;
  targetAudience: string;
  researchScene: string;
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
  const { t, lang, setLang } = useI18n();
  const [rawRequirement, setRawRequirement] = useState("");
  const [result, setResult] = useState<DecomposeResult | null>(null);
  const [showTRD, setShowTRD] = useState(false);

  const decompose = () => {
    const text = rawRequirement;
    const lowerText = text.toLowerCase();
    
    // ===== 1. 提取关键信息 =====
    
    // 研究目标
    const goalMatches = text.match(/(了解|研究|探索|测试|评估|分析|洞察|验证)(.{2,20})/);
    const researchGoal = goalMatches ? goalMatches[0] : "未明确";
    
    // 目标人群
    const ageMatches = text.match(/(\d{1,2}[-至到]\d{1,2}岁|\d{1,2}后|年轻|中年|老年)/);
    const genderMatches = text.match(/(男|女|男性|女性|男女|宝妈|爸爸|妈妈)/);
    const jobMatches = text.match(/(白领|学生|上班族|自由职业|高管|程序员|设计师|教师|医生|妈妈|家长|车主|玩家)/);
    const regionMatches = text.match(/(一线城市|二线城市|三四线|北京|上海|广州|深圳|成都|杭州|全国|华东|华南)/);
    
    const targetAudience = [
      ageMatches?.[0],
      genderMatches?.[0],
      jobMatches?.[0],
      regionMatches?.[0]
    ].filter(Boolean).join("、") || "未明确";
    
    // 研究场景
    let researchScene = "通用调研";
    if (lowerText.includes("产品") || lowerText.includes("功能") || lowerText.includes("体验")) {
      researchScene = "产品测试/体验研究";
    } else if (lowerText.includes("品牌") || lowerText.includes("知名度") || lowerText.includes("形象")) {
      researchScene = "品牌研究";
    } else if (lowerText.includes("用户") || lowerText.includes("人群") || lowerText.includes("画像")) {
      researchScene = "用户画像/人群洞察";
    } else if (lowerText.includes("竞品") || lowerText.includes("竞争") || lowerText.includes("对手")) {
      researchScene = "竞品分析";
    } else if (lowerText.includes("满意度") || lowerText.includes("nps") || lowerText.includes("推荐")) {
      researchScene = "满意度/NPS研究";
    } else if (lowerText.includes("购买") || lowerText.includes("决策") || lowerText.includes("消费")) {
      researchScene = "购买决策研究";
    }
    
    // 样本量提取
    const sampleMatch = text.match(/(\d+)\s*(个|人|份|组|样本)/);
    const sampleSizeRaw = sampleMatch ? sampleMatch[1] : 
                         (lowerText.includes("越多越好") || lowerText.includes("大量") || lowerText.includes("很多")) ? "模糊：大量" : 
                         (lowerText.includes("少量") || lowerText.includes("几个")) ? "模糊：少量" : "未指定";
    
    // 时间提取
    const timeMatch = text.match(/(\d+)\s*(天|周|月|工作日)/);
    const timeRaw = timeMatch ? timeMatch[0] : 
                   (lowerText.includes("尽快") || lowerText.includes("马上") || lowerText.includes("急")) ? "模糊：尽快" : "未指定";
    
    // ===== 2. 智能判定研究类型 =====
    
    let researchType: string;
    const hasQuantitative = lowerText.includes("多少") || lowerText.includes("比例") || lowerText.includes("占比") || 
                           lowerText.includes("满意度") || lowerText.includes("nps") || lowerText.includes("数据") ||
                           lowerText.includes("统计") || lowerText.includes("量化");
    const hasQualitative = lowerText.includes("为什么") || lowerText.includes("动机") || lowerText.includes("原因") ||
                          lowerText.includes("感受") || lowerText.includes("想法") || lowerText.includes("态度") ||
                          lowerText.includes("深入") || lowerText.includes("挖掘");
    
    if (hasQuantitative && hasQualitative) {
      researchType = "混合研究（定性+定量）";
    } else if (hasQuantitative) {
      researchType = "定量研究";
    } else if (hasQualitative) {
      researchType = "定性研究";
    } else {
      researchType = "建议定性研究（先探索）";
    }
    
    // ===== 3. 智能判定访谈深度 =====
    
    let depth: string;
    let recommendedDuration: string;
    
    if (lowerText.includes("深入") || lowerText.includes("挖掘") || lowerText.includes("动机") || 
        lowerText.includes("心理") || lowerText.includes("底层")) {
      depth = "L3 深度访谈";
      recommendedDuration = "45-60分钟/人";
    } else if (lowerText.includes("了解") || lowerText.includes("探索") || lowerText.includes("发现") ||
               lowerText.includes("需求")) {
      depth = "L2 探索访谈";
      recommendedDuration = "20-30分钟/人";
    } else {
      depth = "L1 快速筛查";
      recommendedDuration = "10-15分钟/人";
    }
    
    // ===== 4. 智能推荐样本量 =====
    
    let sampleSize: string;
    const numSample = parseInt(sampleSizeRaw);
    
    if (!isNaN(numSample)) {
      if (numSample <= 10) {
        sampleSize = `${numSample}人（适合深度个案）`;
      } else if (numSample <= 30) {
        sampleSize = `${numSample}人（适合定性研究）`;
      } else if (numSample <= 100) {
        sampleSize = `${numSample}人（适合定量小样本）`;
      } else {
        sampleSize = `${numSample}人（适合定量大样本）`;
      }
    } else {
      if (researchType.includes("定性")) {
        sampleSize = "建议 15-20 人（信息饱和原则）";
      } else if (researchType.includes("定量")) {
        sampleSize = "建议 100-300 人（统计显著性）";
      } else {
        sampleSize = "建议先定性 15-20 人，再定量 100+ 人";
      }
    }
    
    // ===== 5. 预计周期 =====
    
    let duration: string;
    const numTime = parseInt(timeRaw);
    
    if (!isNaN(numTime)) {
      if (numTime <= 3) {
        duration = `${numTime}天（极紧，建议缩减范围）`;
      } else if (numTime <= 7) {
        duration = `${numTime}天（较紧，建议只做单城市）`;
      } else if (numTime <= 14) {
        duration = `${numTime}天（合理，可执行）`;
      } else {
        duration = `${numTime}天（充裕，可做深度）`;
      }
    } else {
      if (researchType.includes("混合")) {
        duration = "建议 4-6 周（含定性和定量两阶段）";
      } else if (depth === "L3 深度访谈") {
        duration = "建议 3-4 周（含招募、执行、分析）";
      } else if (depth === "L2 探索访谈") {
        duration = "建议 2-3 周";
      } else {
        duration = "建议 1-2 周";
      }
    }
    
    // ===== 6. 追问策略 =====
    
    let strategy: string;
    if (researchScene.includes("产品")) {
      strategy = "场景还原 + 痛点挖掘 + 功能偏好探测";
    } else if (researchScene.includes("品牌")) {
      strategy = "品牌联想 + 情感映射 + 竞争对比";
    } else if (researchScene.includes("用户画像")) {
      strategy = "生活方式 + 消费行为 + 价值观探索";
    } else if (researchScene.includes("购买决策")) {
      strategy = "决策旅程 + 影响因素权重 + 障碍点识别";
    } else if (researchScene.includes("竞品")) {
      strategy = "对比使用 + 切换动机 + 忠诚度评估";
    } else {
      strategy = "开放式探索 + 关键事件 + 行为验证";
    }
    
    // ===== 7. 交付物 =====
    
    const deliverables = [
      "访谈纪要/原始语料",
      "核心洞察提炼",
    ];
    
    if (researchType.includes("定量")) {
      deliverables.push("数据统计报告");
      deliverables.push("交叉分析图表");
    }
    if (researchScene.includes("用户画像")) {
      deliverables.push("用户画像卡片");
      deliverables.push("典型用户旅程图");
    }
    if (researchScene.includes("产品")) {
      deliverables.push("功能优先级矩阵");
      deliverables.push("优化建议清单");
    }
    
    // ===== 8. 冲突检测 =====
    
    const conflicts: string[] = [];
    
    if (!isNaN(numSample) && !isNaN(numTime)) {
      if (numSample > 50 && depth === "L3 深度访谈" && numTime < 14) {
        conflicts.push("⚠️ 大样本量 + 深度访谈 + 短周期：建议缩减样本或延长时间");
      }
      if (numSample > 200 && numTime < 7) {
        conflicts.push("⚠️ 大样本量 + 极短周期：定量调研需要充足时间保证数据质量");
      }
    }
    
    if (targetAudience === "未明确") {
      conflicts.push("⚠️ 目标人群未明确：建议补充年龄、性别、职业等维度");
    }
    
    if (researchGoal === "未明确") {
      conflicts.push("⚠️ 研究目标不清晰：建议明确要回答什么业务问题");
    }
    
    // ===== 9. 模糊标记 =====
    
    const fuzzyWords = ["更深入", "越多越好", "尽快", "高端", "大概", "差不多", "尽量", "可能", "也许"];
    const foundFuzzy = fuzzyWords.filter(w => lowerText.includes(w));
    
    // ===== 10. 组装结果 =====
    
    const result: DecomposeResult = {
      researchGoal,
      targetAudience,
      researchScene,
      researchType,
      depth,
      sampleSize,
      duration,
      strategy,
      deliverables,
      conflicts,
      fuzzyMarks: foundFuzzy,
    };

    setResult(result);
    setShowTRD(false);
  };

  const generateTRD = () => {
    setShowTRD(true);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* 语言切换 */}
        <div className="flex justify-end gap-2">
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
              <Button onClick={decompose} className="flex-1">{t("smart_decompose")}</Button>
              {result && (
                <Button onClick={generateTRD} variant="outline" className="flex-1">
                  {t("generate_trd")}
                </Button>
              )}
            </div>
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
                  <span className="text-xs text-blue-600 font-medium">研究目标</span>
                  <p className="text-sm text-blue-900">{result.researchGoal}</p>
                </div>
                <div className="p-3 bg-green-50 rounded-lg">
                  <span className="text-xs text-green-600 font-medium">目标人群</span>
                  <p className="text-sm text-green-900">{result.targetAudience}</p>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-600">研究场景</span>
                  <Badge>{result.researchScene}</Badge>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-600">研究类型</span>
                  <Badge variant="secondary">{result.researchType}</Badge>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-600">访谈深度</span>
                  <Badge variant="secondary">{result.depth}</Badge>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-600">建议样本量</span>
                  <Badge variant={result.sampleSize.includes("建议") ? "outline" : "default"}>
                    {result.sampleSize}
                  </Badge>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-600">预计周期</span>
                  <Badge variant={result.duration.includes("紧") ? "destructive" : "outline"}>
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
                    ✅ 需求清晰，无冲突
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

        {showTRD && result && (
          <Card className="border-2 border-blue-200">
            <CardHeader>
              <CardTitle className="text-lg text-blue-900">{t("trd_preview")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-gray-900 text-gray-100 p-4 rounded-lg font-mono text-sm space-y-2">
                <p className="text-green-400"># 项目基本信息</p>
                <p>研究目标: {result.researchGoal}</p>
                <p>目标人群: {result.targetAudience}</p>
                <p>研究场景: {result.researchScene}</p>
                <br />
                <p className="text-green-400"># AI 模型配置</p>
                <p>追问深度模式: {result.depth.includes("L3") ? "深度" : result.depth.includes("L2") ? "标准" : "精简"}</p>
                <p>行业知识库: {result.researchScene.includes("母婴") ? "母婴消费" : result.researchScene.includes("汽车") ? "汽车消费" : "通用"}</p>
                <p>情感探测: {result.strategy.includes("情感") ? "开启" : "开启"}</p>
                <p>多轮记忆: 5轮</p>
                <br />
                <p className="text-green-400"># Prompt 模板</p>
                <p>系统Prompt: 你是一位专业的用户研究访谈员，正在进行{result.researchScene}...</p>
                <p>追问策略: {result.strategy}</p>
                <br />
                <p className="text-green-400"># 数据标签体系</p>
                <p>情感标签、主题标签、行为标签、需求标签</p>
                <br />
                <p className="text-green-400"># 报告框架</p>
                <p>{result.deliverables.join(" + ")}</p>
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