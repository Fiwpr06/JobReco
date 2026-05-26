"use client";

import React, { useState } from "react";
import { MoveUp, MoveDown, Check, AlertCircle, GripVertical } from "lucide-react";

interface Candidate {
  id: number;
  candidate_name: string;
  match_score: number;
  status: string;
  applied_at: string;
  cv_title: string;
  manual_rank?: number | null;
}

interface RankingTableProps {
  candidates: Candidate[];
  onOrderChange: (newOrder: Candidate[]) => void;
}

export function RankingTable({ candidates: initialCandidates, onOrderChange }: RankingTableProps) {
  const [candidates, setCandidates] = useState<Candidate[]>(initialCandidates);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const list = [...candidates];
    const draggedItem = list[draggedIndex];
    list.splice(draggedIndex, 1);
    list.splice(index, 0, draggedItem);
    
    setDraggedIndex(index);
    setCandidates(list);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    onOrderChange(candidates);
  };

  const moveUp = (index: number) => {
    if (index === 0) return;
    const list = [...candidates];
    const temp = list[index];
    list[index] = list[index - 1];
    list[index - 1] = temp;
    setCandidates(list);
    onOrderChange(list);
  };

  const moveDown = (index: number) => {
    if (index === candidates.length - 1) return;
    const list = [...candidates];
    const temp = list[index];
    list[index] = list[index + 1];
    list[index + 1] = temp;
    setCandidates(list);
    onOrderChange(list);
  };

  const getScoreColor = (score: number) => {
    if (score >= 0.9) return "text-[#00ff00] border-[#00ff00]/30 bg-[#00ff00]/10";
    if (score >= 0.75) return "text-blue-400 border-blue-400/30 bg-blue-400/10";
    if (score >= 0.6) return "text-yellow-500 border-yellow-500/30 bg-yellow-500/10";
    return "text-gray-400 border-gray-400/30 bg-gray-400/10";
  };

  return (
    <div className="w-full bg-[#050505] border border-[#333] rounded-xl overflow-hidden font-mono text-xs">
      <div className="bg-[#111] p-4 border-b border-[#333] flex justify-between items-center">
        <div>
          <h3 className="font-bold text-white text-sm tracking-wider text-[#00ff00]">
            MANUAL OVERRIDE WORKSPACE
          </h3>
          <p className="text-gray-500 text-[10px] mt-1">
            Kéo hoặc nhấn mũi tên để điều chỉnh thủ công gợi ý từ hệ thống. Tự động lưu.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-[#1a1a1a] px-3 py-1.5 rounded border border-[#333]">
          <AlertCircle className="w-3.5 h-3.5 text-[#00ff00]" />
          <span className="text-[10px] text-gray-400">Interactive Override Mode Active</span>
        </div>
      </div>

      <div className="divide-y divide-[#222]">
        {candidates.map((cand, idx) => (
          <div
            key={cand.id}
            draggable
            onDragStart={(e) => handleDragStart(e, idx)}
            onDragOver={(e) => handleDragOver(e, idx)}
            onDragEnd={handleDragEnd}
            className={`flex items-center p-4 transition-colors hover:bg-[#111] cursor-grab active:cursor-grabbing ${
              draggedIndex === idx ? "bg-[#111] opacity-50" : ""
            }`}
          >
            {/* Grab Handle */}
            <div className="mr-3 text-gray-600 hover:text-white transition-colors">
              <GripVertical className="w-4 h-4" />
            </div>

            {/* Rank Badge */}
            <div className="w-8 font-bold text-gray-500">#{idx + 1}</div>

            {/* Candidate Identity */}
            <div className="flex-1 min-w-0">
              <div className="font-bold text-white truncate">{cand.candidate_name}</div>
              <div className="text-[10px] text-gray-500 truncate mt-0.5">{cand.cv_title}</div>
            </div>

            {/* Match Score */}
            <div className={`px-2.5 py-1 rounded border mr-6 font-bold ${getScoreColor(cand.match_score)}`}>
              {(cand.match_score * 100).toFixed(0)}% Match
            </div>

            {/* Action controls */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => moveUp(idx)}
                disabled={idx === 0}
                className="p-1.5 rounded border border-[#333] hover:border-[#00ff00] text-gray-400 hover:text-[#00ff00] disabled:opacity-30 disabled:hover:border-[#333] disabled:hover:text-gray-400 transition-colors"
              >
                <MoveUp className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => moveDown(idx)}
                disabled={idx === candidates.length - 1}
                className="p-1.5 rounded border border-[#333] hover:border-[#00ff00] text-gray-400 hover:text-[#00ff00] disabled:opacity-30 disabled:hover:border-[#333] disabled:hover:text-gray-400 transition-colors"
              >
                <MoveDown className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
