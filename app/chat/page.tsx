"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Send, FileSpreadsheet, Download, Loader2, Trash2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

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

export default function ChatPage() {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState("");
    const [isStreaming, setIsStreaming] = useState(false);
    const [sessionId] = useState(() => `chat-${Date.now()}`);
    const [exportLoading, setExportLoading] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, []);

    useEffect(() => {
        scrollToBottom();
    }, [messages, scrollToBottom]);

    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    const handleSend = async () => {
        const trimmed = input.trim();
        if (!trimmed || isStreaming) return;

        const userMsg: ChatMessage = {
            id: `user-${Date.now()}`,
            role: "user",
            content: trimmed,
            timestamp: new Date(),
        };

        setMessages((prev) => [...prev, userMsg]);
        setInput("");
        setIsStreaming(true);

        const assistantId = `assistant-${Date.now()}`;
        const assistantMsg: ChatMessage = {
            id: assistantId,
            role: "assistant",
            content: "",
            timestamp: new Date(),
        };
        setMessages((prev) => [...prev, assistantMsg]);

        try {
            const res = await fetch("/api/chat/stream", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message: trimmed, sessionId }),
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({ error: "Unknown error" }));
                setMessages((prev) =>
                    prev.map((m) =>
                        m.id === assistantId
                            ? { ...m, content: `Error: ${err.error || res.statusText}` }
                            : m
                    )
                );
                setIsStreaming(false);
                return;
            }

            const reader = res.body?.getReader();
            if (!reader) {
                setIsStreaming(false);
                return;
            }

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
                    const trimmedLine = line.trim();
                    if (!trimmedLine || !trimmedLine.startsWith("data: ")) continue;

                    try {
                        const chunk = JSON.parse(trimmedLine.slice(6));
                        if (chunk.textResponse) {
                            fullText += chunk.textResponse;
                            setMessages((prev) =>
                                prev.map((m) =>
                                    m.id === assistantId ? { ...m, content: fullText } : m
                                )
                            );
                        }
                        if (chunk.close) break;
                    } catch {
                        // skip
                    }
                }
            }

            // Try to extract Excel-exportable data from the AI response
            const excelData = tryExtractExcelData(fullText);
            if (excelData) {
                setMessages((prev) =>
                    prev.map((m) =>
                        m.id === assistantId ? { ...m, excelData } : m
                    )
                );
            }
        } catch (err: any) {
            setMessages((prev) =>
                prev.map((m) =>
                    m.id === assistantId
                        ? { ...m, content: `Error: ${err.message}` }
                        : m
                )
            );
        } finally {
            setIsStreaming(false);
        }
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
            // Send the full AI response to generate-excel with a generic wrapper
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

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const clearChat = () => {
        setMessages([]);
    };

    return (
        <div className="flex flex-col h-screen bg-background">
            {/* Header */}
            <header className="shrink-0 h-14 border-b border-border flex items-center justify-between px-6">
                <div className="flex items-center gap-3">
                    <Sparkles className="w-5 h-5 text-primary" />
                    <h1 className="text-sm font-semibold text-foreground tracking-wide">
                        ANC Intelligence
                    </h1>
                    <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                        Chat
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    {messages.length > 0 && (
                        <button
                            onClick={clearChat}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground border border-border rounded hover:bg-accent transition-colors"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                            Clear
                        </button>
                    )}
                </div>
            </header>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto">
                <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
                    {messages.length === 0 && (
                        <div className="flex flex-col items-center justify-center h-[60vh] text-center">
                            <div className="w-12 h-12 rounded bg-primary/10 flex items-center justify-center mb-4">
                                <Sparkles className="w-6 h-6 text-primary" />
                            </div>
                            <h2 className="text-lg font-semibold text-foreground mb-2">
                                ANC Intelligence Chat
                            </h2>
                            <p className="text-sm text-muted-foreground max-w-md mb-6">
                                Describe your project and I&apos;ll generate estimates. Ask me to export to Excel when you&apos;re ready.
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
                                        onClick={() => {
                                            setInput(prompt);
                                            inputRef.current?.focus();
                                        }}
                                        className="text-left px-3 py-2.5 text-xs text-muted-foreground border border-border rounded hover:bg-accent hover:text-foreground transition-colors leading-relaxed"
                                    >
                                        {prompt}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {messages.map((msg) => (
                        <div key={msg.id} className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}>
                            <div
                                className={cn(
                                    "max-w-[85%] rounded px-4 py-3",
                                    msg.role === "user"
                                        ? "bg-foreground text-background"
                                        : "bg-accent border border-border"
                                )}
                            >
                                <div className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                                    {msg.content || (
                                        <span className="flex items-center gap-2 text-muted-foreground">
                                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                            Thinking...
                                        </span>
                                    )}
                                </div>

                                {/* Excel export button — shows on assistant messages with data */}
                                {msg.role === "assistant" && msg.content && !isStreaming && (
                                    <div className="mt-3 pt-3 border-t border-border flex gap-2">
                                        {msg.excelData ? (
                                            <button
                                                onClick={() => handleExportExcel(msg.id, msg.excelData!)}
                                                disabled={exportLoading === msg.id}
                                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-primary text-white rounded hover:opacity-90 transition-opacity disabled:opacity-50"
                                            >
                                                {exportLoading === msg.id ? (
                                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                ) : (
                                                    <FileSpreadsheet className="w-3.5 h-3.5" />
                                                )}
                                                Export Excel
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => handleExportFromText(msg.id, msg.content)}
                                                disabled={exportLoading === msg.id}
                                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-muted-foreground border border-border rounded hover:bg-accent hover:text-foreground transition-colors disabled:opacity-50"
                                            >
                                                {exportLoading === msg.id ? (
                                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                ) : (
                                                    <Download className="w-3.5 h-3.5" />
                                                )}
                                                Export as Excel
                                            </button>
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
                            {isStreaming ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Send className="w-4 h-4" />
                            )}
                        </button>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-2 text-center">
                        AI-powered estimation • Export to Excel anytime
                    </p>
                </div>
            </div>
        </div>
    );
}

/**
 * Try to extract structured Excel data from AI response text.
 * Looks for JSON blocks, tables, or cost patterns.
 */
function tryExtractExcelData(text: string): ExcelExportData | null {
    // Try JSON block first
    const jsonMatch = text.match(/```json\s*([\s\S]*?)```/);
    if (jsonMatch) {
        try {
            const parsed = JSON.parse(jsonMatch[1]);
            if (parsed.project_name && parsed.displays) return parsed;
        } catch { /* not valid JSON */ }
    }

    // Try to find cost patterns in text
    const displays: ExcelExportData["displays"] = [];
    const services: ExcelExportData["services"] = [];

    // Match patterns like "Scoreboard: $150,000" or "20x10 at 4mm — $156,084"
    const costLines = text.match(/(.+?)[\s:—\-]+\$[\d,]+(?:\.\d+)?/g);
    if (!costLines || costLines.length === 0) return null;

    let projectName = "AI Estimate";
    // Try to find project name
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
            services.push({
                category: name,
                cost: amount,
                selling_price: amount,
                margin_dollars: 0,
                margin_pct: 0,
            });
        } else if (!/total|grand|margin|selling|subtotal|cost basis/i.test(name)) {
            displays.push({
                name,
                cost: amount,
                selling_price: amount,
                margin_dollars: 0,
                margin_pct: 0,
            });
        }

        // Track totals
        if (/selling|total.*price/i.test(name)) {
            totalSelling = amount;
        } else if (/total.*cost|cost.*basis/i.test(name)) {
            totalCost = amount;
        }
    }

    if (displays.length === 0) return null;

    const grandCost = totalCost || displays.reduce((s, d) => s + d.cost, 0) + services.reduce((s, sv) => s + sv.cost, 0);
    const grandSelling = totalSelling || grandCost;
    const grandMargin = grandSelling - grandCost;
    const grandMarginPct = grandSelling > 0 ? Math.round((grandMargin / grandSelling) * 100 * 10) / 10 : 0;

    return {
        project_name: projectName,
        displays,
        services,
        grand_total_cost: grandCost,
        grand_total_selling: grandSelling,
        grand_total_margin: grandMargin,
        grand_total_margin_pct: grandMarginPct,
        date: new Date().toISOString().split("T")[0],
        estimate_type: "Budget Estimate",
        currency: "USD",
    };
}

/**
 * Build a minimal Excel payload from raw text when no structured data is found.
 */
function buildExcelPayloadFromText(content: string): ExcelExportData {
    const extracted = tryExtractExcelData(content);
    if (extracted) return extracted;

    // Fallback: wrap the entire response as a single display
    return {
        project_name: "AI Chat Export",
        displays: [
            {
                name: "Estimate from Chat",
                cost: 0,
                selling_price: 0,
                details: { "AI Response": content.slice(0, 500) },
            },
        ],
        date: new Date().toISOString().split("T")[0],
        estimate_type: "Budget Estimate",
        currency: "USD",
    };
}
