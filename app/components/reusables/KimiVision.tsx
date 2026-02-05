"use client";

import { useState, useRef, useCallback } from "react";
import { Camera, Upload, X, Loader2, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

// Puter.js types
declare global {
  interface Window {
    puter?: {
      ai: {
        chat: (message: string, options?: { model?: string; stream?: boolean }) => Promise<any>;
      };
    };
  }
}

interface KimiVisionProps {
  onAnalysisComplete?: (result: string) => void;
  prompt?: string;
  className?: string;
}

/**
 * Kimi Vision Component - Free vision analysis via Puter.js
 * Uses Moonshot AI's Kimi K2 for image understanding
 * No API key required - runs in browser via Puter's free tier
 */
export function KimiVision({ onAnalysisComplete, prompt = "Analyze this image and describe what you see in detail.", className }: KimiVisionProps) {
  const [image, setImage] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load Puter.js dynamically
  const loadPuter = useCallback(async () => {
    if (window.puter) return window.puter;
    
    return new Promise<void>((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://js.puter.com/v2/";
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Failed to load Puter.js"));
      document.body.appendChild(script);
    });
  }, []);

  // Convert file to base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // Handle file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please upload an image file");
      return;
    }

    try {
      const base64 = await fileToBase64(file);
      setImage(base64);
      setError(null);
      setAnalysis("");
    } catch (err) {
      setError("Failed to read image");
    }
  };

  // Analyze image with Kimi
  const analyzeImage = async () => {
    if (!image) return;

    setLoading(true);
    setError(null);

    try {
      await loadPuter();

      if (!window.puter?.ai?.chat) {
        throw new Error("Puter AI not available");
      }

      // Kimi K2.5 with vision - send image as markdown
      const message = `${prompt}\n\n![image](${image})`;

      const response = await window.puter.ai.chat(message, {
        model: "moonshotai/kimi-k2-5",
        stream: false,
      });

      const result = typeof response === "string" ? response : response?.message?.content || response?.text || JSON.stringify(response);
      
      setAnalysis(result);
      onAnalysisComplete?.(result);
    } catch (err: any) {
      console.error("Kimi Vision error:", err);
      setError(err.message || "Failed to analyze image");
    } finally {
      setLoading(false);
    }
  };

  // Clear everything
  const clear = () => {
    setImage(null);
    setAnalysis("");
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Upload Area */}
      {!image ? (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors"
        >
          <Camera className="w-10 h-10 mx-auto text-gray-400 mb-3" />
          <p className="text-sm text-gray-600">Click to upload an image</p>
          <p className="text-xs text-gray-400 mt-1">or drag and drop</p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>
      ) : (
        <div className="relative">
          <img
            src={image}
            alt="Uploaded"
            className="max-h-64 mx-auto rounded-lg border"
          />
          <button
            onClick={clear}
            className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Analyze Button */}
      {image && !analysis && (
        <Button
          onClick={analyzeImage}
          disabled={loading}
          className="w-full"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Analyzing with Kimi...
            </>
          ) : (
            <>
              <Eye className="w-4 h-4 mr-2" />
              Analyze Image (Free)
            </>
          )}
        </Button>
      )}

      {/* Analysis Result */}
      {analysis && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-green-600 flex items-center">
              <Eye className="w-3 h-3 mr-1" />
              Kimi Vision Analysis
            </span>
            <Button variant="ghost" size="sm" onClick={clear}>
              <X className="w-4 h-4" />
            </Button>
          </div>
          <Textarea
            value={analysis}
            onChange={(e) => setAnalysis(e.target.value)}
            className="min-h-[120px] text-sm"
            placeholder="Analysis will appear here..."
          />
        </div>
      )}
    </div>
  );
}

export default KimiVision;
