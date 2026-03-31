"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Bot, Loader2, Send, User } from "lucide-react";
import { useChat } from "@ai-sdk/react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "@/components/ui/button";

// 1. Ensure NO 'metadata' or 'viewport' exports are in this file!

export default function AiChat() { // Using 'export default' directly
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const { messages, sendMessage, status, error } = useChat({
    api: "/api/chat",
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, status]);

  const isBusy = status === "submitted" || status === "streaming";

  const emptyState = useMemo(
    () => (
      <div className="mx-auto mt-10 max-w-2xl rounded-xl border border-dashed bg-white p-12 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-[#355ca9]">
          <Bot className="h-6 w-6" />
        </div>
        <h2 className="text-xl font-bold text-slate-800">Context-Aware AI Career Chatbot</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Ask about internships, projects, placements, resumes, or interview preparation. 
        </p>
      </div>
    ),
    []
  );

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = input.trim();
    if (!value || isBusy) return;

    setInput("");
    await sendMessage({ text: value });
  };

  return (
    <div className="flex h-[calc(100vh-170px)] flex-col rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="bg-gradient-to-tr from-[#1d4084] via-[#355ca9] to-[#f48322] px-6 py-5 shadow-md">
        <h1 className="text-lg font-bold text-white">AI Career Q&A Chat</h1>
        <p className="text-xs font-medium text-white/90">
          Your AI Guide for Career Guidance
        </p>
      </div>

      <div className="flex-1 overflow-y-auto bg-slate-50/30 p-4 md:p-8">
        {messages.length === 0 ? (
          emptyState
        ) : (
          <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {message.role !== "user" && (
                  <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-blue-100 bg-white shadow-sm text-[#355ca9]">
                    <Bot className="h-5 w-5" />
                  </div>
                )}

                <div
                  className={`max-w-[85%] rounded-2xl px-5 py-3.5 text-sm shadow-sm md:max-w-[75%] ${
                    message.role === "user"
                      ? "bg-[#355ca9] text-white rounded-tr-none"
                      : "border border-slate-200 bg-white text-slate-900 rounded-tl-none"
                  }`}
                >
                  <div className={`mb-1.5 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider ${message.role === 'user' ? 'text-blue-100' : 'text-slate-400'}`}>
                    {message.role === "user" ? <User className="h-3 w-3" /> : <Bot className="h-3 w-3" />}
                    <span>{message.role === "user" ? "You" : "Career Assistant"}</span>
                  </div>

                  <div className="space-y-2 whitespace-pre-wrap leading-relaxed">
                    {message.parts
                      .filter((part) => part.type === "text")
                      .map((part, index) =>
                        message.role === "assistant" ? (
                          <div key={index} className="prose prose-sm max-w-none prose-slate text-slate-800">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                              {part.text}
                            </ReactMarkdown>
                          </div>
                        ) : (
                          <p key={index} className="font-medium">{part.text}</p>
                        )
                      )}
                  </div>
                </div>
              </div>
            ))}

            {isBusy && (
              <div className="flex items-center gap-2 px-12 text-xs font-medium text-[#355ca9]">
                <Loader2 className="h-4 w-4 animate-spin" />
                Thinking...
              </div>
            )}

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-xs text-red-700">
                {error.message || "Something went wrong."}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      <div className="border-t bg-white p-4 md:p-6">
        <form onSubmit={handleSubmit} className="mx-auto flex max-w-4xl items-end gap-3">
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Ask your career question..."
            rows={1}
            className="max-h-36 min-h-[48px] flex-1 resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm shadow-inner focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#355ca9]/20 focus-visible:border-[#355ca9] transition-all"
          />
          <Button 
            type="submit" 
            disabled={isBusy || !input.trim()} 
            className="h-[48px] px-6 bg-[#355ca9] hover:bg-[#1d4084] shadow-md transition-all rounded-xl text-white"
          >
            {isBusy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
            <span className="ml-2 hidden md:inline">Send</span>
          </Button>
        </form>
      </div>
    </div>
  );
}