"use client";

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Target, Calendar, TrendingUp, BookOpen, ExternalLink, PlayCircle, FileText, Check, ArrowRight, X, LayoutDashboard } from 'lucide-react';
import { MatchResult } from '@/lib/types';

interface SkillRoadmapTimelineProps {
  onBack?: () => void;
  jobResult?: MatchResult;
}

export default function SkillRoadmapTimeline({ onBack, jobResult }: SkillRoadmapTimelineProps) {
  const [completedMilestones, setCompletedMilestones] = useState<Set<string>>(new Set());
  const [activeResource, setActiveResource] = useState<any>(null);

  const dynamicData = useMemo(() => {
    if (!jobResult) {
      return {
        current_score: 0,
        target_score: 100,
        gap_analysis: { total_weeks_needed: 0 },
        roadmap: []
      };
    }

    const missingSkills = [
      ...jobResult.skill_analysis.missing_required.map(s => ({ ...s, priority: 'CRITICAL' })),
      ...jobResult.skill_analysis.missing_preferred.map(s => ({ ...s, priority: 'HIGH' }))
    ];

    if (missingSkills.length === 0) {
      return {
        current_score: Math.round(jobResult.scores.overall),
        target_score: 100,
        gap_analysis: { total_weeks_needed: 1 },
        roadmap: [
          {
            phase: 1,
            title: "Sẵn sàng ứng tuyển",
            duration_weeks: 1,
            score_impact: "+10%",
            priority: "NORMAL",
            milestones: [
              {
                week: 1,
                task: "Chuẩn bị CV và Portfolio",
                deliverable: "CV hoàn thiện",
                resources: []
              }
            ]
          }
        ]
      };
    }

    const roadmap = missingSkills.map((skill, index) => {
      return {
        phase: index + 1,
        title: `Làm chủ ${skill.skill}`,
        duration_weeks: skill.priority === 'CRITICAL' ? 2 : 1,
        score_impact: `+${skill.priority === 'CRITICAL' ? 10 : 5}%`,
        priority: skill.priority,
        defer_recommendation: skill.suggestion,
        milestones: [
          {
            week: 1,
            task: `Học lý thuyết và cơ bản về ${skill.skill}`,
            deliverable: `Nắm vững cốt lõi ${skill.skill}`,
            resources: [
              { name: `Tài liệu chính thức ${skill.skill}`, type: 'doc' },
              { name: `Video hướng dẫn cơ bản`, type: 'course' }
            ]
          },
          ...(skill.priority === 'CRITICAL' ? [{
            week: 2,
            task: `Thực hành dự án thực tế với ${skill.skill}`,
            deliverable: `1 Mini project sử dụng ${skill.skill}`,
            github_template: `demo-${skill.skill.toLowerCase().replace(/\s+/g, '-')}-project`,
            resources: []
          }] : [])
        ]
      };
    });

    return {
      current_score: Math.round(jobResult.scores.overall),
      target_score: 100,
      gap_analysis: { 
        total_weeks_needed: roadmap.reduce((acc, r) => acc + r.duration_weeks, 0)
      },
      roadmap
    };
  }, [jobResult]);

  // Flatten milestones for progress calculation
  const totalMilestones = dynamicData.roadmap.reduce((acc, phase) => acc + (phase.milestones?.length || 0), 0);
  const progressPercent = totalMilestones === 0 ? 0 : Math.round((completedMilestones.size / totalMilestones) * 100);

  // Calculate dates
  const startDate = new Date();
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + dynamicData.gap_analysis.total_weeks_needed * 7);

  const toggleMilestone = (id: string) => {
    const newSet = new Set(completedMilestones);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setCompletedMilestones(newSet);
  };

  const getPriorityColor = (priority: string) => {
    if (priority === 'CRITICAL') return 'text-red-600 bg-red-50 border-red-200';
    if (priority === 'HIGH') return 'text-orange-600 bg-orange-50 border-orange-200';
    return 'text-yellow-600 bg-yellow-50 border-yellow-200';
  };

  const getResourceIcon = (type: string) => {
    if (type === 'course' || type === 'video') return <PlayCircle className="w-4 h-4" />;
    if (type === 'doc') return <FileText className="w-4 h-4" />;
    return <BookOpen className="w-4 h-4" />;
  };

  return (
    <div className="w-full max-w-5xl mx-auto p-6 font-sans text-slate-700 min-h-[800px] flex flex-col relative bg-slate-50 rounded-2xl border border-slate-200 shadow-xl">
      {/* HEADER */}
      <div className="p-6 bg-white border border-slate-200 rounded-xl mb-8 relative overflow-hidden shadow-sm">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-cyan-500"></div>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Target className="w-8 h-8 text-indigo-600" />
              <h1 className="text-2xl font-bold text-slate-900 tracking-wide uppercase">LỘ TRÌNH HỌC TẬP CÁ NHÂN HÓA</h1>
            </div>
            <div className="text-sm text-slate-500 flex items-center gap-2 font-medium">
              <span>Công việc:</span>
              <span className="text-slate-900 font-bold">{jobResult?.title_en || jobResult?.title_vi || 'Mục tiêu'}</span>
              <span className="mx-2 text-slate-300">•</span>
              <span>Độ phù hợp:</span>
              <span className="text-indigo-600 font-bold">{dynamicData.current_score}%</span>
              <ArrowRight className="w-4 h-4 text-indigo-400" />
              <span className="text-indigo-600 font-bold">100%</span>
              <span className="mx-2 text-slate-300">•</span>
              <span>Thời gian: {dynamicData.gap_analysis.total_weeks_needed} tuần</span>
            </div>
          </div>
          
          <div className="w-full md:w-64">
            <div className="flex justify-between text-xs mb-1 font-bold text-slate-500">
              <span>TIẾN ĐỘ TỔNG THỂ</span>
              <span className="text-indigo-600">{progressPercent}%</span>
            </div>
            <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
              <motion.div 
                className="h-full bg-gradient-to-r from-indigo-500 to-cyan-500"
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              />
            </div>
            <div className="text-xs text-slate-500 mt-2 text-right font-medium">
              Dự kiến hoàn tất: {endDate.toLocaleDateString('vi-VN')}
            </div>
          </div>
        </div>
      </div>

      {/* TIMELINE */}
      <div className="relative pl-4 md:pl-8 space-y-12 before:absolute before:inset-0 before:ml-4 md:before:ml-8 before:-translate-x-px md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-indigo-300 before:via-slate-200 before:to-transparent">
        {dynamicData.roadmap.map((phase, phaseIdx) => (
          <motion.div 
            key={phase.phase}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: phaseIdx * 0.2 }}
            className="relative"
          >
            {/* Phase Node */}
            <div className="absolute -left-6 md:-left-10 w-4 h-4 rounded-full bg-white border-4 border-indigo-500 shadow-sm z-10" />
            
            {/* Phase Header */}
            <div className="mb-6">
              <div className="flex flex-wrap items-center gap-3 mb-2">
                <h2 className="text-xl font-bold text-slate-900">GIAI ĐOẠN {phase.phase}: {phase.title}</h2>
                <span className="text-xs text-indigo-700 border border-indigo-200 bg-indigo-50 px-2.5 py-1 rounded-md font-bold">
                  {phase.duration_weeks} tuần ({phase.score_impact})
                </span>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-md border ${getPriorityColor(phase.priority)}`}>
                  {phase.priority === 'CRITICAL' ? 'RẤT QUAN TRỌNG' : phase.priority === 'HIGH' ? 'QUAN TRỌNG' : phase.priority}
                </span>
              </div>
              
              {phase.defer_recommendation && (
                <div className="text-sm text-amber-700 bg-amber-50 p-2.5 rounded-lg border border-amber-200 inline-block font-medium">
                  💡 {phase.defer_recommendation}
                </div>
              )}
            </div>

            {/* Milestones Grid */}
            {phase.milestones && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {phase.milestones.map((ms, msIdx) => {
                  const id = `p${phase.phase}-w${ms.week}`;
                  const isDone = completedMilestones.has(id);

                  return (
                    <motion.div
                      key={id}
                      whileHover={{ scale: 1.01 }}
                      className={`p-5 rounded-xl border transition-all duration-300 ${
                        isDone 
                          ? 'bg-green-50 border-green-200 shadow-sm' 
                          : 'bg-white border-slate-200 hover:border-indigo-300 hover:shadow-md'
                      }`}
                    >
                      <div className="flex gap-4">
                        {/* Checkbox */}
                        <button 
                          onClick={() => toggleMilestone(id)}
                          className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors mt-0.5 ${
                            isDone 
                              ? 'bg-green-500 border-green-500 text-white' 
                              : 'bg-white border-slate-300 text-transparent hover:border-indigo-400'
                          }`}
                        >
                          <Check className="w-4 h-4" />
                        </button>

                        <div className="flex-1">
                          <div className="text-xs text-indigo-600 font-bold mb-1 uppercase">Tuần {ms.week}</div>
                          <h3 className={`text-base font-bold mb-3 ${isDone ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                            {ms.task}
                          </h3>

                          {/* Deliverable */}
                          <div className="mb-3 p-3 bg-slate-50 border border-slate-100 rounded-lg text-sm text-slate-700 flex items-start gap-2">
                            <Target className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
                            <span><span className="text-slate-500 text-xs font-bold uppercase tracking-wide">Kết quả đầu ra:</span> <br/><span className="font-medium">{ms.deliverable}</span></span>
                          </div>

                          {/* Resources */}
                          {ms.resources && ms.resources.length > 0 && (
                            <div className="space-y-2 mt-4 border-t border-slate-100 pt-3">
                              <div className="text-xs text-slate-400 font-bold mb-2 uppercase tracking-wide">TÀI LIỆU GỢI Ý</div>
                              {ms.resources.map((res: any, idx: number) => (
                                <button
                                  key={idx}
                                  onClick={() => setActiveResource(res)}
                                  className="w-full flex items-center justify-between p-2.5 rounded-lg bg-indigo-50/50 border border-indigo-100 hover:bg-indigo-50 hover:border-indigo-200 transition-colors text-left group"
                                >
                                  <div className="flex items-center gap-2.5 text-sm text-slate-700 font-medium">
                                    <span className="text-indigo-500">{getResourceIcon(res.type)}</span>
                                    <span className="group-hover:text-indigo-700 transition-colors">{res.name}</span>
                                  </div>
                                  <ExternalLink className="w-3 h-3 text-slate-400 group-hover:text-indigo-500" />
                                </button>
                              ))}
                            </div>
                          )}

                          {(ms as any).github_template && (
                            <div className="mt-4 text-xs text-slate-600 flex items-center gap-2 bg-slate-50 p-2 rounded-lg border border-slate-100">
                              <span>📦 Mẫu tham khảo:</span>
                              <span className="text-indigo-700 font-bold bg-indigo-100 px-2 py-0.5 rounded">{ (ms as any).github_template }</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>
        ))}
      </div>

      {/* FOOTER ACTIONS */}
      <div className="mt-12 pt-6 border-t border-slate-200 flex justify-between gap-4 flex-wrap">
        <div>
          {onBack && (
            <button 
              onClick={onBack}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-white border border-slate-300 text-slate-700 hover:text-slate-900 hover:bg-slate-50 transition-colors text-sm font-bold shadow-sm"
            >
              <ArrowRight className="w-4 h-4 rotate-180" /> Quay lại báo cáo
            </button>
          )}
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-6 py-3 rounded-xl bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors text-sm font-bold shadow-sm">
            <LayoutDashboard className="w-4 h-4" /> Theo dõi tiến độ
          </button>
          <button className="flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 shadow-md hover:shadow-lg transition-all text-sm font-bold">
            <Calendar className="w-4 h-4" /> Xuất ra Lịch
          </button>
        </div>
      </div>

      {/* RESOURCE MODAL (Mock) */}
      <AnimatePresence>
        {activeResource && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="w-full max-w-lg bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xl"
            >
              <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <div className="flex items-center gap-2 text-indigo-600">
                  {getResourceIcon(activeResource.type)}
                  <span className="font-bold">Đang truy cập tài liệu</span>
                </div>
                <button onClick={() => setActiveResource(null)} className="text-slate-400 hover:text-slate-600 bg-white hover:bg-slate-100 p-1 rounded-full transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-8 text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center mx-auto mb-4 text-indigo-600">
                  <BookOpen className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-slate-900">{activeResource.name}</h3>
                <p className="text-slate-500 text-sm font-medium">Đang mở tài liệu từ nguồn bên ngoài...</p>
                <div className="mt-6 pt-4">
                  <button onClick={() => setActiveResource(null)} className="px-8 py-3 bg-indigo-600 text-white font-bold rounded-xl shadow-md hover:shadow-lg hover:bg-indigo-700 transition-all">
                    Đi tới Tài liệu
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
