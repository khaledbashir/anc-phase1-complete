"use client";

import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, MessageCircle, CheckCircle2 } from "lucide-react";
import { useAnnotations } from "./useAnnotations";
import { useScreenCapture } from "./useScreenCapture";
import AnnotationPin from "./AnnotationPin";
import AnnotationPopover from "./AnnotationPopover";
import AnnotationSidebar from "./AnnotationSidebar";
import ShareChangeRequestForm from "./ShareChangeRequestForm";

interface ShareAnnotatorProps {
  shareHash: string;
  children: React.ReactNode;
}

export default function ShareAnnotator({
  shareHash,
  children,
}: ShareAnnotatorProps) {
  const [mode, setMode] = useState<"view" | "review">("view");
  const [activeAnnotationId, setActiveAnnotationId] = useState<string | null>(
    null
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [requesterName, setRequesterName] = useState("");
  const [requesterEmail, setRequesterEmail] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const {
    annotations,
    addPin,
    updateTranscript,
    setAudio,
    setScreenshot,
    saveAnnotation,
    removeAnnotation,
  } = useAnnotations();

  const { captureArea } = useScreenCapture();

  const handleContainerClick = useCallback(
    async (e: React.MouseEvent<HTMLDivElement>) => {
      if (mode !== "review") return;

      // Don't create pin if clicking on an existing pin or popover
      const target = e.target as HTMLElement;
      if (
        target.closest("[data-annotation-pin]") ||
        target.closest("[data-annotation-popover]")
      ) {
        return;
      }

      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const x = (e.clientX - rect.left + container.scrollLeft) / container.scrollWidth;
      const y = (e.clientY - rect.top + container.scrollTop) / container.scrollHeight;

      const id = addPin(x, y);
      setActiveAnnotationId(id);

      // Auto-capture screenshot around the pin
      const screenshot = await captureArea(container, x, y);
      if (screenshot) {
        setScreenshot(id, screenshot);
      }
    },
    [mode, addPin, captureArea, setScreenshot]
  );

  const handleSaveAnnotation = useCallback(
    (id: string, transcript: string) => {
      updateTranscript(id, transcript);
      saveAnnotation(id);
      setActiveAnnotationId(null);
    },
    [updateTranscript, saveAnnotation]
  );

  const handleDiscardAnnotation = useCallback(
    (id: string) => {
      removeAnnotation(id);
      setActiveAnnotationId(null);
    },
    [removeAnnotation]
  );

  const handlePinClick = useCallback((id: string) => {
    setActiveAnnotationId((prev) => (prev === id ? null : id));
  }, []);

  const handleSubmitAll = useCallback(async () => {
    if (!requesterName.trim()) return;
    setIsSubmitting(true);

    try {
      const savedAnnotations = annotations.filter((a) => a.status === "saved");
      const sessionId = crypto.randomUUID();

      // Convert audio blobs to base64
      const payload = await Promise.all(
        savedAnnotations.map(async (a) => {
          let audioData: string | null = null;
          if (a.audioBlob) {
            audioData = await new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result as string);
              reader.readAsDataURL(a.audioBlob!);
            });
          }
          return {
            pinX: a.pinX,
            pinY: a.pinY,
            pinNumber: a.pinNumber,
            transcript: a.transcript,
            message: a.transcript,
            audioData,
            audioDuration: a.audioDuration,
            screenshotData: a.screenshotDataUrl,
          };
        })
      );

      const res = await fetch(`/api/share/${shareHash}/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: requesterName.trim(),
          email: requesterEmail.trim() || undefined,
          annotations: payload,
          sessionId,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Submission failed");
      }

      setIsSubmitted(true);
    } catch (err) {
      console.error("[ShareAnnotator] Submit failed:", err);
      // Could add toast/error state here
    } finally {
      setIsSubmitting(false);
    }
  }, [annotations, requesterName, requesterEmail, shareHash]);

  const activeAnnotation = annotations.find(
    (a) => a.id === activeAnnotationId
  );

  // Submitted confirmation
  if (isSubmitted) {
    return (
      <div>
        {children}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-10 w-full max-w-[850px] mx-auto rounded-2xl border border-emerald-200 bg-emerald-50 px-6 py-8 text-center"
        >
          <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-500" />
          <div className="mt-3 text-sm font-bold text-emerald-800">
            Feedback Submitted
          </div>
          <div className="mt-1 text-xs text-emerald-600">
            {annotations.filter((a) => a.status === "saved").length} annotations
            sent to the ANC team. Thank you!
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Floating Mode Toggle */}
      <div className="sticky top-4 z-50 flex justify-center mb-4">
        <div className="inline-flex items-center rounded-full border border-slate-200 bg-white p-1 shadow-lg">
          <button
            type="button"
            onClick={() => {
              setMode("view");
              setActiveAnnotationId(null);
            }}
            className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold transition-all ${
              mode === "view"
                ? "bg-slate-900 text-white shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <Eye className="h-3.5 w-3.5" />
            View Mode
          </button>
          <button
            type="button"
            onClick={() => setMode("review")}
            className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold transition-all ${
              mode === "review"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <MessageCircle className="h-3.5 w-3.5" />
            Annotate Mode
            {annotations.length > 0 && (
              <span className="ml-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-white/20 px-1 text-[10px]">
                {annotations.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Proposal Container — with click overlay in review mode */}
      <div
        ref={containerRef}
        onClick={handleContainerClick}
        className={`relative ${
          mode === "review" ? "cursor-crosshair" : ""
        }`}
        style={mode === "review" ? { marginRight: "320px" } : undefined}
      >
        {children}

        {/* Annotation Pins */}
        <AnimatePresence>
          {mode === "review" &&
            annotations.map((a) => (
              <AnnotationPin
                key={a.id}
                pinNumber={a.pinNumber}
                x={a.pinX}
                y={a.pinY}
                isActive={activeAnnotationId === a.id}
                onClick={() => handlePinClick(a.id)}
              />
            ))}
        </AnimatePresence>

        {/* Active Popover */}
        <AnimatePresence>
          {activeAnnotation && activeAnnotation.status !== "saved" && (
            <AnnotationPopover
              key={activeAnnotation.id}
              annotation={activeAnnotation}
              containerRect={
                containerRef.current?.getBoundingClientRect() ?? null
              }
              onSave={handleSaveAnnotation}
              onSetAudio={setAudio}
              onDiscard={handleDiscardAnnotation}
            />
          )}
        </AnimatePresence>
      </div>

      {/* Right Sidebar */}
      <AnimatePresence>
        {mode === "review" && (
          <AnnotationSidebar
            annotations={annotations}
            onRemove={handleDiscardAnnotation}
            onPinClick={handlePinClick}
            onSubmit={handleSubmitAll}
            isSubmitting={isSubmitting}
            requesterName={requesterName}
            requesterEmail={requesterEmail}
            onNameChange={setRequesterName}
            onEmailChange={setRequesterEmail}
          />
        )}
      </AnimatePresence>

      {/* Legacy text form — shown only in View Mode */}
      {mode === "view" && <ShareChangeRequestForm shareHash={shareHash} />}
    </div>
  );
}
