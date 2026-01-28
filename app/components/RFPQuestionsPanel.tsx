"use client";

import { useState } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { useProposalContext } from "@/contexts/ProposalContext";
import { anythingLLMService } from "@/services/AnythingLLMService";

// ShadCn
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Loader2, Send, FileUp, Sparkles, Bot, AlertTriangle, Paperclip } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import ThemeSwitcher from "./reusables/ThemeSwitcher";

export const RFPQuestionsPanel = () => {
  const { control, setValue } = useFormContext();
  const {
    aiMessages,
    executeAiCommand,
    aiLoading
  } = useProposalContext();

  // Use project-specific slug
  const aiWorkspaceSlug = useWatch({
    name: "details.aiWorkspaceSlug",
    control
  });

  // We also watch proposal ID to enable features only when a project exists
  const proposalId = useWatch({
    name: "details.proposalId",
    control
  });

  const [input, setInput] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Initial Questions to prompt the user (Step 3 Gap Fill)
  const SUGGESTED_QUESTIONS = [
    "What are the screen quantities and sizes?",
    "Extract the client's preferred payment terms.",
    "List any union labor requirements.",
    "Does the RFP require a 1.5% Performance Bond?"
  ];

  const handleSend = async () => {
    if (!input.trim()) return;
    const msg = input;
    setInput("");
    await executeAiCommand(msg);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadError(null);

    // Upload Logic:
    // 1. In a real scenario, we'd upload to our server -> Get URL -> Send to AnythingLLM
    // 2. For now, we simulate the effect for the Linear Wizard Demo
    try {
      // Simulate upload delay
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Trigger AI analysis automatically
      executeAiCommand("I have uploaded the RFP. Please extract the screen specifications and any union labor requirements.");

      setIsUploading(false);
    } catch (err: any) {
      setUploadError("Upload failed: " + err.message);
      setIsUploading(false);
    }
  };

  return (
    <div className="flex flex-col h-[600px] bg-zinc-950/30 rounded-lg border border-zinc-800/50 overflow-hidden font-sans">

      {/* Status Header */}
      <div className="p-3 border-b border-zinc-800/50 flex items-center justify-between bg-zinc-900/80 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-full ${aiWorkspaceSlug ? 'bg-green-500/10' : 'bg-zinc-800'}`}>
            <Bot className={`w-4 h-4 ${aiWorkspaceSlug ? 'text-green-500' : 'text-zinc-500'}`} />
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-zinc-300">ANC Intelligence</span>
            <span className="text-[10px] text-zinc-500 font-mono text-ellipsis overflow-hidden max-w-[150px]">
              {aiWorkspaceSlug || "Waiting for upload..."}
            </span>
          </div>
        </div>
        {aiLoading && <Loader2 className="w-3 h-3 animate-spin text-indigo-400" />}
      </div>

      {/* Chat Area */}
      <ScrollArea className="flex-1 p-4 bg-zinc-950/20">
        <div className="space-y-6">
          {/* Welcome Message */}
          {aiMessages.length === 0 && (
            <div className="text-center space-y-4 mt-8 opacity-60">
              <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 flex items-center justify-center mx-auto ring-1 ring-indigo-500/20">
                <Sparkles className="w-8 h-8 text-indigo-400" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-medium text-zinc-200">Senior Estimator AI Ready</h3>
                <p className="text-xs text-zinc-500 max-w-[200px] mx-auto">
                  Upload an RFP to begin extraction. I will flag risky terms like "Union Labor".
                </p>
              </div>
            </div>
          )}

          {aiMessages.map((m: any, i: number) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2 duration-300`}>
              <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-sm ${m.role === 'user'
                ? 'bg-[#0A52EF] text-white rounded-br-none'
                : 'bg-zinc-900 text-zinc-300 border border-zinc-800 rounded-bl-none'
                }`}>
                {/* Render newlines properly */}
                <div className="leading-relaxed whitespace-pre-wrap">{m.content}</div>
              </div>
            </div>
          ))}

          {aiLoading && (
            <div className="flex justify-start animate-in fade-in duration-300">
              <div className="bg-zinc-900 rounded-2xl rounded-bl-none px-4 py-3 border border-zinc-800">
                <div className="flex gap-1.5 items-center h-5">
                  <div className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Suggestions (Gap Fill) */}
      <div className="p-2 bg-zinc-900/30 border-t border-zinc-800/30 backdrop-blur-sm">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide no-scrollbar mask-linear-fade">
          {SUGGESTED_QUESTIONS.map((q, i) => (
            <button
              key={i}
              onClick={() => executeAiCommand(q)}
              disabled={aiLoading}
              className="whitespace-nowrap px-3 py-1.5 rounded-full bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700/50 hover:border-zinc-600 text-[10px] text-zinc-400 hover:text-zinc-200 transition-all cursor-pointer flex-shrink-0"
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* Input Area */}
      <div className="p-3 bg-zinc-900 border-t border-zinc-800">
        {uploadError && (
          <Alert variant="destructive" className="mb-2 py-2 text-xs">
            <AlertTriangle className="h-3 w-3" />
            <AlertTitle className="text-xs">Upload Error</AlertTitle>
            <AlertDescription className="text-xs">{uploadError}</AlertDescription>
          </Alert>
        )}

        <div className="flex gap-2 items-end">
          <div className="relative pb-1">
            <input
              type="file"
              id="rfp-upload-input"
              className="hidden"
              accept=".pdf,.docx,.txt"
              onChange={handleUpload}
              disabled={isUploading}
            />
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0 h-9 w-9 rounded-full text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
              onClick={() => document.getElementById('rfp-upload-input')?.click()}
              disabled={isUploading}
            >
              {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Paperclip className="w-4 h-4" />}
            </Button>
          </div>

          <div className="flex-1 relative">
            <Input
              placeholder={proposalId ? "Ask a question..." : "Create workspace..."}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              disabled={aiLoading}
              className="bg-zinc-950 border-zinc-800 focus-visible:ring-indigo-500/50 focus-visible:border-indigo-500/50 h-10 pr-10 text-sm"
            />
            <Button
              size="icon"
              variant="ghost"
              onClick={handleSend}
              disabled={!input.trim() || aiLoading}
              className="absolute right-1 top-1 h-8 w-8 rounded-md text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
