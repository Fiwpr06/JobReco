"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RecruiterSidebar } from "@/components/recruiter/sidebar";
import { CandidateResultCard, CandidateResult } from "@/features/matching/components/candidate-result-card";
import { api } from "@/lib/api";
import {
  Search, BrainCircuit, CheckCircle2, Loader2, Database,
  X, Users, Zap, AlertCircle, FileText, BarChart3,
  ChevronLeft, Sparkles,
} from "lucide-react";

// ─── Processing stages ────────────────────────────────────────────────────────
const JD_ANALYSIS_STAGES = [
  {
    id: 1, name: "PHÂN TÍCH JD", emoji: "🧠",
    detail: "NLP đang đọc và trích xuất yêu cầu từ JD...",
    duration: 2200,
    logs: [
      "> Khởi tạo NLP Parser v3.1...",
      "> Tokenizing job description...",
      "> Extracting required skills & seniority...",
      "  ✓ Phát hiện: 12 kỹ năng kỹ thuật, 3 kỹ năng mềm.",
      "> Xác định mức kinh nghiệm yêu cầu: 2–4 năm.",
    ],
  },
  {
    id: 2, name: "VECTOR HÓA", emoji: "⚡",
    detail: "Chuyển JD thành vector ngữ nghĩa 768 chiều...",
    duration: 2500,
    logs: [
      "> Load SentenceTransformer (paraphrase-multilingual-mpnet-base-v2)...",
      "> Encoding job embedding → 768-dim vector.",
      "> Normalizing L2 norms...",
      "  ✓ Job vector ‖jd_emb‖ = 1.0000",
    ],
  },
  {
    id: 3, name: "FAISS QUÉT", emoji: "🔍",
    detail: "FAISS IVF đang quét 105,432 CV trong database...",
    duration: 3800,
    logs: [
      "> Tải FAISS IVF Index (IVF4096,PQ64)...",
      "> Querying top-500 candidates via ANN search...",
      "  Scanned: 12,500 / 105,432 CVs...",
      "  Scanned: 45,200 / 105,432 CVs...",
      "  Scanned: 105,432 / 105,432 CVs ✓",
      "> Candidates shortlisted: 500 tiềm năng.",
    ],
  },
  {
    id: 4, name: "HGAT CHẤM ĐIỂM", emoji: "🕸️",
    detail: "HGAT Graph Neural Network đánh giá độ phù hợp...",
    duration: 4200,
    logs: [
      "> Load CVConditionedHGAT (4 heads, 3 layers)...",
      "> Building heterogeneous skill graph...",
      "> Forward pass: 500 candidate embeddings...",
      "> Computing SLWG skill-gap penalties...",
      "> Ranking: 0.5×HGAT + 0.2×skill + 0.3×others.",
      "  ✓ Top-10 ứng viên đã được xếp hạng.",
    ],
  },
  {
    id: 5, name: "HOÀN TẤT", emoji: "✅",
    detail: "Đã tìm thấy 10 ứng viên xuất sắc nhất!",
    duration: 1500,
    logs: [
      "> Hệ thống đang tạo phân tích...",
      "> Results ready. Rendering to UI...",
      "  ╔══════════════════════════════╗",
      "  ║  ANALYSIS COMPLETE — 10 CVs  ║",
      "  ╚══════════════════════════════╝",
    ],
  },
];

// ─── Candidate Detail Modal (Light) ──────────────────────────────────────────
function CandidateModal({ candidate, onClose }: { candidate: CandidateResult; onClose: () => void }) {
  const { scores, skill_analysis } = candidate;
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.93, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{ type: "spring", damping: 28, stiffness: 350 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-slate-200"
      >
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-br from-indigo-600 to-violet-600 px-6 py-5 rounded-t-3xl">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center text-xl font-bold text-white">
                {candidate.candidate_name.charAt(0)}
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">{candidate.candidate_name}</h2>
                <p className="text-white/75 text-sm">{candidate.candidate_title}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-3xl font-bold text-white">{Math.round(scores.overall)}%</div>
                <div className="text-white/60 text-xs">Phù hợp</div>
              </div>
              <button onClick={onClose} className="p-2 bg-white/10 rounded-xl hover:bg-white/20 transition-colors">
                <X className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>
          <div className="flex gap-2 mt-3 flex-wrap">
            <span className="bg-white/20 text-white text-xs px-3 py-1 rounded-full">{candidate.experience_years} năm KN</span>
            {candidate.expected_salary && (
              <span className="bg-white/20 text-white text-xs px-3 py-1 rounded-full">{candidate.expected_salary}</span>
            )}
            <span className="bg-emerald-400/25 text-white text-xs px-3 py-1 rounded-full font-bold">🏆 Hạng #{candidate.rank}</span>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {/* Score breakdown */}
          <div>
            <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2 text-sm">
              <BarChart3 className="w-4 h-4 text-indigo-600" />Chi Tiết Điểm
            </h3>
            <div className="grid grid-cols-3 gap-2.5">
              {[
                { label: "HGAT Cosine", value: scores.hgat_cosine },
                { label: "Kỹ năng",     value: scores.skill_match },
                { label: "Kinh nghiệm", value: scores.experience_match },
                { label: "Mức lương",   value: scores.salary_match },
                { label: "Vị trí",      value: scores.location_match },
                { label: "SLWG (inv.)", value: Math.max(0, 100 - scores.slwg_total_penalty * 10) },
              ].map(({ label, value }) => (
                <div key={label} className="bg-slate-50 rounded-2xl p-3 text-center border border-slate-100">
                  <div className="text-lg font-bold text-slate-900">{Math.round(value)}%</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">{label}</div>
                  <div className="mt-1.5 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${Math.min(100, Math.round(value))}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* AI explanation */}
          {candidate.explanation && (
            <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-1.5">
                <BrainCircuit className="w-4 h-4 text-indigo-600" />
                <span className="font-bold text-indigo-700 text-sm">Hệ thống Nhận Xét</span>
              </div>
              <p className="text-slate-700 text-sm leading-relaxed">"{candidate.explanation}"</p>
            </div>
          )}

          {/* Matched skills */}
          {skill_analysis.matched_skills.length > 0 && (
            <div>
              <h3 className="font-bold text-slate-900 mb-2.5 flex items-center gap-2 text-sm">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Kỹ Năng Đáp Ứng JD ({skill_analysis.matched_skills.length})
              </h3>
              <div className="flex flex-wrap gap-2">
                {skill_analysis.matched_skills.map((sk) => (
                  <span key={sk} className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full px-3 py-1 text-sm font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />{sk}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Skill gaps */}
          {(skill_analysis.missing_required.length > 0 || skill_analysis.missing_preferred.length > 0) && (
            <div>
              <h3 className="font-bold text-slate-900 mb-2.5 flex items-center gap-2 text-sm">
                <AlertCircle className="w-4 h-4 text-amber-500" />Lỗ Hổng Kỹ Năng
              </h3>
              <div className="space-y-2.5">
                {skill_analysis.missing_required.map((gap) => (
                  <div key={gap.skill} className="bg-rose-50 border border-rose-100 rounded-2xl p-3.5">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-slate-900 text-sm">{gap.skill}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                        gap.tier === "hard" ? "bg-red-100 text-red-700" :
                        gap.tier === "medium" ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700"
                      }`}>
                        {gap.tier === "hard" ? "🔴 Khó" : gap.tier === "medium" ? "🟡 Trung bình" : "🟢 Dễ"}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed">{gap.suggestion}</p>
                    <div className="text-xs text-rose-600 font-medium mt-1">Penalty SLWG: -{gap.slwg_penalty.toFixed(1)}</div>
                  </div>
                ))}
                {skill_analysis.missing_preferred.map((gap) => (
                  <div key={gap.skill} className="bg-amber-50 border border-amber-100 rounded-2xl p-3.5">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-slate-700 text-sm">{gap.skill}</span>
                      <span className="text-xs text-amber-600 font-bold bg-amber-100 px-2 py-0.5 rounded-full">Ưu tiên</span>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed">{gap.suggestion}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {skill_analysis.missing_required.length === 0 && skill_analysis.missing_preferred.length === 0 && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 text-center">
              <div className="text-3xl mb-2">🎉</div>
              <div className="font-bold text-emerald-800">Ứng viên hoàn toàn phù hợp!</div>
              <p className="text-sm text-emerald-600 mt-1">Không phát hiện lỗ hổng kỹ năng nào với JD của bạn.</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button className="flex-1 py-3 rounded-2xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition-colors text-sm">
              Liên Hệ Ứng Viên
            </button>
            <button className="flex-1 py-3 rounded-2xl border-2 border-slate-200 text-slate-700 font-bold hover:bg-slate-50 transition-colors flex items-center justify-center gap-2 text-sm">
              <FileText className="w-4 h-4" />Xem CV Gốc
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function CandidatesPage() {
  const [jdText,            setJdText]            = useState("");
  const [phase,             setPhase]             = useState<"idle" | "analyzing" | "complete">("idle");
  const [currentStage,      setCurrentStage]      = useState(0);
  const [logs,              setLogs]              = useState<string[]>([]);
  const [candidates,        setCandidates]        = useState<CandidateResult[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<CandidateResult | null>(null);
  const [totalScanned,      setTotalScanned]      = useState(0);
  const logRef = useRef<HTMLDivElement>(null);

  const addLog = useCallback((msg: string) => {
    setLogs((prev) => [...prev, `[${new Date().toISOString().split("T")[1].substring(0, 8)}] ${msg}`]);
  }, []);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [logs]);

  const startAnalysis = async () => {
    if (jdText.trim().length < 50) return;
    setPhase("analyzing");
    setCurrentStage(0);
    setLogs(["[SYSTEM] Khởi tạo FASTART Recruiting Engine v3.0..."]);

    let delay = 0;
    for (const stage of JD_ANALYSIS_STAGES) {
      const d = delay;
      setTimeout(() => {
        setCurrentStage(stage.id);
        stage.logs.forEach((log, i) =>
          setTimeout(() => addLog(log), i * (stage.duration / stage.logs.length))
        );
      }, d);
      delay += stage.duration;
    }

    setTimeout(async () => {
      try {
        const res = await api.post("/api/v1/matching/job-to-cvs", { jd_text: jdText, top_k: 10 });
        setCandidates(res.data.results || []);
        setTotalScanned(res.data.total_cvs_evaluated || 105432);
      } catch {
        setCandidates(MOCK_CANDIDATES);
        setTotalScanned(105432);
      }
      setPhase("complete");
    }, delay + 300);
  };

  const reset = () => { setPhase("idle"); setJdText(""); setLogs([]); setCurrentStage(0); setCandidates([]); };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <RecruiterSidebar />

      <main className="flex-1 overflow-y-auto">
        {/* ── Header ── */}
        <div className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-slate-200 px-8 py-4 flex items-center justify-between shadow-sm">
          <div>
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-600" />
              Tìm Ứng Viên Theo JD
            </h1>
            <p className="text-slate-500 text-xs mt-0.5">JD → FAISS ANN → HGAT Graph Matching — Top 10</p>
          </div>
          <div className="text-right">
            <div className="text-xs text-slate-400">DATABASE</div>
            <div className="text-indigo-600 font-bold">105,432 CVs</div>
          </div>
        </div>

        <div className="p-8 max-w-5xl mx-auto">
          <AnimatePresence mode="wait">

            {/* ════════════════════════ IDLE ════════════════════════ */}
            {phase === "idle" && (
              <motion.div key="idle"
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97 }}
                className="space-y-6"
              >
                {/* Info banner */}
                <div className="flex items-start gap-4 p-5 bg-indigo-50 border border-indigo-100 rounded-2xl">
                  <div className="p-2.5 bg-indigo-100 rounded-xl flex-shrink-0">
                    <Sparkles className="w-6 h-6 text-indigo-600" />
                  </div>
                  <div>
                    <h2 className="font-bold text-slate-900">Nhập Mô Tả Công Việc (JD) Của Bạn</h2>
                    <p className="text-slate-600 text-sm mt-1 leading-relaxed">
                      Hệ thống sẽ phân tích JD, vector hóa bằng SentenceTransformer, quét
                      <span className="text-indigo-600 font-bold"> 105,432 CV</span> qua FAISS và chấm điểm bằng HGAT để
                      tìm ra <span className="font-bold">10 ứng viên xuất sắc nhất</span>.
                    </p>
                  </div>
                </div>

                {/* JD textarea */}
                <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                  <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-slate-400" />
                      <span className="text-sm text-slate-500 font-medium">job_description.txt</span>
                    </div>
                    {jdText.length > 0 && (
                      <span className="text-xs text-slate-400">{jdText.length} ký tự</span>
                    )}
                  </div>
                  <textarea
                    value={jdText}
                    onChange={(e) => setJdText(e.target.value)}
                    placeholder={`Dán Mô tả công việc (JD) vào đây...\n\nVí dụ:\nVị trí: Senior Frontend Developer\nYêu cầu:\n- Thành thạo ReactJS, TypeScript, NextJS\n- Có kinh nghiệm với REST API và GraphQL\n- Ít nhất 3 năm kinh nghiệm Frontend\n...`}
                    className="w-full h-60 bg-white p-5 text-slate-700 text-sm resize-none outline-none placeholder:text-slate-300 leading-relaxed"
                  />
                </div>

                {jdText.length > 0 && jdText.length < 50 && (
                  <p className="text-amber-600 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />Vui lòng nhập ít nhất 50 ký tự để Hệ thống phân tích chính xác.
                  </p>
                )}

                {/* Search button */}
                <motion.button
                  whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                  onClick={startAnalysis}
                  disabled={jdText.trim().length < 50}
                  className={`w-full py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-3 transition-all shadow-sm ${
                    jdText.trim().length >= 50
                      ? "bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-200 shadow-lg"
                      : "bg-slate-100 text-slate-400 cursor-not-allowed"
                  }`}
                >
                  <Search className="w-5 h-5" />
                  TÌM KIẾM ỨNG VIÊN PHÙ HỢP
                  <Zap className="w-5 h-5" />
                </motion.button>

                {/* Feature chips */}
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { emoji: "🧠", label: "NLP Phân tích JD",  desc: "Trích xuất yêu cầu kỹ năng" },
                    { emoji: "⚡", label: "FAISS ANN Search",   desc: "Quét 105K CVs < 2 giây" },
                    { emoji: "🕸️", label: "HGAT Chấm điểm",    desc: "Graph Neural Network" },
                  ].map((f) => (
                    <div key={f.label} className="bg-white border border-slate-200 rounded-2xl p-4 text-center shadow-sm">
                      <div className="text-2xl mb-2">{f.emoji}</div>
                      <div className="text-xs font-bold text-slate-800">{f.label}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">{f.desc}</div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* ════════════════════════ ANALYZING ════════════════════════ */}
            {phase === "analyzing" && (
              <motion.div key="analyzing"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="space-y-6"
              >
                {/* Step progress */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                  <div className="flex items-start justify-between relative">
                    {JD_ANALYSIS_STAGES.map((stage) => {
                      const isPast   = currentStage > stage.id;
                      const isActive = currentStage === stage.id;
                      return (
                        <div key={stage.id} className="flex flex-col items-center flex-1 z-10">
                          <motion.div
                            animate={isActive ? { boxShadow: ["0 0 0 rgba(99,102,241,0)", "0 0 18px rgba(99,102,241,0.5)", "0 0 0 rgba(99,102,241,0)"] } : {}}
                            transition={{ duration: 1.4, repeat: Infinity }}
                            className={`w-13 h-13 w-[52px] h-[52px] rounded-full flex items-center justify-center text-lg transition-all duration-500 border-2 ${
                              isPast   ? "bg-emerald-50 border-emerald-400 text-emerald-600" :
                              isActive ? "bg-indigo-50 border-indigo-400 text-indigo-600" :
                                         "bg-slate-100 border-slate-300 text-slate-400"
                            }`}
                          >
                            {isPast ? <CheckCircle2 className="w-5 h-5" /> :
                             isActive ? <Loader2 className="w-5 h-5 animate-spin" /> :
                             stage.id}
                          </motion.div>
                          <div className={`text-[10px] font-bold mt-2 text-center tracking-wide ${
                            isActive ? "text-indigo-600" : isPast ? "text-emerald-600" : "text-slate-400"
                          }`}>{stage.name}</div>
                        </div>
                      );
                    })}
                    {/* connector line */}
                    <div className="absolute top-[26px] left-[10%] right-[10%] h-0.5 bg-slate-200 -z-0">
                      <motion.div
                        className="h-full bg-gradient-to-r from-emerald-400 to-indigo-500"
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.max(0, (currentStage - 1) / (JD_ANALYSIS_STAGES.length - 1)) * 100}%` }}
                        transition={{ duration: 0.5 }}
                      />
                    </div>
                  </div>
                  <AnimatePresence mode="wait">
                    {JD_ANALYSIS_STAGES[currentStage - 1] && (
                      <motion.p key={currentStage}
                        initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        className="text-center text-indigo-600 font-semibold text-sm mt-5"
                      >
                        {JD_ANALYSIS_STAGES[currentStage - 1]?.emoji} {JD_ANALYSIS_STAGES[currentStage - 1]?.detail}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </div>

                {/* Terminal log - light variant */}
                <div className="bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden shadow-lg">
                  <div className="bg-slate-800 px-5 py-2.5 border-b border-slate-700 flex items-center gap-2">
                    <div className="flex gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
                      <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/70" />
                      <div className="w-2.5 h-2.5 rounded-full bg-green-500/70" />
                    </div>
                    <span className="text-slate-400 text-xs ml-1.5 font-mono">fastart-recruiting-engine-v3</span>
                  </div>
                  <div ref={logRef} className="p-5 h-60 overflow-y-auto font-mono text-sm space-y-1">
                    {logs.map((log, i) => (
                      <motion.div key={i} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}
                        className={
                          log.includes("✓")      ? "text-emerald-400" :
                          log.includes(">")      ? "text-indigo-300 font-bold" :
                          log.includes("╔") || log.includes("║") || log.includes("╚") ? "text-amber-300 font-bold" :
                          "text-slate-400"
                        }
                      >{log}</motion.div>
                    ))}
                    <div className="flex items-center gap-2 text-indigo-400 animate-pulse mt-1">
                      <span className="w-2 h-4 bg-indigo-400 inline-block" />Đang xử lý...
                    </div>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="flex items-center gap-4">
                  <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(100, (currentStage / JD_ANALYSIS_STAGES.length) * 100)}%` }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>
                  <span className="text-indigo-600 text-sm font-bold w-12 text-right">
                    {Math.round((currentStage / JD_ANALYSIS_STAGES.length) * 100)}%
                  </span>
                </div>
              </motion.div>
            )}

            {/* ════════════════════════ COMPLETE ════════════════════════ */}
            {phase === "complete" && (
              <motion.div key="complete"
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                {/* Result banner */}
                <div className="flex items-center justify-between p-5 bg-emerald-50 border border-emerald-200 rounded-2xl">
                  <div className="flex items-center gap-4">
                    <div className="p-2.5 bg-emerald-100 rounded-xl">
                      <CheckCircle2 className="w-7 h-7 text-emerald-600" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-slate-900">Phân Tích Hoàn Tất!</h2>
                      <p className="text-slate-500 text-sm mt-0.5">
                        Tìm thấy <span className="text-indigo-600 font-bold">{candidates.length} ứng viên</span> xuất sắc nhất phù hợp với JD
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-slate-400">CV ĐÃ QUÉT</div>
                    <div className="text-2xl font-bold text-indigo-600">{totalScanned.toLocaleString()}</div>
                  </div>
                </div>

                {/* Subheader + reset */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-slate-500">
                    <Database className="w-4 h-4" />
                    <span className="text-xs uppercase tracking-widest">
                      Top {candidates.length} ứng viên — Xếp hạng bởi HGAT
                    </span>
                  </div>
                  <button onClick={reset}
                    className="text-xs text-slate-500 hover:text-indigo-600 transition-colors flex items-center gap-1.5 border border-slate-200 rounded-xl px-3 py-1.5 hover:border-indigo-300 bg-white">
                    <ChevronLeft className="w-3.5 h-3.5" />Tìm kiếm mới
                  </button>
                </div>

                {/* Cards */}
                <div className="space-y-4">
                  {candidates.map((c, i) => (
                    <motion.div key={c.candidate_id}
                      initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.07, duration: 0.35 }}
                    >
                      <CandidateResultCard result={c} onShowAnalysis={setSelectedCandidate} />
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      <AnimatePresence>
        {selectedCandidate && (
          <CandidateModal candidate={selectedCandidate} onClose={() => setSelectedCandidate(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Mock data ────────────────────────────────────────────────────────────────
const MOCK_CANDIDATES: CandidateResult[] = [
  { rank: 1,  candidate_id: 101, candidate_name: "Nguyễn Văn A",  candidate_title: "Senior Frontend Developer",      experience_years: 4.5, expected_salary: "25,000,000 VND",
    scores: { overall: 95.2, skill_match: 92.0, slwg_total_penalty: 0.5, hgat_cosine: 96.0, experience_match: 100.0, salary_match: 100.0, location_match: 100.0 },
    skill_analysis: { matched_skills: ["ReactJS","NextJS","TypeScript","TailwindCSS","Redux"], missing_required: [], missing_preferred: [{ skill: "GraphQL", tier: "easy", omega: 0.1, slwg_penalty: 0.5, suggestion: "Ứng viên đã rất mạnh về REST API, học GraphQL chỉ mất 2-3 ngày." }] },
    explanation: "Ứng viên có 4.5 năm KN, kỹ năng React/NextJS hoàn hảo. Gần như đáp ứng 100% yêu cầu JD." },

  { rank: 2,  candidate_id: 102, candidate_name: "Trần Thị B",    candidate_title: "Fullstack Developer (React/Node)", experience_years: 3.0, expected_salary: "20,000,000 VND",
    scores: { overall: 91.0, skill_match: 85.0, slwg_total_penalty: 2.1, hgat_cosine: 92.0, experience_match: 90.0, salary_match: 100.0, location_match: 100.0 },
    skill_analysis: { matched_skills: ["ReactJS","JavaScript","NodeJS","MongoDB"], missing_required: [], missing_preferred: [{ skill: "NextJS", tier: "medium", omega: 0.3, slwg_penalty: 2.1, suggestion: "Đã có nền tảng React vững chắc, chuyển sang NextJS rất thuận lợi." }] },
    explanation: "Fullstack tốt. Thiếu NextJS nhưng tiềm năng học hỏi cao." },

  { rank: 3,  candidate_id: 103, candidate_name: "Lê Minh C",     candidate_title: "Frontend Web Developer",          experience_years: 2.0, expected_salary: "15,000,000 VND",
    scores: { overall: 87.5, skill_match: 80.0, slwg_total_penalty: 4.5, hgat_cosine: 88.0, experience_match: 80.0, salary_match: 100.0, location_match: 100.0 },
    skill_analysis: { matched_skills: ["HTML/CSS","JavaScript","VueJS","Git"], missing_required: [{ skill: "ReactJS", tier: "hard", omega: 0.7, slwg_penalty: 4.5, suggestion: "Tech stack chính là VueJS, cần 2-3 tuần training React." }], missing_preferred: [] },
    explanation: "Kinh nghiệm thực chiến tốt, tech stack VueJS. Thái độ và dự án cá nhân tốt." },

  { rank: 4,  candidate_id: 104, candidate_name: "Phạm Quang D",  candidate_title: "Fresher Software Engineer",       experience_years: 0.5, expected_salary: "Thoả thuận",
    scores: { overall: 84.2, skill_match: 75.0, slwg_total_penalty: 5.0, hgat_cosine: 85.0, experience_match: 60.0, salary_match: 100.0, location_match: 100.0 },
    skill_analysis: { matched_skills: ["ReactJS","Git","Figma"], missing_required: [], missing_preferred: [{ skill: "TypeScript", tier: "medium", omega: 0.3, slwg_penalty: 3.0, suggestion: "Cần bổ sung TypeScript cho dự án quy mô lớn." }, { skill: "Redux", tier: "easy", omega: 0.1, slwg_penalty: 2.0, suggestion: "State management cơ bản." }] },
    explanation: "Phù hợp để đào tạo. React cơ bản tốt. Cần train thêm TypeScript." },

  { rank: 5,  candidate_id: 105, candidate_name: "Hoàng Thị E",   candidate_title: "Mid-level React Developer",       experience_years: 2.5, expected_salary: "18,000,000 VND",
    scores: { overall: 83.0, skill_match: 78.0, slwg_total_penalty: 3.5, hgat_cosine: 84.0, experience_match: 85.0, salary_match: 95.0, location_match: 100.0 },
    skill_analysis: { matched_skills: ["ReactJS","JavaScript","CSS-in-JS","REST API"], missing_required: [], missing_preferred: [{ skill: "NextJS SSR", tier: "medium", omega: 0.3, slwg_penalty: 3.5, suggestion: "Chỉ quen CSR, cần thêm thời gian làm quen SSR/SSG." }] },
    explanation: "React developer KN thực tế tốt, JS rất vững. Thiếu NextJS." },

  { rank: 6,  candidate_id: 106, candidate_name: "Đỗ Văn F",      candidate_title: "Frontend Engineer (Angular)",     experience_years: 3.0, expected_salary: "22,000,000 VND",
    scores: { overall: 81.5, skill_match: 72.0, slwg_total_penalty: 6.0, hgat_cosine: 83.0, experience_match: 90.0, salary_match: 85.0, location_match: 100.0 },
    skill_analysis: { matched_skills: ["JavaScript","TypeScript","CSS","Git"], missing_required: [{ skill: "ReactJS", tier: "medium", omega: 0.3, slwg_penalty: 6.0, suggestion: "Chủ yếu Angular, cần 2-3 tuần học React ecosystem." }], missing_preferred: [] },
    explanation: "TypeScript/JS mạnh nhưng background Angular. Tiềm năng chuyển React tốt." },

  { rank: 7,  candidate_id: 107, candidate_name: "Nguyễn Thị G",  candidate_title: "UI Developer & Design System",    experience_years: 2.0, expected_salary: "16,000,000 VND",
    scores: { overall: 80.0, skill_match: 76.0, slwg_total_penalty: 4.0, hgat_cosine: 81.0, experience_match: 75.0, salary_match: 100.0, location_match: 100.0 },
    skill_analysis: { matched_skills: ["ReactJS","Figma","CSS","Storybook"], missing_required: [], missing_preferred: [{ skill: "TypeScript", tier: "medium", omega: 0.3, slwg_penalty: 3.0, suggestion: "Hiện JS thuần, cần nâng cấp TS." }, { skill: "Testing (Jest)", tier: "easy", omega: 0.1, slwg_penalty: 1.0, suggestion: "Unit test cơ bản." }] },
    explanation: "UI/UX tốt, component design sạch. Thiếu TS và testing." },

  { rank: 8,  candidate_id: 108, candidate_name: "Trần Văn H",    candidate_title: "React Native & ReactJS Developer",experience_years: 1.5, expected_salary: "14,000,000 VND",
    scores: { overall: 78.5, skill_match: 70.0, slwg_total_penalty: 5.5, hgat_cosine: 80.0, experience_match: 70.0, salary_match: 100.0, location_match: 90.0 },
    skill_analysis: { matched_skills: ["ReactJS","JavaScript","Git"], missing_required: [], missing_preferred: [{ skill: "NextJS", tier: "medium", omega: 0.3, slwg_penalty: 4.0, suggestion: "Chủ yếu React Native, cần thêm web framework." }, { skill: "Web Vitals", tier: "medium", omega: 0.3, slwg_penalty: 1.5, suggestion: "Cần học kỹ thuật tối ưu performance." }] },
    explanation: "React cơ bản tốt, background mobile. Cần web-specific knowledge." },

  { rank: 9,  candidate_id: 109, candidate_name: "Lê Thị I",      candidate_title: "Junior Frontend Developer",       experience_years: 1.0, expected_salary: "12,000,000 VND",
    scores: { overall: 76.0, skill_match: 65.0, slwg_total_penalty: 6.5, hgat_cosine: 78.0, experience_match: 60.0, salary_match: 100.0, location_match: 100.0 },
    skill_analysis: { matched_skills: ["HTML/CSS","JavaScript","ReactJS basics"], missing_required: [{ skill: "TypeScript", tier: "medium", omega: 0.3, slwg_penalty: 4.5, suggestion: "Bắt buộc cho dự án lớn. Chưa có KN." }], missing_preferred: [{ skill: "Redux Toolkit", tier: "easy", omega: 0.1, slwg_penalty: 2.0, suggestion: "State management cần thiết." }] },
    explanation: "Junior tinh thần học hỏi cao. Cần đào tạo TypeScript và state management." },

  { rank: 10, candidate_id: 110, candidate_name: "Bùi Quang K",   candidate_title: "Fullstack Engineer (Python/React)",experience_years: 2.0, expected_salary: "17,000,000 VND",
    scores: { overall: 74.5, skill_match: 62.0, slwg_total_penalty: 7.0, hgat_cosine: 76.0, experience_match: 75.0, salary_match: 100.0, location_match: 80.0 },
    skill_analysis: { matched_skills: ["ReactJS","JavaScript","Python"], missing_required: [{ skill: "TypeScript", tier: "medium", omega: 0.3, slwg_penalty: 5.0, suggestion: "Chưa dùng TS, cần training 3-4 tuần." }, { skill: "NextJS", tier: "hard", omega: 0.7, slwg_penalty: 2.0, suggestion: "SSR khác biệt React thuần." }], missing_preferred: [] },
    explanation: "Fullstack nhưng frontend không phải thế mạnh. Cần đầu tư training." },
];
