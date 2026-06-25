"use client";

import { useState, useRef, useEffect, KeyboardEvent } from "react";
import { useI18n } from "@/i18n";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { callChatAI } from "@/lib/ai-client";
import type { ChatMessage } from "@/lib/types";

/**
 * Multi-turn chat panel for project1. The AI (via /api/project1/chat) acts as a
 * professional interviewer, asking one open-ended follow-up at a time and keeping
 * the conversation context. Falls back to local rules silently if AI is unavailable.
 */
export function ChatPanel() {
  const { t } = useI18n();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [usedAI, setUsedAI] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

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

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Ctrl/Cmd+Enter to send; plain Enter inserts newline.
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      send();
    }
  };

  return (
    <div className="space-y-4">
      <div
        ref={scrollRef}
        className="min-h-[320px] max-h-[440px] overflow-y-auto space-y-3 p-3 bg-gray-50 rounded-lg border"
      >
        {messages.length === 0 ? (
          <div className="text-center text-gray-400 py-16">
            {t("chat_placeholder")}
          </div>
        ) : (
          messages.map((m, idx) => (
            <div
              key={idx}
              className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm whitespace-pre-wrap ${
                  m.role === "user"
                    ? "bg-blue-600 text-white rounded-br-sm"
                    : "bg-white border border-gray-200 text-gray-900 rounded-bl-sm"
                }`}
              >
                {m.content}
              </div>
            </div>
          ))
        )}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-sm px-4 py-2 text-sm text-gray-400">
              {t("ai_thinking")}
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-2">
        {!usedAI && (
          <Badge variant="outline" className="text-gray-500">
            {t("ai_local_mode")}
          </Badge>
        )}
        <span className="text-xs text-gray-400 ms-auto">{t("chat_send_hint")}</span>
      </div>

      <div className="flex gap-2">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={t("chat_input_placeholder")}
          className="min-h-[56px] max-h-32 resize-none"
          disabled={loading}
        />
        <Button onClick={send} disabled={loading || !input.trim()} className="self-end">
          {loading ? t("ai_loading") : t("send_message")}
        </Button>
      </div>
    </div>
  );
}
