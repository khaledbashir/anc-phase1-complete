"use client";

import { motion } from "framer-motion";
import { Trash2, MessageCircle, Send } from "lucide-react";
import type { Annotation } from "./useAnnotations";

interface AnnotationSidebarProps {
  annotations: Annotation[];
  onRemove: (id: string) => void;
  onPinClick: (id: string) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  requesterName: string;
  requesterEmail: string;
  onNameChange: (v: string) => void;
  onEmailChange: (v: string) => void;
}

export default function AnnotationSidebar({
  annotations,
  onRemove,
  onPinClick,
  onSubmit,
  isSubmitting,
  requesterName,
  requesterEmail,
  onNameChange,
  onEmailChange,
}: AnnotationSidebarProps) {
  const savedAnnotations = annotations.filter((a) => a.status === "saved");
  const totalAnnotations = annotations.length;

  return (
    <motion.div
      initial={{ x: 340, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 340, opacity: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="fixed right-0 top-0 z-40 flex h-screen w-[320px] flex-col border-l border-slate-200 bg-white shadow-2xl"
    >
      {/* Header */}
      <div className="border-b border-slate-100 px-5 py-4">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-4 w-4 text-blue-600" />
          <span className="text-xs font-bold uppercase tracking-widest text-slate-500">
            Client Review
          </span>
        </div>
        <p className="mt-1 text-[11px] text-slate-400">
          {totalAnnotations === 0
            ? "Click anywhere on the proposal to add feedback"
            : `${savedAnnotations.length} of ${totalAnnotations} saved`}
        </p>
      </div>

      {/* Feed */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {annotations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
              <MessageCircle className="h-5 w-5 text-slate-300" />
            </div>
            <p className="mt-3 text-xs font-medium text-slate-400">
              No annotations yet
            </p>
            <p className="mt-1 text-[10px] text-slate-300">
              Click on the proposal to pin your first comment
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {annotations.map((a) => (
              <motion.div
                key={a.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`group relative rounded-xl border p-3 transition-colors cursor-pointer ${
                  a.status === "saved"
                    ? "border-slate-200 bg-white hover:border-blue-200"
                    : "border-blue-200 bg-blue-50/50"
                }`}
                onClick={() => onPinClick(a.id)}
              >
                <div className="flex items-start gap-2.5">
                  {/* Pin number */}
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white">
                    {a.pinNumber}
                  </span>

                  <div className="min-w-0 flex-1">
                    {/* Status */}
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider ${
                          a.status === "saved"
                            ? "text-emerald-500"
                            : "text-blue-500"
                        }`}
                      >
                        {a.status === "saved" ? "Saved" : a.status === "recording" ? "Recording..." : "Editing"}
                      </span>
                      {a.audioDuration > 0 && (
                        <span className="text-[10px] text-slate-300">
                          {Math.floor(a.audioDuration / 60)}:{(a.audioDuration % 60).toString().padStart(2, "0")}
                        </span>
                      )}
                    </div>

                    {/* Transcript excerpt */}
                    <p className="mt-1 text-xs text-slate-600 line-clamp-3">
                      {a.transcript || (
                        <span className="italic text-slate-300">
                          No transcript yet
                        </span>
                      )}
                    </p>
                  </div>

                  {/* Delete */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemove(a.id);
                    }}
                    className="shrink-0 rounded-lg p-1 text-slate-300 opacity-0 transition-opacity hover:bg-red-50 hover:text-red-400 group-hover:opacity-100"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Screenshot thumbnail */}
                {a.screenshotDataUrl && (
                  <img
                    src={a.screenshotDataUrl}
                    alt="Context"
                    className="mt-2 h-12 w-full rounded-lg border border-slate-100 object-cover object-center"
                  />
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom: Submit Section */}
      <div className="border-t border-slate-100 px-4 py-4">
        {/* Name / Email */}
        <div className="flex flex-col gap-2">
          <input
            value={requesterName}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder="Your name *"
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs placeholder:text-slate-300 focus:border-blue-300 focus:ring-1 focus:ring-blue-200 focus:outline-none"
          />
          <input
            value={requesterEmail}
            onChange={(e) => onEmailChange(e.target.value)}
            placeholder="Email (optional)"
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs placeholder:text-slate-300 focus:border-blue-300 focus:ring-1 focus:ring-blue-200 focus:outline-none"
          />
        </div>

        <button
          type="button"
          onClick={onSubmit}
          disabled={
            isSubmitting ||
            savedAnnotations.length === 0 ||
            !requesterName.trim()
          }
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition-all hover:bg-blue-700 disabled:opacity-40"
        >
          {isSubmitting ? (
            <>
              <motion.div
                className="h-3.5 w-3.5 rounded-full border-2 border-white/30 border-t-white"
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}
              />
              Submitting...
            </>
          ) : (
            <>
              <Send className="h-3.5 w-3.5" />
              Submit All Feedback ({savedAnnotations.length})
            </>
          )}
        </button>
      </div>
    </motion.div>
  );
}
