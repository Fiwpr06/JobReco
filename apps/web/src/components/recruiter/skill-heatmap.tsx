"use client";

import { useState } from "react";
import { BarChart2, Filter, Download } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ApiSkillData {
  skill: string;
  frequency: number;
  category: string;
}

export default function SkillHeatmap({ data }: { data: ApiSkillData[] }) {
  if (!data || !Array.isArray(data) || data.length === 0) return null;

  const total = data.reduce((acc, curr) => acc + curr.frequency, 0);
  const maxFreq = Math.max(...data.map(d => d.frequency));
  
  const skills = data.map(d => ({
    name: d.skill,
    percentage: maxFreq > 0 ? Math.round((d.frequency / maxFreq) * 100) : 0,
    count: d.frequency,
    strength_avg: 8 // Placeholder as API does not provide this
  }));
  
  const description = "Phân tích kỹ năng ứng viên";
  
  const [activeSkill, setActiveSkill] = useState<string | null>(null);

  const getColor = (percent: number) => {
    if (percent >= 70) return 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)] border-emerald-400';
    if (percent >= 40) return 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.3)] border-amber-400';
    return 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.3)] border-rose-400';
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 font-sans text-slate-700 shadow-sm">
      <div className="flex items-center justify-between mb-6 border-b border-slate-100 pb-5">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-50 rounded-lg">
            <BarChart2 className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 tracking-wide uppercase">SKILL HEATMAP</h2>
            <div className="text-xs text-slate-500 mt-0.5">{description}</div>
          </div>
        </div>
        <div className="flex gap-3">
          <button className="p-2 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 hover:text-indigo-600 transition-colors shadow-sm">
            <Filter className="w-4 h-4" />
          </button>
          <button className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200 text-xs rounded-xl hover:bg-slate-100 hover:text-indigo-600 font-semibold transition-colors shadow-sm">
            <Download className="w-4 h-4" /> Xuất CSV
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {skills.map((skill, index) => {
          const isActive = activeSkill === skill.name;
          return (
            <motion.div 
              key={skill.name}
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.08 }}
              onMouseEnter={() => setActiveSkill(skill.name)}
              onMouseLeave={() => setActiveSkill(null)}
              className={`relative flex items-center gap-4 cursor-pointer p-2.5 rounded-xl transition-colors ${isActive ? 'bg-slate-50 border border-slate-100' : 'border border-transparent'}`}
            >
              <div className="w-36 text-sm font-bold truncate">
                <span className={isActive ? 'text-indigo-700' : 'text-slate-700'}>{skill.name}</span>
              </div>
              
              <div className="flex-1 h-7 bg-slate-100 rounded-full overflow-hidden border border-slate-200 relative group">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${skill.percentage}%` }}
                  transition={{ duration: 0.8, ease: "easeOut", delay: 0.3 + index * 0.05 }}
                  className={`h-full border-r-2 ${getColor(skill.percentage)}`}
                />
                
                {/* Tooltip Hover */}
                <AnimatePresence>
                  {isActive && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap z-10 pointer-events-none"
                    >
                      <div className="bg-slate-800 text-white text-xs border border-slate-700 px-3 py-1.5 rounded-full font-semibold shadow-xl shadow-slate-900/20">
                        {skill.count} ứng viên ({skill.percentage}%) | Trung bình: {skill.strength_avg}/10
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="w-16 text-right text-sm font-bold text-slate-500">
                {skill.percentage}%
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="mt-8 pt-5 border-t border-slate-100 flex justify-between text-xs text-slate-500 font-medium">
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 bg-emerald-500 rounded-full shadow-sm" /> &ge; 70%</div>
          <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 bg-amber-500 rounded-full shadow-sm" /> 40% - 69%</div>
          <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 bg-rose-500 rounded-full shadow-sm" /> &lt; 40%</div>
        </div>
        <div>
          Tổng CV Phân Tích: <span className="text-indigo-600 font-bold ml-1">{total}</span>
        </div>
      </div>
    </div>
  );
}
