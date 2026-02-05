"use client";

import { useState, useCallback } from "react";

export interface Annotation {
  id: string;
  pinX: number;
  pinY: number;
  pinNumber: number;
  transcript: string;
  audioBlob: Blob | null;
  audioDuration: number;
  screenshotDataUrl: string | null;
  createdAt: Date;
  status: "recording" | "editing" | "saved";
}

export function useAnnotations() {
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [nextPinNumber, setNextPinNumber] = useState(1);

  const addPin = useCallback(
    (x: number, y: number): string => {
      const id = crypto.randomUUID();
      const annotation: Annotation = {
        id,
        pinX: x,
        pinY: y,
        pinNumber: nextPinNumber,
        transcript: "",
        audioBlob: null,
        audioDuration: 0,
        screenshotDataUrl: null,
        createdAt: new Date(),
        status: "recording",
      };
      setAnnotations((prev) => [...prev, annotation]);
      setNextPinNumber((prev) => prev + 1);
      return id;
    },
    [nextPinNumber]
  );

  const updateTranscript = useCallback((id: string, text: string) => {
    setAnnotations((prev) =>
      prev.map((a) => (a.id === id ? { ...a, transcript: text } : a))
    );
  }, []);

  const setAudio = useCallback((id: string, blob: Blob, duration: number) => {
    setAnnotations((prev) =>
      prev.map((a) =>
        a.id === id ? { ...a, audioBlob: blob, audioDuration: duration } : a
      )
    );
  }, []);

  const setScreenshot = useCallback((id: string, dataUrl: string) => {
    setAnnotations((prev) =>
      prev.map((a) =>
        a.id === id ? { ...a, screenshotDataUrl: dataUrl } : a
      )
    );
  }, []);

  const saveAnnotation = useCallback((id: string) => {
    setAnnotations((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: "saved" as const } : a))
    );
  }, []);

  const removeAnnotation = useCallback((id: string) => {
    setAnnotations((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const setEditing = useCallback((id: string) => {
    setAnnotations((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: "editing" as const } : a))
    );
  }, []);

  return {
    annotations,
    addPin,
    updateTranscript,
    setAudio,
    setScreenshot,
    saveAnnotation,
    removeAnnotation,
    setEditing,
  };
}
