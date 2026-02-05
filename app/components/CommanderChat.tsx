"use client"

import { useState, useRef, useEffect } from "react"
import { Send, Bot, User, Loader2, PanelLeftClose, PanelLeftOpen } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { SpecSheetCard } from "@/app/components/proposal/SpecSheetCard"

// Contexts
import { useProposalContext } from "@/contexts/ProposalContext";

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  gaps?: string[];
  specResults?: { results: any[]; query: Record<string, unknown> };
}

export function CommanderChat() {
  const { applyCommand } = useProposalContext();

  const [isCollapsed, setIsCollapsed] = useState(false)
  const [input, setInput] = useState("")
  const scrollRef = useRef<HTMLDivElement>(null)

  // Local state for messages
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "assistant", content: "Commander ready. I'm your Senior Estimator partner. Drop an RFP or tell me what we're building today." }
  ])
  const [isLoading, setIsLoading] = useState(false)

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [messages, isLoading])

  const handleAddScreenFromSpec = (result: any) => {
    applyCommand({
      type: "ADD_SCREEN",
      payload: {
        name: result.product.displayName,
        productType: `${result.product.manufacturer} ${result.product.productFamily}`,
        pitch: result.product.pixelPitch,
        width: result.screenDimensions.widthFt,
        height: result.screenDimensions.heightFt,
        quantity: result.quantity,
        costPerSqFt: 120, // Default — real pricing from ManufacturerProduct.costPerSqFt when available
      },
    })
    setMessages(prev => [...prev, {
      role: "assistant",
      content: `Added ${result.product.displayName} (${result.screenDimensions.widthFt}' x ${result.screenDimensions.heightFt}') to the proposal.`,
    }])
  }

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!input.trim()) return

    const userMsg = input
    setInput("")
    setMessages(prev => [...prev, { role: "user", content: userMsg }])
    setIsLoading(true)

    try {
      // Call the API route with history
      const aiWorkspaceSlug = typeof window !== "undefined" ? localStorage.getItem("aiWorkspaceSlug") : null;
      const aiThreadSlug = typeof window !== "undefined" ? localStorage.getItem("aiThreadId") : null;

      const res = await fetch("/api/command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMsg,
          history: messages.map((m) => ({ role: m.role, content: m.content })),
          workspace: aiWorkspaceSlug ?? undefined,
          threadSlug: aiThreadSlug ?? undefined,
        }),
      })

      if (!res.ok) {
        const errorText = await res.text()
        let errorMsg = `API Error ${res.status}: ${errorText}`
        try {
          const errorJson = JSON.parse(errorText)
          errorMsg = errorJson.error || errorMsg
        } catch (e) {
          // Use raw text
        }
        setMessages(prev => [...prev, { role: "assistant", content: `Error: ${errorMsg}` }])
        setIsLoading(false)
        return
      }

      const data = await res.json()

      if (data?.data?.action?.type === "INCOMPLETE_SPECS") {
        const payload = data.data.action.payload;
        setMessages(prev => [...prev, {
          role: "assistant",
          content: payload.message || "I need a few more details to finalize this configuration.",
          gaps: payload.missingFields
        }])
        return
      }

      // Handle SPEC_QUERY results — render SpecSheetCard
      if (data?.data?.action?.type === "SPEC_QUERY") {
        const payload = data.data.action.payload;
        const resultData = payload.results || {};
        const matches = resultData.matches || [];
        setMessages(prev => [...prev, {
          role: "assistant",
          content: matches.length > 0
            ? `Found ${matches.length} matching product${matches.length > 1 ? "s" : ""}:`
            : "No products match your criteria.",
          specResults: matches.length > 0 ? { results: matches, query: payload.query } : undefined,
        }])
        return
      }

      // Handle direct actions
      if (data?.data?.type === "action" && data.data.action) {
        const action = data.data.action;
        applyCommand(action);
        setMessages(prev => [...prev, { role: "assistant", content: `Updated the proposal: ${action.type}. The "Advanced" math is applied.` }])
        return
      }

      // Plain text fallback
      else if (data?.text) {
        setMessages(prev => [...prev, { role: "assistant", content: data.text }])
        try {
          const parsed = JSON.parse(data.text)
          if (parsed && parsed.type) {
            applyCommand(parsed)
          }
        } catch (e) { }
      }

      // Fallback to raw object
      else if (data && typeof data === "object") {
        const textResponse = data?.data?.textResponse || data?.data?.response || "";
        setMessages(prev => [...prev, { role: "assistant", content: textResponse || JSON.stringify(data) }])
      }

      else {
        setMessages(prev => [...prev, { role: "assistant", content: "No response from controller" }])
      }
    } catch (err) {
      console.error("Commander send error:", err)
      setMessages(prev => [...prev, { role: "assistant", content: "Network error" }])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div
      className={cn(
        "group relative flex h-screen flex-col border-r bg-background transition-all duration-300 ease-in-out",
        isCollapsed ? "w-16" : "w-[300px]"
      )}
    >
      {/* Header */}
      <div className="flex h-14 items-center justify-between px-4 border-b border-border">
        {!isCollapsed && <span className="font-semibold text-foreground">Commander</span>}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
          onClick={() => setIsCollapsed(!isCollapsed)}
        >
          {isCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
        </Button>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-hidden">
        {!isCollapsed ? (
          <ScrollArea className="h-full px-4 py-4">
            <div className="flex flex-col gap-6">
              {messages.map((m, i) => (
                <div key={i} className={cn("flex gap-3", m.role === "user" ? "flex-row-reverse" : "")}>
                  <Avatar className="h-8 w-8 border border-border shrink-0">
                    <AvatarFallback className="bg-muted text-muted-foreground">
                      {m.role === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col gap-2 max-w-[85%] min-w-0">
                    <div className={cn(
                      "rounded-lg px-3 py-2 text-sm shadow-sm",
                      m.role === "user"
                        ? "bg-[#0A52EF] text-white self-end"
                        : "bg-card border border-border text-foreground"
                    )}>
                      {m.content}
                    </div>

                    {/* Spec Query Results */}
                    {m.specResults && (
                      <SpecSheetCard
                        results={m.specResults.results}
                        query={m.specResults.query}
                        onAddScreen={handleAddScreenFromSpec}
                      />
                    )}

                    {/* Gap fill buttons */}
                    {m.gaps && m.gaps.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-1">
                        {m.gaps.map(gap => (
                          <Button
                            key={gap}
                            variant="outline"
                            size="sm"
                            className="text-[10px] h-6 bg-[#0A52EF]/10 border-[#0A52EF]/30 text-[#0A52EF]/70 hover:bg-[#0A52EF]/20"
                            onClick={() => setInput(`The ${gap} is `)}
                          >
                            Set {gap}
                          </Button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex items-center gap-2 text-muted-foreground pl-12">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span className="text-xs">Thinking...</span>
                </div>
              )}
              <div ref={scrollRef} />
            </div>
          </ScrollArea>
        ) : (
          <div className="flex flex-col items-center gap-4 py-4">
            {/* Collapsed State Icons */}
            <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
              <Bot className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>
        )}
      </div>

      {/* Footer / Input */}
      {!isCollapsed && (
        <div className="p-4 border-t border-border bg-background">
          <form onSubmit={handleSendMessage} className="relative">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask or command..."
              className="bg-background border-input text-foreground placeholder:text-muted-foreground focus-visible:ring-offset-background pr-10"
            />
            <Button
              type="submit"
              size="icon"
              variant="ghost"
              className="absolute right-1 top-1 h-8 w-8 hover:bg-accent text-muted-foreground"
              disabled={isLoading}
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
          <div className="mt-2 text-[10px] text-muted-foreground text-center">
            Powered by ANC Intelligence
          </div>
        </div>
      )}
    </div>
  )
}

export default CommanderChat;
