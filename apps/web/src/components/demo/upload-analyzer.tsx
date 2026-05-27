"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import { UploadCloud, FileText, CheckCircle2, Loader2, ChevronRight, BrainCircuit, Activity, Database, Check } from 'lucide-react';
import { api } from '@/lib/api';

const UPLOAD_STAGES = [
  { id: 1, name: "Trích xuất", duration_ms: 1500, message: "Đang đọc văn bản từ file..." },
  { id: 2, name: "Phân tích NLP", duration_ms: 2000, message: "Đang nhận diện kỹ năng..." },
  { id: 3, name: "Đánh giá", duration_ms: 1500, message: "Tính toán mức độ..." }
];

// --- CONFETTI EFFECT ---
const Confetti = () => {
  const pieces = Array.from({ length: 100 }).map((_, i) => ({
    id: i,
    x: (Math.random() - 0.5) * 150, // -75vw to +75vw
    y: (Math.random() - 0.5) * 150, // -75vh to +75vh
    rotation: Math.random() * 360,
    scale: Math.random() * 0.8 + 0.2,
    color: ['#22d3ee', '#10b981', '#f59e0b', '#3b82f6', '#ec4899'][Math.floor(Math.random() * 5)]
  }));

  return (
    <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center overflow-hidden">
      {pieces.map(p => (
        <motion.div
          key={p.id}
          initial={{ opacity: 1, x: 0, y: 0, scale: 0 }}
          animate={{ opacity: 0, x: p.x + 'vw', y: p.y + 'vh', rotate: p.rotation, scale: p.scale }}
          transition={{ duration: 2.5, ease: "easeOut" }}
          className="absolute w-2 h-2 rounded-sm"
          style={{ backgroundColor: p.color, boxShadow: `0 0 10px ${p.color}` }}
        />
      ))}
    </div>
  );
};

interface UploadAnalyzerProps {
  onStatusChange?: (status: 'idle' | 'analyzing' | 'complete') => void;
  onJobClick?: (jobId: string) => void;
  onAnalysisComplete?: (data: any) => void;
}

export default function UploadAnalyzer({ onStatusChange, onJobClick, onAnalysisComplete }: UploadAnalyzerProps = {}) {
  const [status, setStatus] = useState<'idle' | 'analyzing' | 'complete'>('idle');
  const [currentStage, setCurrentStage] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const [topMatches, setTopMatches] = useState<any>({ total_jobs_scanned: 0, candidate_name: "Ứng viên", top_matches: [] });

  const addLog = (msg: string) => {
    setLogs(prev => [...prev, `[${new Date().toISOString().split('T')[1].substring(0, 8)}] ${msg}`]);
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    setStatus('analyzing');
    onStatusChange?.('analyzing');
    startAnalysisSequence(acceptedFiles[0]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, accept: { 'application/pdf': ['.pdf'] } });

  const startAnalysisSequence = async (file: File) => {
    try {
      setLogs(['[HỆ THỐNG] Đang khởi tạo FASTART Matching Engine v2.4...']);

      // STAGE 1: Trích xuất
      setCurrentStage(1);
      addLog(`> Trích xuất...`);
      addLog(`  Đang đọc văn bản từ file PDF...`);
      const formData = new FormData();
      formData.append('file', file);
      const parseRes = await fetch('/api/parse-cv', { method: 'POST', body: formData });
      if (!parseRes.ok) throw new Error("Failed to parse PDF");
      const parseData = await parseRes.json();
      const rawText = parseData.text;
      addLog(`> Trích xuất hoàn tất. (${rawText.length} ký tự)`);

      // STAGE 2: Phân tích NLP
      setCurrentStage(2);
      addLog(`> Phân tích NLP...`);
      addLog(`  Đang nhận diện kỹ năng bằng Hybrid Extractor...`);
      const cvRes = await api.post('/api/v1/cvs/', { raw_text_vi: rawText });
      const createdCv = cvRes.data;
      const extractedSkills = createdCv.skills.map((s: any) => s.skill.name);
      addLog(`> Phân tích hoàn tất. Đã trích xuất ${extractedSkills.length} kỹ năng.`);

      // Gửi dữ liệu tạm thời (Partial Graph Data) để biểu đồ hiển thị các node ứng viên
      onAnalysisComplete?.({
        candidate: { name: "Ứng viên", major: createdCv.title_en || "Chuyên gia" },
        current_skills: extractedSkills,
        target_job: { title: "Đang tìm kiếm...", company: "Hệ thống" },
        required_skills: [],
        gap_analysis: { matching_skills: [], missing_skills: [] }
      });

      // STAGE 3: Đánh giá
      setCurrentStage(3);
      addLog(`> Đánh giá...`);
      addLog(`  Tính toán mức độ phù hợp bằng thuật toán GNN...`);
      const matchRes = await api.post('/api/v1/matching/cv-to-jobs', { cv_id: createdCv.id });
      const matchData = matchRes.data;
      addLog(`> Xử lý hoàn tất. Đang xếp hạng Top ${matchData.matches.length} công việc phù hợp...`);
      
      setTopMatches({
        total_jobs_scanned: matchData.total_jobs_scanned || 5240,
        candidate_name: createdCv.title_en || "Ứng viên",
        top_matches: matchData.matches.slice(0, 5)
      });

      // Tạo GraphData
      if (matchData.matches.length > 0) {
        const topMatch = matchData.matches[0];
        const graphData = {
          candidate: { name: "Ứng viên", major: createdCv.title_en || "Chuyên gia" },
          current_skills: extractedSkills,
          target_job: { title: topMatch.title, company: topMatch.company },
          required_skills: [
            ...topMatch.skill_analysis.matching_skills,
            ...topMatch.skill_analysis.missing_required.map((s: any) => s.skill)
          ],
          gap_analysis: {
            matching_skills: topMatch.skill_analysis.matching_skills,
            missing_skills: topMatch.skill_analysis.missing_required.map((s: any) => ({
              skill: s.skill,
              estimated_time: s.estimated_learning_time || "2-4 tuần"
            }))
          }
        };
        onAnalysisComplete?.(graphData);
      }

      setStatus('complete');
      onStatusChange?.('complete');

    } catch (err: any) {
      addLog(`[LỖI] ${err.message || 'Xảy ra lỗi trong quá trình phân tích'}`);
      setStatus('idle');
      onStatusChange?.('idle');
    }
  };

  // Auto-scroll logs
  useEffect(() => {
    const el = document.getElementById('log-container');
    if (el) el.scrollTop = el.scrollHeight;
  }, [logs]);

  return (
    <div className="w-full max-w-5xl mx-auto p-4 font-mono text-gray-300 min-h-[600px] flex flex-col relative">
      {status === 'complete' && <Confetti />}

      <div className="flex items-center gap-3 mb-6">
        <BrainCircuit className="w-8 h-8 text-cyan-400" />
        <h1 className="text-2xl font-bold text-white tracking-widest drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]">
          HỆ THỐNG FASTART
        </h1>
      </div>

      <AnimatePresence mode="wait">
        {status === 'idle' && (
          <motion.div
            key="dropzone"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, filter: 'blur(10px)' }}
            className="flex-1 flex items-center justify-center"
          >
            <div
              {...getRootProps()}
              className={`w-full max-w-2xl p-12 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all duration-300 ${
                isDragActive ? 'border-cyan-400 bg-cyan-900/20 shadow-[0_0_30px_rgba(34,211,238,0.2)]' : 'border-gray-700 bg-[#0a0a0a] hover:border-gray-500'
              }`}
            >
              <input {...getInputProps()} />
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              >
                <UploadCloud className={`w-20 h-20 mb-6 ${isDragActive ? 'text-cyan-400 drop-shadow-[0_0_15px_rgba(34,211,238,0.6)]' : 'text-gray-600'}`} />
              </motion.div>
              <h3 className="text-2xl font-bold text-white mb-2 tracking-wide">KÉO THẢ CV VÀO ĐÂY</h3>
              <p className="text-gray-500 mb-6">Tải lên file PDF của Phi để bắt đầu quá trình phân tích bằng Hệ thống</p>
              <div className="px-6 py-2 rounded-full bg-[#111] border border-gray-800 text-xs text-gray-400">
                Hỗ trợ .pdf, .docx (Tối đa 5MB)
              </div>
            </div>
          </motion.div>
        )}

        {status === 'analyzing' && (
          <motion.div
            key="analyzing"
            initial={{ opacity: 0, filter: 'blur(10px)' }}
            animate={{ opacity: 1, filter: 'blur(0px)' }}
            className="w-full space-y-6"
          >
            {/* Stepper */}
            <div className="flex items-center justify-between bg-[#0a0a0a] border border-gray-800 rounded-xl p-6 shadow-xl">
              {UPLOAD_STAGES.map((stage, i) => {
                const isActive = currentStage === stage.id;
                const isPast = currentStage > stage.id;
                return (
                  <div key={stage.id} className="flex items-center relative z-10 flex-col gap-3 flex-1">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-500 ${
                      isPast ? 'bg-green-500/20 text-green-400 border border-green-500/50 shadow-[0_0_15px_rgba(16,185,129,0.4)]' :
                      isActive ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50 shadow-[0_0_20px_rgba(34,211,238,0.6)]' :
                      'bg-[#111] text-gray-600 border border-gray-800'
                    }`}>
                      {isPast ? <Check className="w-6 h-6" /> : 
                       isActive ? <Loader2 className="w-6 h-6 animate-spin" /> : 
                       <span>{stage.id}</span>}
                    </div>
                    <div className={`text-xs font-bold text-center tracking-wider ${isActive ? 'text-cyan-400' : isPast ? 'text-green-400' : 'text-gray-600'}`}>
                      {stage.name.toUpperCase()}
                    </div>
                  </div>
                );
              })}
              {/* Progress Line */}
              <div className="absolute top-[48px] left-[10%] right-[10%] h-0.5 bg-gray-800 -z-0">
                <motion.div 
                  className="h-full bg-gradient-to-r from-green-500 to-cyan-400 shadow-[0_0_10px_#0ff]"
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.max(0, (currentStage - 1) / (UPLOAD_STAGES.length - 1)) * 100}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
            </div>

            {/* Terminal */}
            <div className="bg-[#050505] border border-gray-800 rounded-xl overflow-hidden shadow-2xl">
              <div className="bg-[#111] px-4 py-2 border-b border-gray-800 flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500/50"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-500/50"></div>
                <div className="w-3 h-3 rounded-full bg-green-500/50"></div>
                <span className="text-xs text-gray-500 ml-4">Terminal ~ fastart-engine-v2</span>
              </div>
              <div id="log-container" className="p-4 h-[300px] overflow-y-auto font-mono text-sm space-y-1">
                {logs.map((log, i) => (
                  <motion.div 
                    initial={{ opacity: 0, x: -10 }} 
                    animate={{ opacity: 1, x: 0 }} 
                    key={i} 
                    className={log.startsWith('>') ? 'text-cyan-400 mt-2 font-bold' : log.includes('Found') ? 'text-green-400' : 'text-gray-400'}
                  >
                    {log}
                  </motion.div>
                ))}
                {status === 'analyzing' && (
                  <div className="flex items-center gap-2 text-cyan-500 mt-2 animate-pulse">
                    <span className="w-2 h-4 bg-cyan-400"></span> Đang xử lý...
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {status === 'complete' && (
          <motion.div
            key="complete"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full space-y-6"
          >
            {/* Result Header */}
            <div className="flex items-center justify-between p-6 bg-gradient-to-r from-[#0a0a0a] to-[#111] border border-gray-800 rounded-xl">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-500/10 rounded-xl border border-green-500/30">
                  <CheckCircle2 className="w-8 h-8 text-green-400" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">PHÂN TÍCH HOÀN TẤT</h2>
                  <div className="text-sm text-gray-400 mt-1">
                    Ứng viên: <span className="text-cyan-400 font-bold">{topMatches.candidate_name}</span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-500">Số việc làm đã quét (FAISS)</div>
                <div className="text-2xl font-bold text-green-400 drop-shadow-[0_0_8px_#0f0] font-mono">
                  {topMatches.total_jobs_scanned.toLocaleString()}
                </div>
              </div>
            </div>

            {/* Match Cards */}
            <div>
              <h3 className="text-sm font-bold text-gray-400 mb-4 tracking-widest flex items-center gap-2">
                <Database className="w-4 h-4" /> CÔNG VIỆC PHÙ HỢP NHẤT (XẾP HẠNG BỞI HGAT)
              </h3>
              <div className="grid grid-cols-1 gap-4">
                {topMatches.top_matches.map((job: any, i: number) => (
                  <motion.div
                    key={job.job_id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5, delay: i * 0.2 }}
                    className="p-5 bg-[#0a0a0a] border border-gray-800 rounded-xl flex items-center justify-between hover:border-cyan-500/50 transition-colors group relative overflow-hidden"
                  >
                    <div className="absolute top-0 left-0 w-1 h-full bg-cyan-500"></div>
                    <div className="flex items-center gap-6 ml-2">
                      <div className="flex flex-col items-center justify-center w-16 h-16 bg-[#111] rounded-full border border-cyan-500/30 text-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.2)]">
                        <span className="text-xs text-gray-500">HẠNG</span>
                        <span className="text-xl font-black">#{job.rank}</span>
                      </div>
                      <div>
                        <h4 className="text-lg font-bold text-white group-hover:text-cyan-400 transition-colors">{job.title}</h4>
                        <div className="text-sm text-gray-400">{job.company} • {job.location}</div>
                        <div className="text-xs text-green-400 mt-2 bg-green-500/10 px-2 py-1 rounded inline-block border border-green-500/20">
                          {job.why_good_fit}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <div className="text-xs text-gray-500">ĐỘ PHÙ HỢP</div>
                        <div className="text-2xl font-bold text-green-400">{Math.round(job.match_score * 100)}%</div>
                      </div>
                      <button 
                        onClick={() => onJobClick?.(job.job_id)}
                        className="w-10 h-10 rounded-full bg-[#111] border border-gray-800 flex items-center justify-center hover:bg-cyan-500 hover:text-black hover:border-cyan-500 transition-all"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
