"use client";

import { useState } from "react";
import { useFormContext } from "react-hook-form";

// Components
import ProposalForm from "@/app/components/invoice/ProposalForm";
import PdfViewer from "@/app/components/invoice/actions/PdfViewer";
import ActionToolbar from "@/app/components/ActionToolbar";

// ShadCn
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

// Context
import { useProposalContext } from "@/contexts/ProposalContext";
import { useTranslationContext } from "@/contexts/TranslationContext";

// Icons
import { Send, Sparkles, Download, Share2 } from "lucide-react";

// Types
import { ProposalType } from "@/types";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

const ProposalPage = () => {
  const { handleSubmit, setValue } = useFormContext<ProposalType>();
  const { _t } = useTranslationContext();
  const { onFormSubmit, applyCommand, activeTab, setActiveTab } = useProposalContext();

  const [projectName, setProjectName] = useState("Untitled Project");
  const [commandInput, setCommandInput] = useState("");
  const [commandLoading, setCommandLoading] = useState(false);
  const [commandHistory, setCommandHistory] = useState<ChatMessage[]>([]);
  const [showCommandHistory, setShowCommandHistory] = useState(false);

  const handleCommandSubmit = async () => {
    if (!commandInput.trim()) return;

    const userMsg: ChatMessage = { id: `u-${Date.now()}`, role: "user", content: commandInput };
    setCommandHistory((h) => [...h, userMsg]);
    setCommandInput("");
    setCommandLoading(true);

    try {
      const res = await fetch("/api/command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMsg.content,
          history: commandHistory.map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      const data = await res.json();

      let responseText = "";

      if (data?.data) {
        const resp = data.data;
        if (resp.type === "textResponse" && resp.textResponse) {
          responseText = resp.textResponse;
          try {
            const parsed = JSON.parse(responseText);
            if (parsed && parsed.type) {
              applyCommand(parsed);
              
              // Switch tab based on command type
              if (parsed.type === "ADD_SCREEN" || parsed.type === "SET_MARGIN") {
                setActiveTab("audit");
              } else if (parsed.type === "UPDATE_CLIENT") {
                setActiveTab("client");
              }
            }
          } catch (e) {}
        }
      }

      if (responseText) {
        setCommandHistory((h) => [...h, { id: `a-${Date.now()}`, role: "assistant", content: responseText }]);
      }
    } catch (err) {
      console.error("Command error:", err);
    } finally {
      setCommandLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col">
      {/* Top Navigation */}
      <nav className="h-16 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="h-full max-w-[1920px] mx-auto px-6 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#003366] flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="text-zinc-100 font-semibold text-lg">ANC</span>
          </div>

          {/* Editable Project Name */}
          <div className="flex-1 max-w-md mx-8">
            <Input
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              className="bg-transparent border-none text-center text-zinc-100 font-medium text-lg focus:ring-0 px-4"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              className="text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50"
            >
              <Share2 className="w-4 h-4 mr-2" />
              Share
            </Button>
            <Button
              size="sm"
              className="bg-[#003366] hover:bg-[#004080] text-white"
            >
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </div>
      </nav>

      {/* Main Canvas */}
      <div className="flex-1 max-w-[1920px] mx-auto w-full p-6">
        <Form {...useFormContext<ProposalType>()}>
          <form
            onSubmit={handleSubmit(onFormSubmit, (err) => console.log(err))}
            className="flex gap-6 h-full"
          >
            {/* Left: Proposal Editor (60%) */}
            <div className="flex-1 min-w-0">
              <div className="max-w-3xl mx-auto space-y-4">
                <ActionToolbar />
                <ProposalForm />
              </div>
            </div>

            {/* Right: Live PDF Preview (40%) */}
            <div className="w-[40%] min-w-[500px]">
              <div className="sticky top-24">
                <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl">
                  <div className="px-4 py-3 border-b border-zinc-800 bg-zinc-900/30">
                    <span className="text-zinc-400 text-sm font-medium">Live Preview</span>
                  </div>
                  <div className="p-4 bg-zinc-950/50">
                    <PdfViewer />
                  </div>
                </div>
              </div>
            </div>
          </form>
        </Form>
      </div>

      {/* Floating Command Bar */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 w-full max-w-2xl px-4">
        {/* Command History Popover */}
        {showCommandHistory && commandHistory.length > 0 && (
          <div className="mb-4 bg-zinc-900/95 border border-zinc-800 rounded-2xl backdrop-blur-xl shadow-2xl max-h-64 overflow-y-auto">
            <div className="p-4 space-y-3">
              {commandHistory.map((msg) => (
                <div
                  key={msg.id}
                  className={`p-3 rounded-xl ${
                    msg.role === "user"
                      ? "bg-[#003366]/20 text-zinc-200"
                      : "bg-zinc-800/50 text-zinc-400"
                  }`}
                >
                  <div className="text-xs text-zinc-500 mb-1">
                    {msg.role === "user" ? "You" : "AI Assistant"}
                  </div>
                  <div className="text-sm whitespace-pre-wrap">{msg.content}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Command Input */}
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-full backdrop-blur-xl shadow-2xl">
          <div className="flex items-center px-6 py-3 gap-4">
            <Sparkles className="w-5 h-5 text-zinc-500 flex-shrink-0" />
            <input
              type="text"
              value={commandInput}
              onChange={(e) => {
                setCommandInput(e.target.value);
                if (e.target.value && commandHistory.length > 0 && !showCommandHistory) {
                  setShowCommandHistory(true);
                } else if (!e.target.value && showCommandHistory) {
                  setShowCommandHistory(false);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleCommandSubmit();
                }
              }}
              onFocus={() => commandHistory.length > 0 && setShowCommandHistory(true)}
              placeholder="Ask questions or add screens (e.g., 'Add two 100x50 10mm screens')..."
              className="flex-1 bg-transparent border-none text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:ring-0 text-base"
            />
            <Button
              onClick={handleCommandSubmit}
              disabled={commandLoading || !commandInput.trim()}
              className="bg-[#003366] hover:bg-[#004080] text-white rounded-full p-2 h-10 w-10 flex items-center justify-center flex-shrink-0"
            >
              {commandLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProposalPage;
