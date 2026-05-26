"use client";

import React from "react";
import { JobCard } from "@/features/jobs/components/job-card";

interface MatchResult {
  job_id: number;
  company: string;
  title: string;
  match_score: number;
  explanation: string;
  location: string;
  salary: string;
}

interface MatchResultsGridProps {
  results: MatchResult[];
}

export function MatchResultsGrid({ results }: MatchResultsGridProps) {
  if (!results || results.length === 0) {
    return (
      <div className="text-center text-gray-400 py-12">
        No matches found.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold font-mono text-[#00ff00] border-b border-[#333] pb-4">
        TOP MATCHES FOUND ({results.length})
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {results.map((result, idx) => (
          <div key={`${result.job_id}-${idx}`} className="bg-black border border-[#333] hover:border-[#00ff00] transition-colors rounded-xl p-4 flex flex-col h-full shadow-lg">
            
            {/* Header */}
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-bold text-white mb-1 line-clamp-2">
                  {result.title}
                </h3>
                <p className="text-sm text-gray-400">{result.company}</p>
              </div>
              <div className="bg-[#00ff00]/10 border border-[#00ff00]/30 text-[#00ff00] px-2 py-1 rounded text-lg font-bold font-mono">
                {Math.round(result.match_score * 100)}%
              </div>
            </div>

            {/* Details */}
            <div className="text-sm text-gray-400 space-y-2 mb-4 flex-grow">
              <div className="flex items-center">
                <span className="w-4 h-4 mr-2">📍</span>
                <span className="truncate">{result.location || "Anywhere"}</span>
              </div>
              <div className="flex items-center">
                <span className="w-4 h-4 mr-2">💰</span>
                <span className="truncate">{result.salary || "Negotiable"}</span>
              </div>
            </div>

            {/* System Explanation Snippet */}
            <div className="bg-[#111] p-3 rounded border border-[#222] mt-auto">
              <span className="text-xs text-[#00ff00] uppercase tracking-wider font-bold mb-1 block">
                Đánh giá từ Hệ thống
              </span>
              <p className="text-sm text-gray-300 line-clamp-2">
                {result.explanation}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
