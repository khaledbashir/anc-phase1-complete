"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
    Send, FileSpreadsheet, Download, Loader2, Trash2, Sparkles,
    RotateCcw, Copy, Check, Pencil, Plus, Settings2, X, RefreshCw,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

/* ─── Types ─────────────────────────────────────────── */

interface ChatMessage {
    id: string;
    role: "user" | "assistant";
    content: string;
    timestamp: Date;
    excelData?: ExcelExportData | null;
}

interface ExcelExportData {
    project_name: string;
    displays: Array<{
        name: string;
        cost: number;
        selling_price: number;
        margin_dollars?: number;
        margin_pct?: number;
        details?: Record<string, any>;
    }>;
    services?: Array<{
        category: string;
        cost: number;
        selling_price: number;
        margin_dollars?: number;
        margin_pct?: number;
    }>;
    grand_total_cost?: number;
    grand_total_selling?: number;
    grand_total_margin?: number;
    grand_total_margin_pct?: number;
    date?: string;
    estimate_type?: string;
    currency?: string;
}

/* ─── Markdown Components ───────────────────────────── */

const mdComponents: Record<string, React.FC<any>> = {
    h1: ({ children }: any) => <h1 className="text-lg font-bold mt-4 mb-2 text-foreground">{children}</h1>,
    h2: ({ children }: any) => <h2 className="text-base font-bold mt-3 mb-1.5 text-foreground">{children}</h2>,
    h3: ({ children }: any) => <h3 className="text-sm font-semibold mt-2 mb-1 text-foreground">{children}</h3>,
    p: ({ children }: any) => <p className="mb-2 leading-relaxed">{children}</p>,
    ul: ({ children }: any) => <ul className="list-disc pl-5 mb-2 space-y-0.5">{children}</ul>,
    ol: ({ children }: any) => <ol className="list-decimal pl-5 mb-2 space-y-0.5">{children}</ol>,
    li: ({ children }: any) => <li className="leading-relaxed">{children}</li>,
    strong: ({ children }: any) => <strong className="font-semibold text-foreground">{children}</strong>,
    em: ({ children }: any) => <em className="italic">{children}</em>,
    code: ({ inline, children, ...props }: any) =>
        inline ? (
            <code className="bg-muted px-1 py-0.5 rounded text-xs font-mono text-foreground" {...props}>{children}</code>
        ) : (
            <pre className="bg-muted border border-border rounded p-3 overflow-x-auto my-2">
                <code className="text-xs font-mono text-foreground" {...props}>{children}</code>
            </pre>
        ),
    table: ({ children }: any) => (
        <div className="overflow-x-auto my-2">
            <table className="w-full text-xs border-collapse">{children}</table>
        </div>
    ),
    thead: ({ children }: any) => <thead className="bg-muted">{children}</thead>,
    th: ({ children }: any) => <th className="px-3 py-1.5 text-left font-semibold border-b border-border text-foreground">{children}</th>,
    td: ({ children }: any) => <td className="px-3 py-1.5 border-b border-border">{children}</td>,
    blockquote: ({ children }: any) => <blockquote className="border-l-2 border-primary pl-3 my-2 italic text-muted-foreground">{children}</blockquote>,
    hr: () => <hr className="border-border my-3" />,
};

/* ─── Main Component ────────────────────────────────── */

export default function ChatPage() {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState("");
    const [isStreaming, setIsStreaming] = useState(false);
    const [sessionId, setSessionId] = useState(() => `chat-${Date.now()}`);
    const [exportLoading, setExportLoading] = useState<string | null>(null);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [editingMsgId, setEditingMsgId] = useState<string | null>(null);
    const [editingContent, setEditingContent] = useState("");
    const [showSystemPrompt, setShowSystemPrompt] = useState(false);
    const [systemPrompt, setSystemPrompt] = useState("");
    const [systemPromptLoading, setSystemPromptLoading] = useState(false);
    const [systemPromptSaved, setSystemPromptSaved] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const abortRef = useRef<AbortController | null>(null);

    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, []);

    useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);
    useEffect(() => { inputRef.current?.focus(); }, []);

    /* ─── Stream a message ──────────────────────────── */

    const streamMessage = async (text: string, existingMessages?: ChatMessage[]) => {
        if (!text.trim() || isStreaming) return;

        const userMsg: ChatMessage = {
            id: `user-${Date.now()}`,
            role: "user",
            content: text.trim(),
            timestamp: new Date(),
        };

        const base = existingMessages ?? messages;
        const withUser = [...base, userMsg];
        setMessages(withUser);
        setInput("");
        setIsStreaming(true);

        const assistantId = `assistant-${Date.now()}`;
        setMessages([...withUser, { id: assistantId, role: "assistant", content: "", timestamp: new Date() }]);

        const controller = new AbortController();
        abortRef.current = controller;

        try {
            const res = await fetch("/api/chat/stream", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message: text.trim(), sessionId }),
                signal: controller.signal,
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({ error: "Unknown error" }));
                setMessages((prev) => prev.map((m) => m.id === assistantId ? { ...m, content: `Error: ${err.error || res.statusText}` } : m));
                setIsStreaming(false);
                return;
            }

            const reader = res.body?.getReader();
            if (!reader) { setIsStreaming(false); return; }

            const decoder = new TextDecoder();
            let buffer = "";
            let fullText = "";

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split("\n");
                buffer = lines.pop() || "";
                for (const line of lines) {
                    const t = line.trim();
                    if (!t || !t.startsWith("data: ")) continue;
                    try {
                        const chunk = JSON.parse(t.slice(6));
                        if (chunk.textResponse) {
                            fullText += chunk.textResponse;
                            setMessages((prev) => prev.map((m) => m.id === assistantId ? { ...m, content: fullText } : m));
                        }
                        if (chunk.close) break;
                    } catch { /* skip */ }
                }
            }

            const excelData = tryExtractExcelData(fullText);
            if (excelData) {
                setMessages((prev) => prev.map((m) => m.id === assistantId ? { ...m, excelData } : m));
            }
        } catch (err: any) {
            if (err.name !== "AbortError") {
                setMessages((prev) => prev.map((m) => m.id === assistantId ? { ...m, content: `Error: ${err.message}` } : m));
            }
        } finally {
            abortRef.current = null;
            setIsStreaming(false);
        }
    };

    /* ─── Actions ───────────────────────────────────── */

    const handleSend = () => streamMessage(input);

    const handleNewChat = () => {
        if (isStreaming) abortRef.current?.abort();
        setMessages([]);
        setSessionId(`chat-${Date.now()}`);
        setInput("");
        setTimeout(() => inputRef.current?.focus(), 100);
    };

    const handleDeleteMessage = (msgId: string) => {
        setMessages((prev) => {
            const idx = prev.findIndex((m) => m.id === msgId);
            if (idx === -1) return prev;
            // If deleting a user message, also delete the following assistant message
            if (prev[idx].role === "user" && prev[idx + 1]?.role === "assistant") {
                return [...prev.slice(0, idx), ...prev.slice(idx + 2)];
            }
            // If deleting an assistant message, also delete the preceding user message
            if (prev[idx].role === "assistant" && prev[idx - 1]?.role === "user") {
                return [...prev.slice(0, idx - 1), ...prev.slice(idx + 1)];
            }
            return prev.filter((m) => m.id !== msgId);
        });
    };

    const handleRetry = (msgId: string) => {
        const idx = messages.findIndex((m) => m.id === msgId);
        if (idx === -1) return;
        // Find the user message before this assistant message
        let userMsg: ChatMessage | null = null;
        if (messages[idx].role === "assistant" && messages[idx - 1]?.role === "user") {
            userMsg = messages[idx - 1];
        } else if (messages[idx].role === "user") {
            userMsg = messages[idx];
        }
        if (!userMsg) return;
        // Remove from this pair onwards and re-send
        const pairStart = messages[idx].role === "assistant" ? idx - 1 : idx;
        const base = messages.slice(0, pairStart);
        streamMessage(userMsg.content, base);
    };

    const handleCopy = async (content: string, msgId: string) => {
        await navigator.clipboard.writeText(content);
        setCopiedId(msgId);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const handleEditStart = (msg: ChatMessage) => {
        setEditingMsgId(msg.id);
        setEditingContent(msg.content);
    };

    const handleEditSubmit = () => {
        if (!editingMsgId || !editingContent.trim()) return;
        const idx = messages.findIndex((m) => m.id === editingMsgId);
        if (idx === -1) return;
        // Remove this message and everything after, re-send with edited content
        const base = messages.slice(0, idx);
        setEditingMsgId(null);
        setEditingContent("");
        streamMessage(editingContent.trim(), base);
    };

    const handleEditCancel = () => {
        setEditingMsgId(null);
        setEditingContent("");
    };

    const handleExportExcel = async (msgId: string, excelData: ExcelExportData) => {
        setExportLoading(msgId);
        try {
            const res = await fetch("/api/agent-skill/generate-excel", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(excelData),
            });
            const result = await res.json();
            if (result.success && result.download_url) {
                window.open(result.download_url, "_blank");
            } else {
                alert(`Export failed: ${result.error || "Unknown error"}`);
            }
        } catch (err: any) {
            alert(`Export failed: ${err.message}`);
        } finally {
            setExportLoading(null);
        }
    };

    const handleExportFromText = async (msgId: string, content: string) => {
        setExportLoading(msgId);
        try {
            const data = buildExcelPayloadFromText(content);
            const res = await fetch("/api/agent-skill/generate-excel", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            const result = await res.json();
            if (result.success && result.download_url) {
                window.open(result.download_url, "_blank");
            } else {
                alert(`Export failed: ${result.error || "Unknown error"}`);
            }
        } catch (err: any) {
            alert(`Export failed: ${err.message}`);
        } finally {
            setExportLoading(null);
        }
    };

    /* ─── System Prompt ─────────────────────────────── */

    const loadSystemPrompt = async () => {
        setShowSystemPrompt(true);
        setSystemPromptLoading(true);
        try {
            const res = await fetch("/api/chat/system-prompt");
            const data = await res.json();
            setSystemPrompt(data.prompt || "");
        } catch {
            setSystemPrompt("Failed to load system prompt");
        } finally {
            setSystemPromptLoading(false);
        }
    };

    const saveSystemPrompt = async () => {
        setSystemPromptLoading(true);
        try {
            await fetch("/api/chat/system-prompt", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ prompt: systemPrompt }),
            });
            setSystemPromptSaved(true);
            setTimeout(() => setSystemPromptSaved(false), 2000);
        } catch {
            alert("Failed to save system prompt");
        } finally {
            setSystemPromptLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    /* ─── Render ────────────────────────────────────── */

    return (
        <div className="flex flex-col h-screen bg-background">
            {/* Header */}
            <header className="shrink-0 h-14 border-b border-border flex items-center justify-between px-6">
                <div className="flex items-center gap-3">
                    <Sparkles className="w-5 h-5 text-primary" />
                    <h1 className="text-sm font-semibold text-foreground tracking-wide">ANC Intelligence</h1>
                    <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Chat</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <button
                        onClick={handleNewChat}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-muted-foreground hover:text-foreground border border-border rounded hover:bg-accent transition-colors"
                        title="New Chat"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        New
                    </button>
                    <button
                        onClick={loadSystemPrompt}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-muted-foreground hover:text-foreground border border-border rounded hover:bg-accent transition-colors"
                        title="Edit System Prompt"
                    >
                        <Settings2 className="w-3.5 h-3.5" />
                        Prompt
                    </button>
                    {messages.length > 0 && (
                        <>
                            <button
                                onClick={handleNewChat}
                                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-muted-foreground hover:text-foreground border border-border rounded hover:bg-accent transition-colors"
                                title="Reset Chat"
                            >
                                <RefreshCw className="w-3.5 h-3.5" />
                                Reset
                            </button>
                            <button
                                onClick={() => setMessages([])}
                                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-red-500 hover:text-red-600 border border-border rounded hover:bg-red-50 dark:hover:bg-red-950 transition-colors"
                                title="Clear All Messages"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                            </button>
                        </>
                    )}
                </div>
            </header>

            {/* System Prompt Modal */}
            {showSystemPrompt && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm">
                    <div className="w-full max-w-2xl bg-background border border-border rounded shadow-lg max-h-[80vh] flex flex-col mx-4">
                        <div className="flex items-center justify-between px-5 py-3 border-b border-border">
                            <h2 className="text-sm font-semibold text-foreground">System Prompt</h2>
                            <button onClick={() => setShowSystemPrompt(false)} className="p-1.5 hover:bg-accent rounded transition-colors">
                                <X className="w-4 h-4 text-muted-foreground" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-5">
                            {systemPromptLoading && !systemPrompt ? (
                                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                                    <Loader2 className="w-4 h-4 animate-spin" /> Loading...
                                </div>
                            ) : (
                                <textarea
                                    value={systemPrompt}
                                    onChange={(e) => setSystemPrompt(e.target.value)}
                                    className="w-full h-[50vh] bg-muted border border-border rounded p-3 text-xs font-mono text-foreground focus:outline-none focus:border-primary resize-none"
                                    placeholder="Enter system prompt..."
                                />
                            )}
                        </div>
                        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-border">
                            <button
                                onClick={() => setShowSystemPrompt(false)}
                                className="px-3 py-1.5 text-xs text-muted-foreground border border-border rounded hover:bg-accent transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={saveSystemPrompt}
                                disabled={systemPromptLoading}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-primary text-white rounded hover:opacity-90 transition-opacity disabled:opacity-50"
                            >
                                {systemPromptLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : systemPromptSaved ? <Check className="w-3.5 h-3.5" /> : null}
                                {systemPromptSaved ? "Saved" : "Save"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto">
                <div className="max-w-3xl mx-auto px-4 py-6 space-y-1">
                    {messages.length === 0 && (
                        <div className="flex flex-col items-center justify-center h-[60vh] text-center">
                            <div className="w-12 h-12 rounded bg-primary/10 flex items-center justify-center mb-4">
                                <Sparkles className="w-6 h-6 text-primary" />
                            </div>
                            <h2 className="text-lg font-semibold text-foreground mb-2">ANC Senior Estimator</h2>
                            <p className="text-sm text-muted-foreground max-w-md mb-6">
                                Describe your project. I&apos;ll run the full estimator questionnaire, generate pricing, and export to Excel.
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg">
                                {[
                                    "New client Indiana Fever, 20x12 main scoreboard at 4mm, two 100x3 ribbon boards at 6mm",
                                    "Outdoor 40x15 LED board for a high school stadium, R6 Outdoor product",
                                    "NBCU 30 Rock lobby — three 10x6 displays at 1.5mm indoor",
                                    "Quick ROM for a 50x20 concert stage backdrop at 3.9mm",
                                ].map((prompt) => (
                                    <button
                                        key={prompt}
                                        onClick={() => { setInput(prompt); inputRef.current?.focus(); }}
                                        className="text-left px-3 py-2.5 text-xs text-muted-foreground border border-border rounded hover:bg-accent hover:text-foreground transition-colors leading-relaxed"
                                    >
                                        {prompt}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {messages.map((msg) => (
                        <div key={msg.id} className={cn("group flex gap-3 py-3", msg.role === "user" ? "justify-end" : "justify-start")}>
                            <div className={cn("max-w-[85%] rounded", msg.role === "user" ? "order-1" : "order-1")}>
                                {/* Editing mode */}
                                {editingMsgId === msg.id ? (
                                    <div className="border border-primary rounded p-3 bg-background">
                                        <textarea
                                            value={editingContent}
                                            onChange={(e) => setEditingContent(e.target.value)}
                                            className="w-full bg-transparent text-sm text-foreground focus:outline-none resize-none min-h-[60px]"
                                            autoFocus
                                        />
                                        <div className="flex gap-2 mt-2">
                                            <button onClick={handleEditSubmit} className="px-3 py-1 text-xs font-medium bg-primary text-white rounded hover:opacity-90">
                                                Send
                                            </button>
                                            <button onClick={handleEditCancel} className="px-3 py-1 text-xs text-muted-foreground border border-border rounded hover:bg-accent">
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className={cn("px-4 py-3 rounded", msg.role === "user" ? "bg-foreground text-background" : "bg-accent/50 border border-border")}>
                                        {/* Content */}
                                        {msg.content ? (
                                            msg.role === "assistant" ? (
                                                <div className="text-sm leading-relaxed prose-sm max-w-none">
                                                    <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
                                                        {msg.content}
                                                    </ReactMarkdown>
                                                </div>
                                            ) : (
                                                <div className="text-sm leading-relaxed whitespace-pre-wrap break-words">{msg.content}</div>
                                            )
                                        ) : (
                                            <span className="flex items-center gap-2 text-muted-foreground text-sm">
                                                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Thinking...
                                            </span>
                                        )}

                                        {/* Action bar — assistant messages */}
                                        {msg.role === "assistant" && msg.content && !isStreaming && (
                                            <div className="mt-3 pt-2 border-t border-border/50 flex flex-wrap items-center gap-1.5">
                                                <button
                                                    onClick={() => handleCopy(msg.content, msg.id)}
                                                    className="flex items-center gap-1 px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground rounded hover:bg-background transition-colors"
                                                    title="Copy"
                                                >
                                                    {copiedId === msg.id ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                                                    {copiedId === msg.id ? "Copied" : "Copy"}
                                                </button>
                                                <button
                                                    onClick={() => handleRetry(msg.id)}
                                                    className="flex items-center gap-1 px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground rounded hover:bg-background transition-colors"
                                                    title="Retry"
                                                >
                                                    <RotateCcw className="w-3 h-3" /> Retry
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteMessage(msg.id)}
                                                    className="flex items-center gap-1 px-2 py-1 text-[11px] text-muted-foreground hover:text-red-500 rounded hover:bg-background transition-colors"
                                                    title="Delete"
                                                >
                                                    <Trash2 className="w-3 h-3" /> Delete
                                                </button>
                                                <div className="flex-1" />
                                                {msg.excelData ? (
                                                    <button
                                                        onClick={() => handleExportExcel(msg.id, msg.excelData!)}
                                                        disabled={exportLoading === msg.id}
                                                        className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium bg-primary text-white rounded hover:opacity-90 transition-opacity disabled:opacity-50"
                                                    >
                                                        {exportLoading === msg.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <FileSpreadsheet className="w-3 h-3" />}
                                                        Export Excel
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={() => handleExportFromText(msg.id, msg.content)}
                                                        disabled={exportLoading === msg.id}
                                                        className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] text-muted-foreground border border-border rounded hover:bg-background hover:text-foreground transition-colors disabled:opacity-50"
                                                    >
                                                        {exportLoading === msg.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
                                                        Export Excel
                                                    </button>
                                                )}
                                            </div>
                                        )}

                                        {/* Action bar — user messages */}
                                        {msg.role === "user" && !isStreaming && (
                                            <div className="mt-2 pt-1.5 border-t border-background/20 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => handleEditStart(msg)}
                                                    className="flex items-center gap-1 px-2 py-0.5 text-[11px] text-background/70 hover:text-background rounded transition-colors"
                                                    title="Edit & Resend"
                                                >
                                                    <Pencil className="w-3 h-3" /> Edit
                                                </button>
                                                <button
                                                    onClick={() => handleCopy(msg.content, msg.id)}
                                                    className="flex items-center gap-1 px-2 py-0.5 text-[11px] text-background/70 hover:text-background rounded transition-colors"
                                                    title="Copy"
                                                >
                                                    {copiedId === msg.id ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteMessage(msg.id)}
                                                    className="flex items-center gap-1 px-2 py-0.5 text-[11px] text-background/70 hover:text-red-300 rounded transition-colors"
                                                    title="Delete"
                                                >
                                                    <Trash2 className="w-3 h-3" />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                    <div ref={messagesEndRef} />
                </div>
            </div>

            {/* Input */}
            <div className="shrink-0 border-t border-border bg-background">
                <div className="max-w-3xl mx-auto px-4 py-4">
                    <div className="flex items-end gap-3 border border-border rounded bg-background focus-within:border-primary transition-colors">
                        <textarea
                            ref={inputRef}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Describe your project or ask a question..."
                            rows={1}
                            className="flex-1 resize-none bg-transparent px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none min-h-[44px] max-h-[120px]"
                            style={{ height: "auto", overflow: "hidden" }}
                            onInput={(e) => {
                                const target = e.target as HTMLTextAreaElement;
                                target.style.height = "auto";
                                target.style.height = Math.min(target.scrollHeight, 120) + "px";
                            }}
                        />
                        <button
                            onClick={handleSend}
                            disabled={!input.trim() || isStreaming}
                            className="shrink-0 p-3 text-muted-foreground hover:text-primary disabled:opacity-30 transition-colors"
                        >
                            {isStreaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        </button>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-2 text-center">
                        GLM-5 • ANC Senior Estimator • Export to Excel anytime
                    </p>
                </div>
            </div>
        </div>
    );
}

/* ─── Helpers ───────────────────────────────────────── */

function tryExtractExcelData(text: string): ExcelExportData | null {
    const jsonMatch = text.match(/```json\s*([\s\S]*?)```/);
    if (jsonMatch) {
        try {
            const parsed = JSON.parse(jsonMatch[1]);
            if (parsed.project_name && parsed.displays) return parsed;
        } catch { /* not valid JSON */ }
    }

    const displays: ExcelExportData["displays"] = [];
    const services: ExcelExportData["services"] = [];
    const costLines = text.match(/(.+?)[\s:—\-]+\$[\d,]+(?:\.\d+)?/g);
    if (!costLines || costLines.length === 0) return null;

    let projectName = "AI Estimate";
    const nameMatch = text.match(/(?:project|client|venue)[:\s]+([^\n]+)/i);
    if (nameMatch) projectName = nameMatch[1].trim().replace(/[*_]/g, "");

    let totalCost = 0;
    let totalSelling = 0;

    for (const line of costLines) {
        const match = line.match(/(.+?)[\s:—\-]+\$([\d,]+(?:\.\d+)?)/);
        if (!match) continue;
        const name = match[1].trim().replace(/^[\-\*•]\s*/, "").replace(/[*_]/g, "");
        const amount = parseFloat(match[2].replace(/,/g, ""));

        if (/install|labor|pm|management|permit|electrical|travel|engineering/i.test(name)) {
            services.push({ category: name, cost: amount, selling_price: amount, margin_dollars: 0, margin_pct: 0 });
        } else if (!/total|grand|margin|selling|subtotal|cost basis/i.test(name)) {
            displays.push({ name, cost: amount, selling_price: amount, margin_dollars: 0, margin_pct: 0 });
        }
        if (/selling|total.*price/i.test(name)) totalSelling = amount;
        else if (/total.*cost|cost.*basis/i.test(name)) totalCost = amount;
    }

    if (displays.length === 0) return null;

    const grandCost = totalCost || displays.reduce((s, d) => s + d.cost, 0) + services.reduce((s, sv) => s + sv.cost, 0);
    const grandSelling = totalSelling || grandCost;
    const grandMargin = grandSelling - grandCost;
    const grandMarginPct = grandSelling > 0 ? Math.round((grandMargin / grandSelling) * 100 * 10) / 10 : 0;

    return {
        project_name: projectName, displays, services,
        grand_total_cost: grandCost, grand_total_selling: grandSelling,
        grand_total_margin: grandMargin, grand_total_margin_pct: grandMarginPct,
        date: new Date().toISOString().split("T")[0], estimate_type: "Budget Estimate", currency: "USD",
    };
}

function buildExcelPayloadFromText(content: string): ExcelExportData {
    const extracted = tryExtractExcelData(content);
    if (extracted) return extracted;
    return {
        project_name: "AI Chat Export",
        displays: [{ name: "Estimate from Chat", cost: 0, selling_price: 0, details: { "AI Response": content.slice(0, 500) } }],
        date: new Date().toISOString().split("T")[0], estimate_type: "Budget Estimate", currency: "USD",
    };
}
