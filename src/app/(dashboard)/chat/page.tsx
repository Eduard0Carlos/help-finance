"use client";

import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { Card } from "@/components/ui/Card";
import { HelpCircle, Info, UserCircle, BarChart2, Send } from "lucide-react";

const suggestions = [
  { icon: HelpCircle, label: "Tire suas dúvidas" },
  { icon: Info, label: "Receba informações atualizadas" },
  { icon: UserCircle, label: "Converse com um especialista" },
  { icon: BarChart2, label: "Crie visões de longo prazo" },
];

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const isEmpty = messages.length === 0;

  function handleSend() {
    if (!input.trim()) return;
    setMessages((prev) => [
      ...prev,
      { role: "user", content: input.trim() },
      {
        role: "assistant",
        content:
          "Este recurso estará disponível em breve. O chat com IA será integrado para responder suas dúvidas financeiras.",
      },
    ]);
    setInput("");
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header title="Bate Papo" />

      <main className="flex-1 overflow-hidden p-5">
        <Card className="h-full flex flex-col">
          {/* Messages area */}
          <div className="flex-1 overflow-y-auto flex flex-col">
            {isEmpty ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-8">
                <h2 className="text-3xl font-bold text-white">Help Finance</h2>
                <div className="flex gap-4 flex-wrap justify-center">
                  {suggestions.map(({ icon: Icon, label }, i) => (
                    <button
                      key={i}
                      onClick={() => setInput(label)}
                      className="flex flex-col items-center gap-2 p-4 w-36 border border-[#2a2a3e] rounded-xl hover:border-[#00d4aa]/40 hover:bg-[#00d4aa]/5 transition-all text-center group"
                    >
                      <Icon size={20} className="text-[#00d4aa]" />
                      <span className="text-[#9ca3af] text-xs group-hover:text-white transition-colors leading-tight">
                        {label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-4 pb-4">
                {messages.map((msg, i) => (
                  <div
                    key={i}
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[70%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                        msg.role === "user"
                          ? "bg-[#00d4aa] text-[#0d0d0d] font-medium rounded-br-sm"
                          : "bg-[#1a1a2e] border border-[#2a2a3e] text-white rounded-bl-sm"
                      }`}
                    >
                      {msg.content}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Input area */}
          <div className="flex gap-3 mt-4 pt-4 border-t border-[#2a2a3e]">
            <input
              type="text"
              placeholder="Digite aqui..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1 bg-[#0d0d0d] border border-[#2a2a3e] rounded-full px-4 py-2.5 text-white placeholder-[#9ca3af] focus:outline-none focus:border-[#00d4aa] transition-colors text-sm"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim()}
              className="bg-[#00d4aa] hover:bg-[#00e8bb] disabled:opacity-40 disabled:cursor-not-allowed text-[#0d0d0d] font-semibold px-5 py-2.5 rounded-full transition-colors flex items-center gap-2 text-sm"
            >
              Enviar
              <Send size={14} />
            </button>
          </div>
        </Card>
      </main>
    </div>
  );
}
