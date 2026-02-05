"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, Square } from "lucide-react";
import { useSpeechRecognition } from "./useSpeechRecognition";

interface VoiceRecorderProps {
  onComplete: (result: {
    transcript: string;
    audioBlob: Blob | null;
    duration: number;
  }) => void;
  initialTranscript?: string;
}

export default function VoiceRecorder({
  onComplete,
  initialTranscript = "",
}: VoiceRecorderProps) {
  const {
    start: startSpeech,
    stop: stopSpeech,
    transcript: speechTranscript,
    interimTranscript,
    isListening,
    isSupported,
  } = useSpeechRecognition();

  const [isRecording, setIsRecording] = useState(false);
  const [editableText, setEditableText] = useState(initialTranscript);
  const [duration, setDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Sync speech transcript to editable text
  useEffect(() => {
    if (isListening && speechTranscript) {
      setEditableText(speechTranscript);
    }
  }, [speechTranscript, isListening]);

  const startRecording = useCallback(async () => {
    chunksRef.current = [];
    startTimeRef.current = Date.now();
    setDuration(0);
    setIsRecording(true);

    // Start speech recognition
    if (isSupported) {
      startSpeech();
    }

    // Start audio recording
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
          ? "audio/webm;codecs=opus"
          : "audio/webm",
      });

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
      };

      mediaRecorder.start(250);
      mediaRecorderRef.current = mediaRecorder;

      // Duration timer
      timerRef.current = setInterval(() => {
        setDuration(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 1000);
    } catch (err) {
      console.warn("[VoiceRecorder] Mic access denied or unavailable:", err);
      // Continue with just speech recognition if available
    }
  }, [isSupported, startSpeech]);

  const stopRecording = useCallback(() => {
    setIsRecording(false);

    // Stop speech recognition
    if (isListening) {
      stopSpeech();
    }

    // Stop timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    // Stop media recorder
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    }

    const finalDuration = Math.floor(
      (Date.now() - startTimeRef.current) / 1000
    );

    // Build audio blob after a small delay to collect last chunks
    setTimeout(() => {
      const audioBlob =
        chunksRef.current.length > 0
          ? new Blob(chunksRef.current, { type: "audio/webm" })
          : null;
      onComplete({
        transcript: editableText || speechTranscript,
        audioBlob,
        duration: finalDuration,
      });
    }, 300);
  }, [isListening, stopSpeech, editableText, speechTranscript, onComplete]);

  const formatDuration = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Mic Button */}
      <div className="flex items-center gap-3">
        {!isRecording ? (
          <button
            type="button"
            onClick={startRecording}
            className="relative flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg transition-all hover:bg-blue-700 hover:scale-105 active:scale-95"
          >
            {isSupported ? (
              <Mic className="h-6 w-6" />
            ) : (
              <MicOff className="h-6 w-6 opacity-50" />
            )}
          </button>
        ) : (
          <motion.button
            type="button"
            onClick={stopRecording}
            className="relative flex h-14 w-14 items-center justify-center rounded-full bg-red-500 text-white shadow-lg"
            animate={{ scale: [1, 1.08, 1] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
          >
            <Square className="h-5 w-5" fill="white" />
          </motion.button>
        )}

        <div className="flex flex-col">
          {isRecording ? (
            <>
              <span className="text-xs font-bold text-red-500 uppercase tracking-wider">
                Recording {formatDuration(duration)}
              </span>
              <span className="text-[10px] text-slate-400">
                Tap to stop
              </span>
            </>
          ) : isSupported ? (
            <>
              <span className="text-xs font-bold text-slate-700">
                Tap to speak
              </span>
              <span className="text-[10px] text-slate-400">
                Your words appear below
              </span>
            </>
          ) : (
            <>
              <span className="text-xs font-bold text-slate-700">
                Voice unavailable
              </span>
              <span className="text-[10px] text-slate-400">
                Type your feedback below
              </span>
            </>
          )}
        </div>
      </div>

      {/* Live Transcript / Interim */}
      <AnimatePresence>
        {isRecording && (interimTranscript || speechTranscript) && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="rounded-lg bg-blue-50 border border-blue-100 px-3 py-2 text-xs text-blue-800"
          >
            {speechTranscript}
            {interimTranscript && (
              <span className="text-blue-400"> {interimTranscript}</span>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Editable Textarea */}
      <textarea
        value={editableText}
        onChange={(e) => setEditableText(e.target.value)}
        placeholder={
          isSupported
            ? "Your voice transcript appears here — or just type..."
            : "Type your feedback here..."
        }
        className="w-full min-h-[80px] rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-300 focus:border-blue-300 focus:ring-1 focus:ring-blue-200 focus:outline-none resize-none"
        disabled={isRecording}
      />
    </div>
  );
}
