"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  ChevronDown,
  ChevronUp,
  MapPin,
  DollarSign,
  Briefcase,
  User
} from "lucide-react";
import { useState } from "react";
import { SkillBadge } from "@/features/shared/components/skill-badge";
import Link from "next/link";

// Candidate interface based on the API response we mocked
export interface CandidateResult {
  rank: number;
  candidate_id: number;
  candidate_name: string;
  candidate_title: string;
  experience_years: number;
  expected_salary?: string;
  scores: {
    overall: number;
    skill_match: number;
    slwg_total_penalty: number;
    hgat_cosine: number;
    experience_match: number;
    salary_match: number;
    location_match: number;
  };
  skill_analysis: {
    matched_skills: string[];
    missing_required: {
      skill: string;
      tier: string;
      omega: number;
      slwg_penalty: number;
      suggestion: string;
    }[];
    missing_preferred: {
      skill: string;
      tier: string;
      omega: number;
      slwg_penalty: number;
      suggestion: string;
    }[];
  };
  explanation: string;
  cv_url?: string;
}

interface CandidateResultCardProps {
  result: CandidateResult;
  onShowAnalysis?: (result: CandidateResult) => void;
}

export function CandidateResultCard({ result, onShowAnalysis }: CandidateResultCardProps) {
  const [expanded, setExpanded] = useState(false);
  const { scores, skill_analysis } = result;

  return (
    <Card className="bg-surface border-border-mid hover:border-accent/50 transition-colors mb-4 overflow-hidden relative group">
      {/* Glow effect on hover */}
      <div className="absolute inset-0 bg-gradient-to-r from-accent/0 via-accent/5 to-accent/0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

      <CardContent className="p-6">
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <Badge className="bg-accent text-white hover:bg-accent font-jetbrains-mono px-2">
                #{result.rank}
              </Badge>
              <h3 className="font-fraunces text-xl font-bold text-primary flex items-center gap-2">
                <User className="w-5 h-5 text-accent" />
                {result.candidate_name}
              </h3>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted mt-2">
              <span className="font-medium text-primary/80 bg-slate-100 px-3 py-1 rounded-full">{result.candidate_title}</span>
              <span className="flex items-center gap-1 bg-slate-100 px-3 py-1 rounded-full">
                <Briefcase className="w-4 h-4" /> {result.experience_years} năm kinh nghiệm
              </span>
              <span className="flex items-center gap-1 bg-slate-100 px-3 py-1 rounded-full">
                <DollarSign className="w-4 h-4" />{" "}
                {result.expected_salary || "Thoả thuận"}
              </span>
            </div>
          </div>
          <div className="flex flex-col items-end">
            <div className="font-jetbrains-mono text-4xl font-bold text-accent mb-1">
              {Math.round(scores.overall)}%
            </div>
            <div className="text-xs text-muted font-medium uppercase tracking-wider">
              Độ Phù Hợp
            </div>
          </div>
        </div>

        {/* Scores Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6 bg-slate-50 p-4 rounded-xl border border-slate-100">
          <ScoreBar label="Kỹ năng" score={scores.skill_match} />
          <ScoreBar label="Kinh nghiệm" score={scores.experience_match} />
          <ScoreBar label="Mức lương" score={scores.salary_match} />
          <ScoreBar label="Vị trí" score={scores.location_match} />
        </div>

        {/* Skills Summary */}
        <div className="space-y-4 mb-6">
          {skill_analysis.matched_skills.length > 0 && (
            <div className="flex items-start gap-3">
              <span className="text-sm font-medium text-muted w-20 pt-1">
                ĐÃ CÓ:
              </span>
              <div className="flex flex-wrap gap-2 flex-1">
                {skill_analysis.matched_skills.map((skill) => (
                  <SkillBadge key={skill} skill={skill} matched />
                ))}
              </div>
            </div>
          )}

          {(skill_analysis.missing_required.length > 0 ||
            skill_analysis.missing_preferred.length > 0) && (
            <div className="flex items-start gap-3">
              <span className="text-sm font-medium text-muted w-20 pt-1">
                CÒN THIẾU:
              </span>
              <div className="flex flex-wrap gap-2 flex-1">
                {skill_analysis.missing_required.map((gap) => (
                  <SkillBadge
                    key={gap.skill}
                    skill={gap.skill}
                    tier={gap.tier as 'easy' | 'medium' | 'hard'}
                  />
                ))}
                {!expanded && skill_analysis.missing_preferred.length > 0 && (
                  <Badge
                    variant="outline"
                    className="bg-elevated text-muted border-border border-dashed"
                  >
                    +{skill_analysis.missing_preferred.length} kỹ năng ưu tiên
                  </Badge>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Giải thích từ hệ thống */}
        {result.explanation && (
          <div className="bg-indigo-50/50 border border-indigo-100 p-4 rounded-xl mb-6">
            <p className="text-sm text-slate-700 font-medium">
              <span className="font-bold text-indigo-700">Hệ thống FASTART nhận xét: </span>
              "{result.explanation}"
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-between items-center mt-6 pt-4 border-t border-border">
          <Button
            variant="ghost"
            className="text-muted hover:text-primary"
            onClick={() => onShowAnalysis ? onShowAnalysis(result) : setExpanded(!expanded)}
          >
            {expanded ? (
              <>
                <ChevronUp className="w-4 h-4 mr-2" /> Ẩn báo cáo Hệ thống
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4 mr-2" /> Phân tích chi tiết bằng Hệ thống
              </>
            )}
          </Button>

          <div className="flex gap-3">
            <Button
              variant="outline"
              className="border-indigo-200 text-indigo-600 hover:bg-indigo-50"
            >
              Xem CV Gốc
            </Button>
            <Button className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg">
              Liên Hệ Ứng Viên
            </Button>
          </div>
        </div>

        {/* Expanded Analysis */}
        {expanded && (
          <div className="mt-6 pt-6 border-t border-border animate-in slide-in-from-top-4 fade-in duration-300">
            <h4 className="text-sm font-bold text-indigo-700 mb-4 uppercase tracking-wider">
              CHI TIẾT LỖ HỔNG KỸ NĂNG & ĐỀ XUẤT ĐÀO TẠO
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {skill_analysis.missing_required.map((gap) => (
                <div
                  key={gap.skill}
                  className="bg-white p-4 rounded-xl border border-rose-100 shadow-sm"
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-bold text-slate-900">
                      {gap.skill}
                    </span>
                    <SkillBadge skill="" tier={gap.tier as 'easy' | 'medium' | 'hard'} className="ml-2" />
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">{gap.suggestion}</p>
                </div>
              ))}
              {skill_analysis.missing_preferred.map((gap) => (
                <div
                  key={gap.skill}
                  className="bg-slate-50 p-4 rounded-xl border border-slate-200 border-dashed"
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-medium text-slate-600">
                      {gap.skill}{" "}
                      <span className="text-[10px] ml-1 uppercase text-amber-600 font-bold">
                        (Cần ưu tiên)
                      </span>
                    </span>
                    <SkillBadge
                      skill=""
                      tier={gap.tier as 'easy' | 'medium' | 'hard'}
                      className="ml-2 opacity-80"
                    />
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">{gap.suggestion}</p>
                </div>
              ))}
              
              {skill_analysis.missing_required.length === 0 && skill_analysis.missing_preferred.length === 0 && (
                  <div className="col-span-1 md:col-span-2 text-center py-6 text-emerald-600 bg-emerald-50 rounded-xl border border-emerald-100">
                      🎉 Ứng viên này đã đáp ứng đầy đủ toàn bộ yêu cầu của Job! Không phát hiện lỗ hổng kỹ năng.
                  </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ScoreBar({ label, score }: { label: string; score: number }) {
  const percentage = Math.round(score);
  return (
    <div>
      <div className="flex justify-between items-center mb-2">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">
          {label}
        </span>
        <span className="text-xs font-jetbrains-mono font-bold text-indigo-600">
          {percentage}%
        </span>
      </div>
      <Progress value={percentage} className="h-2 bg-slate-200 [&>div]:bg-indigo-500" />
    </div>
  );
}
