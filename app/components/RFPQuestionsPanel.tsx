"use client";

import { useState, useEffect } from "react";
import { CheckCircle2, Circle, FileText, ChevronRight, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useProposalContext } from "@/contexts/ProposalContext";

interface RfpQuestion {
  id: string;
  question: string;
  answer: string | null;
  answered: boolean;
  order: number;
}

export function RFPQuestionsPanel() {
  const { proposal } = useProposalContext();
  const [questions, setQuestions] = useState<RfpQuestion[]>([]);
  const [unansweredQuestions, setUnansweredQuestions] = useState<RfpQuestion[]>([]);
  const [answeredQuestions, setAnsweredQuestions] = useState<RfpQuestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [previewPages, setPreviewPages] = useState(1);

  // Load questions on mount
  useEffect(() => {
    if (proposal?.id) {
      loadQuestions();
    }
  }, [proposal?.id]);

  const loadQuestions = async () => {
    if (!proposal?.id) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/rfp/questions/${proposal.id}`);
      const data = await res.json();

      if (data.ok) {
        setQuestions(data.allQuestions || []);
        setUnansweredQuestions(data.unansweredQuestions || []);
        setAnsweredQuestions(data.answeredQuestions || []);
        setProgress(data.progress || 0);
        setPreviewPages(data.answeredCount ? Math.ceil(data.answeredCount / 3) + 1 : 1);
      }
    } catch (e) {
      console.error("Failed to load questions:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !proposal?.id) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("proposalId", proposal.id);

    try {
      const res = await fetch("/api/rfp/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (data.ok) {
        loadQuestions(); // Reload questions after extraction
      } else {
        alert(`Failed to upload: ${data.error}`);
      }
    } catch (e) {
      console.error("Upload error:", e);
      alert("Failed to upload document");
    } finally {
      setUploading(false);
    }
  };

  const handleAnswer = async (questionId: string, answer: string) => {
    if (!proposal?.id) return;

    try {
      const res = await fetch("/api/rfp/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proposalId: proposal.id, questionId, answer }),
      });

      const data = await res.json();
      if (data.ok) {
        // Remove from unanswered, add to answered
        setUnansweredQuestions((prev) =>
          prev.filter((q) => q.id !== questionId)
        );
        setAnsweredQuestions((prev) => [...prev, data.question]);
        setProgress(data.progress);
        setPreviewPages(data.previewWillBePages);
      } else {
        alert(`Failed to save answer: ${data.error}`);
      }
    } catch (e) {
      console.error("Answer error:", e);
      alert("Failed to save answer");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-sm text-gray-500">Loading RFP questions...</div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="p-6 border border-dashed rounded-lg">
        <div className="text-center py-12">
          <FileText className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold mb-2">Upload RFP Document</h3>
          <p className="text-sm text-gray-500 mb-4">
            Upload your RFP and AI will extract all questions that need to be answered.
          </p>
          <label className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md cursor-pointer hover:bg-primary/90">
            <input
              type="file"
              className="hidden"
              accept=".pdf,.doc,.docx,.txt"
              onChange={handleFileUpload}
              disabled={uploading}
            />
            {uploading ? "Uploading..." : "Choose RFP File"}
          </label>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div>
          <h3 className="font-semibold">RFP Questions</h3>
          <p className="text-sm text-gray-500">
            {answeredQuestions.length} / {questions.length} answered
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-sm text-gray-500">{progress}%</span>
        </div>
      </div>

      {/* Progress banner */}
      {progress > 0 && progress < 100 && (
        <div className="bg-blue-50 border-b border-blue-100 px-4 py-2">
          <p className="text-sm text-blue-700">
            📄 Preview: Currently {previewPages} page{previewPages > 1 ? "s" : ""}
            {progress === 100 && " (complete!)"}
          </p>
        </div>
      )}

      {/* Questions List */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-3">
          {/* Unanswered Questions Only - Smart Filter */}
          {unansweredQuestions.length > 0 && (
            <div className="space-y-3">
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Pending ({unansweredQuestions.length})
              </div>
              {unansweredQuestions.map((q) => (
                <QuestionCard
                  key={q.id}
                  question={q}
                  onAnswer={handleAnswer}
                />
              ))}
            </div>
          )}

          {/* Answered Questions - Collapsible */}
          {answeredQuestions.length > 0 && (
            <AnsweredSection
              questions={answeredQuestions}
              onReopen={(id) => {
                setAnsweredQuestions((prev) => prev.filter((q) => q.id !== id));
                setUnansweredQuestions((prev) => [...prev, answeredQuestions.find((q) => q.id === id)!]);
              }}
            />
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

function QuestionCard({
  question,
  onAnswer,
}: {
  question: RfpQuestion;
  onAnswer: (id: string, answer: string) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const [answer, setAnswer] = useState("");

  const handleSubmit = () => {
    if (answer.trim()) {
      onAnswer(question.id, answer);
    }
  };

  return (
    <div className="border rounded-lg overflow-hidden">
      {/* Question Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 p-3 text-left hover:bg-gray-50 transition-colors"
      >
        <Circle className="w-5 h-5 text-gray-400 flex-shrink-0" />
        <span className="flex-1 text-sm font-medium">{question.question}</span>
        {expanded ? (
          <ChevronDown className="w-4 h-4 text-gray-400" />
        ) : (
          <ChevronRight className="w-4 h-4 text-gray-400" />
        )}
      </button>

      {/* Answer Input */}
      {expanded && (
        <div className="border-t p-3 space-y-3 bg-gray-50">
          <Textarea
            placeholder="Type your answer here..."
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            rows={4}
            className="resize-none"
          />
          <div className="flex justify-end">
            <Button
              onClick={handleSubmit}
              disabled={!answer.trim()}
              size="sm"
            >
              Submit Answer
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function AnsweredSection({
  questions,
  onReopen,
}: {
  questions: RfpQuestion[];
  onReopen: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 p-2 text-left hover:bg-gray-50 rounded-md transition-colors"
      >
        <CheckCircle2 className="w-4 h-4 text-green-600" />
        <span className="text-sm font-medium text-gray-600">
          Answered ({questions.length})
        </span>
        {expanded ? (
          <ChevronDown className="w-4 h-4 text-gray-400 ml-auto" />
        ) : (
          <ChevronRight className="w-4 h-4 text-gray-400 ml-auto" />
        )}
      </button>

      {expanded && (
        <div className="mt-2 space-y-2 ml-2 pl-4 border-l-2 border-green-200">
          {questions.map((q) => (
            <div key={q.id} className="group">
              <div className="text-sm text-gray-600 font-medium">
                {q.question}
              </div>
              <div className="text-sm text-gray-500 mt-1 bg-white p-2 rounded border">
                {q.answer || "No answer"}
              </div>
              <button
                onClick={() => onReopen(q.id)}
                className="text-xs text-blue-600 hover:underline mt-1 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                Edit answer
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
