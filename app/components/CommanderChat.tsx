"use client"

import { useState } from "react"
import { Send, Bot, User, Loader2, PanelLeftClose, PanelLeftOpen } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

// Contexts
import { useProposalContext } from "@/contexts/ProposalContext";

export function CommanderChat() {
  const { applyCommand } = useProposalContext();

  const [isCollapsed, setIsCollapsed] = useState(false)
  const [input, setInput] = useState("")

  // Local state for messages (replacing complex hook for now)
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant', content: string, gaps?: string[] }[]>([
    { role: "assistant", content: "Commander ready. I'm your Senior Estimator partner. Drop an RFP or tell me what we're building today." }
  ])
  const [isLoading, setIsLoading] = useState(false)

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!input.trim()) return

    const userMsg = input
    setInput("")
    setMessages(prev => [...prev, { role: "user", content: userMsg }])
    setIsLoading(true)

    try {
      // Call the API route with history
      // include workspace/thread context if available
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
        setMessages(prev => [...prev, { role: "assistant", content: `❌ ${errorMsg}` }])
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

      // Handle direct actions
      if (data?.data?.type === "action" && data.data.action) {
        const action = data.data.action;
        applyCommand(action);
        setMessages(prev => [...prev, { role: "assistant", content: `✅ I've updated the proposal: ${action.type}. The "Advanced" math is applied.` }])
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
        setMessages(prev => [...prev, { role: "assistant", content: JSON.stringify(data) }])
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
        "group relative flex h-screen flex-col border-r bg-zinc-950 transition-all duration-300 ease-in-out",
        isCollapsed ? "w-16" : "w-[300px]"
      )}
    >
      {/* Header */}
      <div className="flex h-14 items-center justify-between px-4 border-b border-zinc-900">
        {!isCollapsed && <span className="font-semibold text-zinc-100">Commander</span>}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-zinc-400 hover:text-zinc-100"
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
                  <Avatar className="h-8 w-8 border border-zinc-800">
                    <AvatarFallback className="bg-zinc-900 text-zinc-400">
                      {m.role === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col gap-2 max-w-[85%]">
                    <div className={cn(
                      "rounded-lg px-3 py-2 text-sm shadow-sm",
                      m.role === "user"
                        ? "bg-[#0A52EF] text-white self-end"
                        : "bg-zinc-900 border border-zinc-800 text-zinc-300"
                    )}>
                      {m.content}
                    </div>
                    {m.gaps && m.gaps.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-1">
                        {m.gaps.map(gap => (
                          <Button
                            key={gap}
                            variant="outline"
                            size="sm"
                            className="text-[10px] h-6 bg-blue-900/20 border-blue-800 text-[#0A52EF]/70 hover:bg-blue-800/40"
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
                <div className="flex items-center gap-2 text-zinc-500 pl-12">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span className="text-xs">Thinking...</span>
                </div>
              )}
            </div>
          </ScrollArea>
        ) : (
          <div className="flex flex-col items-center gap-4 py-4">
            {/* Collapsed State Icons */}
            <div className="h-8 w-8 rounded-full bg-zinc-900 flex items-center justify-center">
              <Bot className="h-4 w-4 text-zinc-400" />
            </div>
          </div>
        )}
      </div>

      {/* Footer / Input */}
      {!isCollapsed && (
        <div className="p-4 border-t border-zinc-900 bg-zinc-950">
          <form onSubmit={handleSendMessage} className="relative">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask or command..."
              className="bg-zinc-900 border-zinc-800 text-zinc-200 placeholder:text-zinc-600 focus-visible:ring-zinc-700 pr-10"
            />
            <Button
              type="submit"
              size="icon"
              variant="ghost"
              className="absolute right-1 top-1 h-8 w-8 hover:bg-zinc-800 text-zinc-400"
              disabled={isLoading}
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
          <div className="mt-2 text-[10px] text-zinc-600 text-center">
            Powered by ANC Intelligence
          </div>
        </div>
      )}
    </div>
  )
}

export default CommanderChat;
