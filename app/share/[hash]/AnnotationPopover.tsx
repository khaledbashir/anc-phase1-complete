"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Check, X, Image as ImageIcon } from "lucide-react";
import VoiceRecorder from "./VoiceRecorder";
import type { Annotation } from "./useAnnotations";

interface AnnotationPopoverProps {
  annotation: Annotation;
  containerRect: DOMRect | null;
  onSave: (id: string, transcript: string) => void;
  onSetAudio: (id: string, blob: Blob, duration: number) => void;
  onDiscard: (id: string) => void;
}

export default function AnnotationPopover({
  annotation,
  containerRect,
  onSave,
  onSetAudio,
  onDiscard,
}: AnnotationPopoverProps) {
  const [localTranscript, setLocalTranscript] = useState(annotation.transcript);

  const handleVoiceComplete = useCallback(
    (result: { transcript: string; audioBlob: Blob | null; duration: number }) => {
      setLocalTranscript(result.transcript);
      if (result.audioBlob) {
        onSetAudio(annotation.id, result.audioBlob, result.duration);
      }
    },
    [annotation.id, onSetAudio]
  );

  const handleSave = () => {
    if (!localTranscript.trim()) return;
    onSave(annotation.id, localTranscript.trim());
  };

  // Calculate popover position — anchor to pin but keep within viewport
  const pinXPercent = annotation.pinX * 100;
  const pinYPercent = annotation.pinY * 100;

  // Decide if popover should go left or right of pin
  const goLeft = annotation.pinX > 0.55;
  const goUp = annotation.pinY > 0.65;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: 8 }}
      transition={{ duration: 0.15 }}
      className="absolute z-30 w-[320px] rounded-2xl border border-slate-200 bg-white shadow-2xl"
      style={{
        left: goLeft ? `calc(${pinXPercent}% - 340px)` : `calc(${pinXPercent}% + 20px)`,
        top: goUp ? `calc(${pinYPercent}% - 200px)` : `calc(${pinYPercent}% - 20px)`,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white">
            {annotation.pinNumber}
          </span>
          <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500">
            New Feedback
          </span>
        </div>
        <button
          type="button"
          onClick={() => onDiscard(annotation.id)}
          className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Body */}
      <div className="px-4 py-3">
        <VoiceRecorder
          onComplete={handleVoiceComplete}
          initialTranscript={annotation.transcript}
        />

        {/* Screenshot preview */}
        {annotation.screenshotDataUrl && (
          <div className="mt-3 flex items-center gap-2">
            <ImageIcon className="h-3.5 w-3.5 text-slate-400" />
            <span className="text-[10px] text-slate-400">Context captured</span>
            <img
              src={annotation.screenshotDataUrl}
              alt="Context"
              className="ml-auto h-10 w-16 rounded border border-slate-200 object-cover"
            />
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-4 py-2.5">
        <button
          type="button"
          onClick={() => onDiscard(annotation.id)}
          className="rounded-xl px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-100"
        >
          Discard
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={!localTranscript.trim()}
          className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-1.5 text-xs font-bold text-white shadow-sm transition-all hover:bg-blue-700 disabled:opacity-40"
        >
          <Check className="h-3.5 w-3.5" />
          Save
        </button>
      </div>
    </motion.div>
  );
}
