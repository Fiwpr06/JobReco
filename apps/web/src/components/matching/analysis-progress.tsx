"use client";

import React from "react";
import { CheckCircle2, Circle, Loader2 } from "lucide-react";

interface AnalysisProgressProps {
  progress: number;
  currentStep: string;
}

const STEPS = [
  { id: "pending", label: "Initializing" },
  { id: "extract_text", label: "Parsing Document" },
  { id: "extract_skills", label: "Extracting Skills (NLP)" },
  { id: "generate_embeddings", label: "Generating Embeddings" },
  { id: "faiss_search", label: "Semantic Search (FAISS)" },
  { id: "hgat_scoring", label: "Xếp hạng lại bằng Hệ thống (HGAT)" },
  { id: "done", label: "Complete" },
];

export function AnalysisProgress({ progress, currentStep }: AnalysisProgressProps) {
  
  const getCurrentStepIndex = () => {
    const idx = STEPS.findIndex(s => s.id === currentStep);
    return idx === -1 ? 0 : idx;
  };
  
  const currentIndex = getCurrentStepIndex();

  return (
    <div className="w-full max-w-2xl mx-auto p-6 bg-black border border-[#333] rounded-xl shadow-xl font-mono">
      <div className="flex items-center justify-between mb-8 border-b border-[#333] pb-4">
        <h2 className="text-xl font-bold text-[#00ff00]">
          ANALYSIS IN PROGRESS
        </h2>
        <div className="text-2xl font-bold text-white">
          {Math.round(progress)}%
        </div>
      </div>

      <div className="relative pt-4 pl-4 border-l border-[#333] ml-4 space-y-8">
        {STEPS.map((step, index) => {
          const isCompleted = index < currentIndex || currentStep === "done";
          const isCurrent = index === currentIndex && currentStep !== "done";
          const isPending = index > currentIndex;

          return (
            <div key={step.id} className="relative flex items-center">
              {/* Timeline marker */}
              <div className={`absolute -left-[33px] bg-black p-1 ${
                isCompleted ? "text-[#00ff00]" : 
                isCurrent ? "text-white" : "text-[#333]"
              }`}>
                {isCompleted ? (
                  <CheckCircle2 className="w-6 h-6" />
                ) : isCurrent ? (
                  <Loader2 className="w-6 h-6 animate-spin text-[#00ff00]" />
                ) : (
                  <Circle className="w-6 h-6" />
                )}
              </div>
              
              <div className={`ml-4 ${
                isCompleted ? "text-gray-300" : 
                isCurrent ? "text-[#00ff00] font-bold" : "text-[#555]"
              }`}>
                {step.label}
                {isCurrent && (
                  <p className="text-xs text-gray-500 font-normal mt-1 animate-pulse">
                    Processing {Math.round(progress)}%
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
