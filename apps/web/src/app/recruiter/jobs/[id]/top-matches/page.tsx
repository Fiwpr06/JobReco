"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { RecruiterSidebar } from "@/components/recruiter/sidebar";
import { api } from "@/lib/api";
import { ChevronLeft, Check, X, ShieldCheck, Eye, Star } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";

interface CandidateMatch {
  cv_id: number;
  candidate_name: string;
  match_score: number;
  skill_match: number;
  experience_match: number;
  missing_skills: string[];
  strengths: string[];
  ai_explanation: string;
  cv_url?: string;
  is_owner?: boolean;
}



export default function TopMatchesPage() {
  const { id: jobId } = useParams();
  const [loading, setLoading] = useState(true);
  const [topCandidates, setTopCandidates] = useState<CandidateMatch[]>([]);

  useEffect(() => {
    async function loadMatches() {
      try {
        const res = await api.get(`/api/v1/recruiter/jobs/${jobId}/top-matches`);
        setTopCandidates(res.data.top_candidates || []);
      } catch(err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadMatches();
  }, [jobId]);

  const getScoreStyle = (score: number) => {
    const normalized = score <= 1 ? score * 100 : score;
    if (normalized >= 95) return { ring: "ring-2 ring-emerald-400", badge: "bg-emerald-100 text-emerald-700 border-emerald-200", text: "text-emerald-700" };
    if (normalized >= 75) return { ring: "ring-2 ring-blue-400", badge: "bg-blue-100 text-blue-700 border-blue-200", text: "text-blue-700" };
    return { ring: "", badge: "bg-amber-100 text-amber-700 border-amber-200", text: "text-amber-700" };
  };

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 overflow-hidden">
      <RecruiterSidebar />

      <main className="flex-1 p-8 overflow-y-auto">
        {/* Back Link */}
        <Link
          href="/recruiter/dashboard"
          className="inline-flex items-center gap-2 text-slate-500 hover:text-indigo-600 transition-colors text-sm font-semibold mb-6"
        >
          <ChevronLeft className="w-4 h-4" /> Quay lại Dashboard
        </Link>

        {/* Header */}
        <div className="flex justify-between items-center mb-8 border-b border-slate-200 pb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
              Ứng Viên Phù Hợp Nhất
              <Badge className="bg-indigo-100 text-indigo-700 hover:bg-indigo-200 border-0">
                Hệ thống Đánh giá Mức độ phù hợp
              </Badge>
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              Kết quả từ GraphHire HGAT — xếp hạng tự động theo độ phù hợp toàn diện.
            </p>
          </div>
          <div className="hidden md:block text-right">
            <span className="text-xs text-slate-500 uppercase font-bold block">Tổng Phù Hợp Cao</span>
            <span className="text-3xl font-bold text-slate-900">{topCandidates.length}</span>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
            <p className="text-slate-500 text-sm font-medium">Đang chạy mô hình HGAT...</p>
          </div>
        ) : topCandidates.length === 0 ? (
          <div className="text-center py-10 text-slate-500">Không tìm thấy ứng viên phù hợp.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {topCandidates.map((cand, idx) => {
              const style = getScoreStyle(cand.match_score);
              return (
                <motion.div
                  key={cand.cv_id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col relative overflow-hidden hover:border-slate-300 hover:shadow-md transition-all"
                >
                  {/* Rank + Score */}
                  <div className="flex justify-between items-start mb-5">
                    <div>
                      <span className="text-xs bg-slate-100 text-slate-600 font-bold px-2.5 py-1 rounded-lg uppercase tracking-wide">
                        Hạng #{idx + 1}
                      </span>
                      <h3 className="text-lg font-bold text-slate-900 mt-3">{cand.candidate_name}</h3>
                    </div>
                    <div className={`w-16 h-16 rounded-full border-2 ${style.ring} flex flex-col items-center justify-center font-bold ${style.badge} shadow-sm`}>
                      <span className="text-xl leading-none">{(cand.match_score <= 1 ? cand.match_score * 100 : cand.match_score).toFixed(0)}</span>
                      <span className="text-[9px] uppercase tracking-wider opacity-70">Match</span>
                    </div>
                  </div>

                  {/* Score breakdown bars */}
                  <div className="space-y-3 mb-6 pt-2">
                    <div className="flex flex-col gap-1">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-slate-600">Độ tương thích Kỹ Năng</span>
                        <span className="text-indigo-600 font-mono">{(cand.skill_match * 100).toFixed(0)}%</span>
                      </div>
                      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${cand.skill_match * 100}%` }} />
                      </div>
                    </div>

                    <div className="flex flex-col gap-1">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-slate-600">Sự phù hợp Kinh Nghiệm</span>
                        <span className="text-blue-600 font-mono">{(cand.experience_match * 100).toFixed(0)}%</span>
                      </div>
                      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${cand.experience_match * 100}%` }} />
                      </div>
                    </div>

                    <div className="flex flex-col gap-1">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-slate-600">Điểm số HGAT (AI Model)</span>
                        <span className="text-purple-600 font-mono">{(cand.match_score <= 1 ? cand.match_score * 100 : cand.match_score).toFixed(0)}%</span>
                      </div>
                      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-purple-500 rounded-full" style={{ width: `${(cand.match_score <= 1 ? cand.match_score * 100 : cand.match_score)}%` }} />
                      </div>
                    </div>
                  </div>

                  {/* Giải thích từ hệ thống */}
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 mb-5">
                    <div className="flex items-center gap-1.5 mb-2">
                      <ShieldCheck className="w-4 h-4 text-indigo-500" />
                      <span className="text-xs text-indigo-600 font-bold uppercase tracking-wide">Hệ thống Nhận Xét</span>
                    </div>
                    <p className="text-sm text-slate-700 leading-relaxed">{cand.ai_explanation}</p>
                  </div>

                  {/* Skills */}
                  <div className="grid grid-cols-2 gap-3 mb-6">
                    <div>
                      <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Điểm Mạnh</h4>
                      <div className="flex flex-wrap gap-1.5">
                        {cand.strengths.map(s => (
                          <span key={s} className="px-2 py-0.5 rounded-lg bg-emerald-100 border border-emerald-200 text-emerald-700 text-[10px] font-semibold">
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Còn Thiếu</h4>
                      {cand.missing_skills.length === 0 ? (
                        <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" /> Đủ 100% yêu cầu
                        </span>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {cand.missing_skills.map(s => (
                            <span key={s} className="px-2 py-0.5 rounded-lg bg-rose-100 border border-rose-200 text-rose-700 text-[10px] font-semibold">
                              {s}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* CTA Buttons */}
                  <div className="flex gap-3 mt-auto pt-4 border-t border-slate-100">
                    <Link
                      href={`/recruiter/cv/${cand.cv_id}`}
                      className="flex-1 py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-colors shadow-sm bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200"
                    >
                      <Eye className="w-4 h-4" /> Xem CV
                    </Link>
                    <button className="flex-1 py-2.5 rounded-xl bg-white border border-slate-200 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600 text-slate-500 font-bold text-sm flex items-center justify-center gap-2 transition-colors shadow-sm">
                      <X className="w-4 h-4" /> Bỏ Qua
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
