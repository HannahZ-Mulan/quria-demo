"use client";

import { useState, useRef, useEffect, KeyboardEvent } from "react";
import { useI18n } from "@/i18n";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { callChatAI } from "@/lib/ai-client";
import type { ChatMessage } from "@/lib/types";

/**
 * project1 的"多轮对话"面板（深空控制台风格版）。
 *
 * AI（通过 /api/project1/chat 接口）扮演专业访谈员，每次只问一个开放式追问，
 * 并且能记住之前的对话内容。如果 AI 不可用，会静默改用本地规则，用户不会看到报错。
 *
 * 功能不变：显示聊天气泡、自动滚到底部、按 Ctrl/Cmd+Enter 发送、显示"本地模式"标签。
 * 仅外观改为深空风：用户气泡用紫青渐变、AI 气泡用玻璃质感、"打字中"三点跳动。
 */
export function ChatPanel() {
  const { t } = useI18n();
  // 对话消息列表（用户和 AI 来回的内容）
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  // 输入框里当前的文字
  const [input, setInput] = useState("");
  // 是否正在等待 AI 回复（加载中）
  const [loading, setLoading] = useState(false);
  // 上一次回复是否真的用了 AI（false 时显示"本地模式"小标签）
  const [usedAI, setUsedAI] = useState(true);
  // 用来引用聊天滚动区域，方便自动滚到底部
  const scrollRef = useRef<HTMLDivElement>(null);

  // 当消息变化或加载状态变化时，把聊天区自动滚动到最底部
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  /**
   * 发送当前输入框里的消息。
   * 把用户消息加进列表 → 调用 AI 接口拿到回复 → 把回复也加进列表。
   * 空消息或正在加载时不发送。
   */
  const send = async () => {
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    const nextMessages: ChatMessage[] = [...messages, { role: "user", content: trimmed }];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);

    try {
      const { reply, usedAI: ai } = await callChatAI(nextMessages);
      setMessages([...nextMessages, { role: "assistant", content: reply }]);
      setUsedAI(ai);
    } finally {
      setLoading(false);
    }
  };

  /**
   * 键盘事件处理：按 Ctrl/Cmd + Enter 发送消息，普通回车换行。
   */
  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Ctrl/Cmd+Enter to send; plain Enter inserts newline.
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      send();
    }
  };

  return (
    <div className="space-y-4">
      {/* 聊天滚动区：深空底 */}
      <div
        ref={scrollRef}
        className="min-h-[320px] max-h-[440px] overflow-y-auto space-y-3 p-4 rounded-xl border border-white/10 bg-white/[0.02]"
      >
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 py-16 text-sm">
            {t("chat_placeholder")}
          </div>
        ) : (
          messages.map((m, idx) => (
            <div
              key={idx}
              className={`flex animate-bubble-in ${m.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {m.role === "user" ? (
                // 用户气泡：紫青渐变
                <div className="max-w-[80%] rounded-2xl rounded-br-md bg-gradient-to-br from-violet-500 to-cyan-500 px-4 py-2.5 text-sm text-white whitespace-pre-wrap shadow-lg shadow-violet-500/20">
                  {m.content}
                </div>
              ) : (
                // AI 气泡：玻璃质感
                <div className="max-w-[80%] rounded-2xl rounded-bl-md border border-white/15 bg-white/[0.06] px-4 py-2.5 text-sm text-gray-100 whitespace-pre-wrap backdrop-blur">
                  {m.content}
                </div>
              )}
            </div>
          ))
        )}

        {/* AI 打字中：三点跳动 */}
        {loading && (
          <div className="flex justify-start animate-bubble-in">
            <div className="inline-flex items-center gap-1.5 rounded-2xl rounded-bl-md border border-white/15 bg-white/[0.06] px-4 py-3 backdrop-blur">
              <span className="typing-dot h-1.5 w-1.5 rounded-full bg-cyan-400" style={{ animationDelay: "0s" }} />
              <span className="typing-dot h-1.5 w-1.5 rounded-full bg-cyan-400" style={{ animationDelay: "0.2s" }} />
              <span className="typing-dot h-1.5 w-1.5 rounded-full bg-cyan-400" style={{ animationDelay: "0.4s" }} />
            </div>
          </div>
        )}
      </div>

      {/* 本地模式提示 + 发送快捷键提示 */}
      <div className="flex items-center justify-between gap-2">
        {!usedAI && (
          <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-gray-500">
            {t("ai_local_mode")}
          </span>
        )}
        <span className="ms-auto text-xs text-gray-500">{t("chat_send_hint")}</span>
      </div>

      {/* 输入区 */}
      <div className="flex gap-2">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={t("chat_input_placeholder")}
          className="min-h-[56px] max-h-32 resize-none bg-white/5 border-white/10 text-gray-100 placeholder:text-gray-500 focus-visible:border-cyan-400/60 focus-visible:ring-cyan-400/20"
          disabled={loading}
        />
        <Button
          onClick={send}
          disabled={loading || !input.trim()}
          className="shimmer-btn self-end border-0 bg-gradient-to-br from-violet-500 to-cyan-500 text-white hover:from-violet-500 hover:to-cyan-500"
        >
          {loading ? t("ai_loading") : t("send_message")}
        </Button>
      </div>
    </div>
  );
}
