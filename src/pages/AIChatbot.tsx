import { useState, useRef, useEffect, useCallback } from "react";
import { Bot, Send, Trash2, Sparkles, Plus, History, ChevronLeft } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { useLanguage } from "@/hooks/useLanguage";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

type Msg = { role: "user" | "assistant"; content: string };
type Conversation = { id: string; title: string; created_at: string; updated_at: string };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chatbot`;

const AIChatbot = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Load conversation list
  useEffect(() => {
    if (!user) return;
    supabase
      .from("chat_conversations" as any)
      .select("*")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .then(({ data }) => {
        if (data) setConversations(data as any);
      });
  }, [user]);

  // Load messages for active conversation
  const loadConversation = useCallback(async (convId: string) => {
    const { data } = await supabase
      .from("chat_messages" as any)
      .select("role, content")
      .eq("conversation_id", convId)
      .order("created_at", { ascending: true }) as any;
    if (data) {
      setMessages(data.map((m: any) => ({ role: m.role, content: m.content })));
    }
    setConversationId(convId);
    setShowHistory(false);
  }, []);

  // Load most recent conversation on mount
  useEffect(() => {
    if (!user || conversations.length === 0) return;
    // Auto-load the most recent conversation
    if (!conversationId && conversations.length > 0) {
      loadConversation(conversations[0].id);
    }
  }, [user, conversations, conversationId, loadConversation]);

  const saveMessage = useCallback(async (convId: string, msg: Msg) => {
    if (!user) return;
    await supabase.from("chat_messages" as any).insert({
      conversation_id: convId,
      role: msg.role,
      content: msg.content,
    } as any);
  }, [user]);

  const createConversation = useCallback(async (firstMessage: string): Promise<string | null> => {
    if (!user) return null;
    const title = firstMessage.slice(0, 60) + (firstMessage.length > 60 ? "…" : "");
    const { data } = await supabase
      .from("chat_conversations" as any)
      .insert({ user_id: user.id, title } as any)
      .select("id")
      .single() as any;
    if (data) {
      setConversations((prev) => [{ id: data.id, title, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }, ...prev]);
      return data.id;
    }
    return null;
  }, [user]);

  const startNewChat = useCallback(() => {
    setMessages([]);
    setConversationId(null);
    setShowHistory(false);
  }, []);

  const deleteConversation = useCallback(async (convId: string) => {
    await supabase.from("chat_conversations" as any).delete().eq("id", convId);
    setConversations((prev) => prev.filter((c) => c.id !== convId));
    if (conversationId === convId) {
      setMessages([]);
      setConversationId(null);
    }
  }, [conversationId]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    const userMsg: Msg = { role: "user", content: text };
    const allMessages = [...messages, userMsg];
    setMessages(allMessages);
    setInput("");
    setIsLoading(true);

    // Ensure conversation exists
    let activeConvId = conversationId;
    if (!activeConvId && user) {
      activeConvId = await createConversation(text);
      setConversationId(activeConvId);
    }

    // Save user message
    if (activeConvId) await saveMessage(activeConvId, userMsg);

    let assistantSoFar = "";

    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: allMessages }),
      });

      if (!resp.ok || !resp.body) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error || "Failed to get response");
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "" || !line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              assistantSoFar += content;
              setMessages((prev) => {
                const last = prev[prev.length - 1];
                if (last?.role === "assistant") {
                  return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantSoFar } : m));
                }
                return [...prev, { role: "assistant", content: assistantSoFar }];
              });
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      // Save assistant message
      if (activeConvId && assistantSoFar) {
        await saveMessage(activeConvId, { role: "assistant", content: assistantSoFar });
        // Update conversation timestamp
        await supabase.from("chat_conversations" as any).update({ updated_at: new Date().toISOString() } as any).eq("id", activeConvId);
      }
    } catch (e: any) {
      const errMsg = `⚠️ ${e.message || "Something went wrong"}`;
      setMessages((prev) => [...prev, { role: "assistant", content: errMsg }]);
    } finally {
      setIsLoading(false);
    }
  };

  const suggestions = [
    t("chatbot_suggest_1"),
    t("chatbot_suggest_2"),
    t("chatbot_suggest_3"),
    t("chatbot_suggest_4"),
  ];

  return (
    <div className="min-h-screen pt-14 pb-20 md:pb-0 flex flex-col">
      <div className="container mx-auto max-w-2xl px-3 sm:px-4 flex-1 flex flex-col">
        {/* Header */}
        <div className="py-5 sm:py-6 text-center relative">
          <div className="absolute left-0 top-5 flex gap-1">
            {user && (
              <>
                <button
                  onClick={() => setShowHistory(!showHistory)}
                  className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
                  title="Chat history"
                >
                  <History className="w-4 h-4" />
                </button>
                <button
                  onClick={startNewChat}
                  className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
                  title="New chat"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-medium mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            AI
          </div>
          <h1 className="font-display text-xl sm:text-2xl font-bold text-foreground">{t("chatbot_title")}</h1>
          <p className="text-muted-foreground text-xs sm:text-sm mt-1 max-w-sm mx-auto">{t("chatbot_subtitle")}</p>
        </div>

        {/* History sidebar */}
        {showHistory && (
          <div className="mb-4 glass-card rounded-2xl p-3 max-h-64 overflow-y-auto space-y-1">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground">Chat History</span>
              <button onClick={() => setShowHistory(false)} className="p-1 text-muted-foreground hover:text-foreground">
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
            </div>
            {conversations.length === 0 && (
              <p className="text-xs text-muted-foreground py-2 text-center">No conversations yet</p>
            )}
            {conversations.map((conv) => (
              <div
                key={conv.id}
                className={`flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-sm cursor-pointer transition-colors ${
                  conv.id === conversationId ? "bg-primary/10 text-primary" : "hover:bg-secondary text-foreground"
                }`}
              >
                <span className="truncate flex-1" onClick={() => loadConversation(conv.id)}>
                  {(conv as any).title}
                </span>
                <button
                  onClick={(e) => { e.stopPropagation(); deleteConversation(conv.id); }}
                  className="p-1 text-muted-foreground hover:text-destructive shrink-0"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 space-y-3 sm:space-y-4 pb-4 overflow-y-auto">
          {messages.length === 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2 sm:mt-4">
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  onClick={() => { setInput(s); inputRef.current?.focus(); }}
                  className="glass-card-hover p-3 sm:p-4 text-left text-xs sm:text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[90%] sm:max-w-[85%] rounded-2xl px-3.5 sm:px-4 py-2.5 sm:py-3 text-sm ${
                msg.role === "user"
                  ? "bg-primary text-primary-foreground rounded-br-md"
                  : "glass-card rounded-bl-md"
              }`}>
                {msg.role === "assistant" ? (
                  <div className="prose prose-sm dark:prose-invert max-w-none [&_p]:my-1 [&_ul]:my-1 [&_li]:my-0.5 [&_h1]:text-base [&_h2]:text-sm [&_h3]:text-sm">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                ) : (
                  <p>{msg.content}</p>
                )}
              </div>
            </div>
          ))}

          {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
            <div className="flex justify-start">
              <div className="glass-card rounded-2xl rounded-bl-md px-4 py-3">
                <div className="flex gap-1">
                  <span className="w-2 h-2 rounded-full bg-primary/50 animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-2 h-2 rounded-full bg-primary/50 animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-2 h-2 rounded-full bg-primary/50 animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="sticky bottom-16 md:bottom-0 pb-3 sm:pb-4 pt-2 bg-gradient-to-t from-background via-background to-transparent">
          <div className="flex items-end gap-2">
            {messages.length > 0 && (
              <button onClick={startNewChat} className="p-2.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary active:scale-90 transition-all shrink-0">
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <div className="flex-1 glass-card rounded-2xl flex items-end">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                placeholder={t("chatbot_placeholder")}
                rows={1}
                className="flex-1 bg-transparent px-3.5 sm:px-4 py-3 text-sm resize-none focus:outline-none max-h-32 text-foreground placeholder:text-muted-foreground"
                style={{ minHeight: "44px" }}
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || isLoading}
                className="p-3 text-primary hover:text-primary/80 disabled:opacity-30 active:scale-90 transition-all"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIChatbot;
