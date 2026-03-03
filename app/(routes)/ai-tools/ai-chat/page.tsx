"use client";

import { Bot, Loader2, Send, User } from "lucide-react";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "@/components/ui/button";

function AiChat() {
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
      <div className="mx-auto mt-10 max-w-2xl rounded-xl border bg-white p-8 text-center">
        <h2 className="text-xl font-bold">Context-Aware AI Career Chatbot</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Ask about internships, projects, placements, resumes, or interview preparation. Built
          for Terna Engineering College students.
        </p>
      </div>
    ),
    []
  );

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = input.trim();
    if (!value || isBusy) {
      return;
    }

    setInput("");
    await sendMessage({ text: value });
  };

  return (
    <div className="flex h-[calc(100vh-170px)] flex-col rounded-xl border bg-slate-50">
      <div className="border-b bg-white px-5 py-4">
        <h1 className="text-lg font-bold">AI Career Q&A Chat</h1>
        <p className="text-xs text-muted-foreground">
          Streaming with Gemini 2.5 Flash via Vercel AI SDK
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        {messages.length === 0 ? (
          emptyState
        ) : (
          <div className="mx-auto flex w-full max-w-4xl flex-col gap-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {message.role !== "user" ? (
                  <div className="mt-1 flex h-8 w-8 items-center justify-center rounded-full border bg-white">
                    <Bot className="h-4 w-4" />
                  </div>
                ) : null}

                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-sm md:max-w-[75%] ${
                    message.role === "user"
                      ? "bg-slate-900 text-white"
                      : "border bg-white text-slate-900"
                  }`}
                >
                  <div className="mb-1 flex items-center gap-2 text-[11px] uppercase tracking-wide opacity-70">
                    {message.role === "user" ? <User className="h-3 w-3" /> : <Bot className="h-3 w-3" />}
                    <span>{message.role}</span>
                  </div>

                  <div className="space-y-2 whitespace-pre-wrap leading-relaxed">
                    {message.parts
                      .filter((part) => part.type === "text")
                      .map((part, index) =>
                        message.role === "assistant" ? (
                          <div
                            key={`${message.id}-${index}`}
                            className="prose prose-sm max-w-none space-y-2 text-sm"
                          >
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                              {part.text}
                            </ReactMarkdown>
                          </div>
                        ) : (
                          <p key={`${message.id}-${index}`}>{part.text}</p>
                        )
                      )}
                  </div>
                </div>
              </div>
            ))}

            {isBusy ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Thinking...
              </div>
            ) : null}

            {error ? (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                {error.message || "Something went wrong while streaming the response."}
              </div>
            ) : null}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      <div className="border-t bg-white p-3 md:p-4">
        <form onSubmit={handleSubmit} className="mx-auto flex max-w-4xl items-end gap-2">
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Ask your career question..."
            rows={1}
            className="max-h-36 min-h-[44px] flex-1 resize-y rounded-xl border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
          <Button type="submit" disabled={isBusy || !input.trim()}>
            {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Send
          </Button>
        </form>
      </div>
    </div>
  );
}

export default AiChat;