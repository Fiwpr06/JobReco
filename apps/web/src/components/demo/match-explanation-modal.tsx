"use client";

import React, { useEffect, useState } from 'react';
import { motion, animate } from 'framer-motion';
import { Target, AlertCircle, CheckCircle2, Download, Check, Bot, Activity, X } from 'lucide-react';
import { MatchResult } from '@/lib/types';

// Animated Counter component
const AnimatedCounter = ({ value, duration = 1.5 }: { value: number, duration?: number }) => {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const controls = animate(0, value, {
      duration,
      ease: "easeOut",
      onUpdate: (latest) => {
        setDisplayValue(Math.round(latest));
      }
    });
    return () => controls.stop();
  }, [value, duration]);

  return <span>{displayValue}</span>;
};

interface MatchExplanationModalProps {
  onClose?: () => void;
  onViewRoadmap?: () => void;
  jobResult?: MatchResult;
}

const severityTranslations: Record<string, string> = {
  'CRITICAL': 'RẤT QUAN TRỌNG',
  'MODERATE': 'QUAN TRỌNG',
  'LOW': 'TÙY CHỌN'
};

const difficultyTranslations: Record<string, string> = {
  'easy': 'Dễ',
  'medium': 'Trung bình',
  'hard': 'Khó'
};

const breakdownTranslations: Record<string, string> = {
  'skill': 'Kỹ năng',
  'experience': 'Kinh nghiệm',
  'salary': 'Lương',
  'location': 'Địa điểm'
};

export default function MatchExplanationModal({ onClose, onViewRoadmap, jobResult }: MatchExplanationModalProps) {
  const data = jobResult ? {
    match_id: `JOB-${jobResult.job_id.toString().padStart(4, '0')}`,
    overall_score: jobResult.scores.overall * 100,
    breakdown: {
      skill: jobResult.scores.skill_match * 100,
      experience: jobResult.scores.experience_match * 100,
      salary: jobResult.scores.salary_match * 100,
      location: jobResult.scores.location_match * 100
    },
    missing_skills: [
      ...jobResult.skill_analysis.missing_required.map(s => ({
        name: s.skill,
        severity: 'CRITICAL',
        reasoning: s.suggestion,
        estimated_time: '1-2 tuần',
        impact_on_score: 5,
        learning_difficulty: 'medium'
      })),
      ...jobResult.skill_analysis.missing_preferred.map(s => ({
        name: s.skill,
        severity: 'MODERATE',
        reasoning: s.suggestion,
        estimated_time: '2-3 ngày',
        impact_on_score: 2,
        learning_difficulty: 'easy'
      }))
    ],
    strengths: jobResult.skill_analysis.matched_skills.map(skill => ({
      skill: skill,
      score: 100,
      evidence: "Đã có trong CV"
    })).slice(0, 4),
    ai_recommendation: jobResult.explanation || "Công việc này rất phù hợp với kỹ năng hiện tại của bạn.",
    next_steps: ["Ôn tập lại kỹ năng", "Chuẩn bị portfolio", "Ứng tuyển ngay"]
  } : {
    match_id: 'N/A',
    overall_score: 0,
    breakdown: { skill: 0, experience: 0, salary: 0, location: 0 },
    missing_skills: [],
    strengths: [],
    ai_recommendation: "Chưa có dữ liệu.",
    next_steps: []
  };

  return (
    <div className="min-h-screen bg-slate-900/40 flex items-center justify-center p-4 font-sans fixed inset-0 z-50 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, filter: 'blur(10px)', scale: 0.95 }}
        animate={{ opacity: 1, filter: 'blur(0px)', scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-3xl mx-auto bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden text-slate-700 relative max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-200 bg-slate-50 flex justify-between items-center relative overflow-hidden shrink-0">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-500"></div>
          <div className="flex items-center gap-3">
            <Target className="w-8 h-8 text-indigo-600" />
            <div>
              <h2 className="text-xl font-bold text-slate-900 tracking-wide leading-none">BÁO CÁO ĐỘ PHÙ HỢP</h2>
              <div className="text-xs text-slate-500 mt-1 font-medium">MÃ CÔNG VIỆC: {data.match_id}</div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right mr-4">
              <div className="text-xs text-slate-500 font-bold mb-1 uppercase tracking-wider">ĐIỂM TỔNG QUAN</div>
              <div className="text-4xl font-black text-indigo-600 leading-none">
                <AnimatedCounter value={data.overall_score} duration={2} />%
              </div>
            </div>
            {onClose && (
              <button 
                onClick={onClose}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors bg-white hover:bg-slate-100 p-1 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 space-y-8 overflow-y-auto custom-scrollbar">
          {/* BREAKDOWN */}
          <div>
            <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2 uppercase tracking-wide">
              <Activity className="w-5 h-5 text-indigo-500" /> CHI TIẾT ĐÁNH GIÁ
            </h3>
            <div className="grid grid-cols-2 gap-x-8 gap-y-4">
              {Object.entries(data.breakdown).map(([key, value], i) => (
                <div key={key}>
                  <div className="flex justify-between text-sm mb-1 font-medium text-slate-600">
                    <span className="capitalize">{breakdownTranslations[key] || key}</span>
                    <span className="text-indigo-600 font-bold"><AnimatedCounter value={value} duration={1.5 + i*0.2} />%</span>
                  </div>
                  <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${value}%` }}
                      transition={{ duration: 1, delay: 0.5 + i * 0.1, ease: "easeOut" }}
                      className="h-full bg-gradient-to-r from-indigo-500 to-cyan-500"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* MISSING SKILLS */}
          <div>
            <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2 uppercase tracking-wide">
              <AlertCircle className="w-5 h-5 text-orange-500" /> KỸ NĂNG CÒN THIẾU
            </h3>
            <div className="space-y-3">
              {data.missing_skills.length > 0 ? data.missing_skills.map((skill, i) => (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 1 + i * 0.2 }}
                  key={skill.name}
                  className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm relative overflow-hidden group hover:border-orange-200 transition-colors"
                >
                  <div className={`absolute top-0 left-0 w-1.5 h-full ${skill.severity === 'CRITICAL' ? 'bg-red-500' : skill.severity === 'MODERATE' ? 'bg-orange-500' : 'bg-yellow-500'}`}></div>
                  <div className="flex justify-between items-start ml-2">
                    <div>
                      <div className="flex items-center gap-3">
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-md ${skill.severity === 'CRITICAL' ? 'bg-red-50 text-red-600 border border-red-100' : skill.severity === 'MODERATE' ? 'bg-orange-50 text-orange-600 border border-orange-100' : 'bg-yellow-50 text-yellow-600 border border-yellow-100'}`}>
                          {severityTranslations[skill.severity] || skill.severity}
                        </span>
                        <span className="font-bold text-slate-900 text-base">{skill.name}</span>
                      </div>
                      <div className="text-sm text-slate-600 mt-2 leading-relaxed">{skill.reasoning}</div>
                      <div className="flex flex-wrap gap-4 mt-3 text-sm text-slate-500 font-medium bg-slate-50 p-2 rounded-lg border border-slate-100">
                        <span className="flex items-center gap-1.5">⏱ Thời gian học: <span className="text-slate-700 font-semibold">{skill.estimated_time}</span></span>
                        <span className="flex items-center gap-1.5">📊 Mức ảnh hưởng: <span className="text-red-600 font-semibold">-{skill.impact_on_score} điểm</span></span>
                        <span className="flex items-center gap-1.5">🧠 Độ khó: <span className="text-slate-700 font-semibold">{difficultyTranslations[skill.learning_difficulty] || skill.learning_difficulty}</span></span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )) : (
                <div className="p-4 rounded-xl bg-green-50 border border-green-100 text-green-700 font-medium flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-500" /> Bạn không thiếu kỹ năng quan trọng nào cho công việc này!
                </div>
              )}
            </div>
          </div>

          {/* STRENGTHS */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 2 }}
          >
            <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2 uppercase tracking-wide">
              <CheckCircle2 className="w-5 h-5 text-green-500" /> ĐIỂM MẠNH CỦA BẠN
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {data.strengths.map((item) => (
                <div key={item.skill} className="flex items-start gap-3 p-4 bg-green-50 border border-green-100 rounded-xl">
                  <div className="bg-green-100 p-1 rounded-full shrink-0">
                    <Check className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <div className="font-bold text-slate-800 text-sm">{item.skill} <span className="text-green-600 font-medium ml-1">({item.score}%)</span></div>
                    <div className="text-xs text-slate-500 mt-1 font-medium">{item.evidence}</div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* ĐỀ XUẤT TỪ HỆ THỐNG */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 2.5 }}
            className="p-6 bg-indigo-50 border border-indigo-100 rounded-2xl shadow-sm"
          >
            <div className="flex items-start gap-4">
              <div className="p-3 bg-white shadow-sm border border-indigo-100 rounded-xl shrink-0">
                <Bot className="w-6 h-6 text-indigo-600" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-indigo-900 mb-2 uppercase tracking-wide">ĐÁNH GIÁ TỪ HỆ THỐNG & BƯỚC TIẾP THEO</h4>
                <p className="text-sm text-slate-700 leading-relaxed mb-4 font-medium">
                  {data.ai_recommendation}
                </p>
                <ul className="space-y-2.5">
                  {data.next_steps.map((step, i) => (
                    <li key={i} className="text-sm text-slate-600 font-medium flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-indigo-500 shrink-0"></div>
                      {step}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-3 shrink-0">
          <button className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors text-sm font-bold shadow-sm">
            <Download className="w-4 h-4" /> Tải báo cáo PDF
          </button>
          {onViewRoadmap && (
            <button 
              onClick={onViewRoadmap}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors text-sm font-bold shadow-sm"
            >
              Xem lộ trình học tập
            </button>
          )}
          <button className="flex items-center gap-2 px-8 py-2.5 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 shadow-md hover:shadow-lg transition-all text-sm font-bold">
            Ứng tuyển ngay
          </button>
        </div>
      </motion.div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f8fafc;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
      `}</style>
    </div>
  );
}
