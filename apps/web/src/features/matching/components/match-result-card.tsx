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
} from "lucide-react";
import { useState } from "react";
import { MatchResult } from "@/lib/types";
import { SkillBadge } from "@/features/shared/components/skill-badge";
import { ApplyButton } from "@/features/jobs/components/apply-button";
import Link from "next/link";

interface MatchResultCardProps {
  result: MatchResult;
  onShowAnalysis?: (result: MatchResult) => void;
}

export function MatchResultCard({ result, onShowAnalysis }: MatchResultCardProps) {
  const [expanded, setExpanded] = useState(false);
  const { scores, skill_analysis } = result;

  const title = result.title_en || result.title_vi || "Job Title";
  const companyName =
    result.company_name || result.company_name_en || result.company_name_vi || "Company Name";

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
              <Link href={`/jobs/${result.job_id}`} className="hover:underline">
                <h3 className="font-fraunces text-xl font-bold text-primary">
                  {title}
                </h3>
              </Link>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted">
              <span className="font-medium text-primary/80">{companyName}</span>
              <span className="flex items-center gap-1">
                <MapPin className="w-4 h-4" /> {result.job_address || "Remote"}
              </span>
              <span className="flex items-center gap-1">
                <DollarSign className="w-4 h-4" />{" "}
                {result.salary_display || "Negotiable"}
              </span>
              <span className="flex items-center gap-1">
                <Briefcase className="w-4 h-4" />{" "}
                {result.job_type || "Full-time"}
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6">
          <ScoreBar label="Kỹ năng" score={scores.skill_match} />
          <ScoreBar label="Kinh nghiệm" score={scores.experience_match} />
          <ScoreBar label="Lương" score={scores.salary_match} />
          <ScoreBar label="Địa điểm" score={scores.location_match} />
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
                THIẾU:
              </span>
              <div className="flex flex-wrap gap-2 flex-1">
                {skill_analysis.missing_required.map((gap) => (
                  <SkillBadge
                    key={gap.skill}
                    skill={gap.skill}
                    tier={gap.tier}
                  />
                ))}
                {!expanded && skill_analysis.missing_preferred.length > 0 && (
                  <Badge
                    variant="outline"
                    className="bg-elevated text-muted border-border border-dashed"
                  >
                    +{skill_analysis.missing_preferred.length} khác
                  </Badge>
                )}
              </div>
            </div>
          )}
        </div>

        {/* AI Explanation */}
        {result.explanation && (
          <div className="bg-elevated/50 border border-border p-3 rounded-md mb-6">
            <p className="text-sm text-muted italic">
              " {result.explanation} "
            </p>
            {scores.slwg_total_penalty > 0 && (
              <p className="text-xs text-danger mt-2 font-jetbrains-mono">
                SLWG Penalty: -{scores.slwg_total_penalty.toFixed(2)} from gaps
              </p>
            )}
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
                <ChevronUp className="w-4 h-4 mr-2" /> Ẩn báo cáo chi tiết
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4 mr-2" /> Xem báo cáo chi tiết
              </>
            )}
          </Button>

          <div className="flex gap-3">
            <Link href={`/jobs/${result.job_id}`}>
              <Button
                variant="outline"
                className="border-border-mid hover:bg-elevated"
              >
                Xem chi tiết
              </Button>
            </Link>
            <ApplyButton jobId={result.job_id} applyUrl={result.apply_url} />
          </div>
        </div>

        {/* Expanded Analysis */}
        {expanded && (
          <div className="mt-6 pt-6 border-t border-border animate-in slide-in-from-top-4 fade-in duration-300">
            <h4 className="text-sm font-medium text-primary mb-4">
              Phân tích kỹ năng chi tiết
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {skill_analysis.missing_required.map((gap) => (
                <div
                  key={gap.skill}
                  className="bg-elevated p-4 rounded-md border border-border"
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-medium text-primary">
                      {gap.skill}
                    </span>
                    <SkillBadge skill="" tier={gap.tier} className="ml-2" />
                  </div>
                  <p className="text-xs text-muted">{gap.suggestion}</p>
                </div>
              ))}
              {skill_analysis.missing_preferred.map((gap) => (
                <div
                  key={gap.skill}
                  className="bg-elevated/50 p-4 rounded-md border border-border border-dashed"
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-medium text-muted">
                      {gap.skill}{" "}
                      <span className="text-[10px] ml-1 uppercase">
                        (Ưu tiên)
                      </span>
                    </span>
                    <SkillBadge
                      skill=""
                      tier={gap.tier}
                      className="ml-2 opacity-80"
                    />
                  </div>
                  <p className="text-xs text-muted/70">{gap.suggestion}</p>
                </div>
              ))}
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
        <span className="text-xs font-medium text-muted uppercase tracking-wide">
          {label}
        </span>
        <span className="text-xs font-jetbrains-mono font-bold text-primary">
          {percentage}%
        </span>
      </div>
      <Progress value={percentage} className="h-1.5 bg-elevated" />
    </div>
  );
}
