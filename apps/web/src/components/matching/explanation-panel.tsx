"use client";

import React, { useRef } from "react";
import { MatchRadarChart } from "@/features/matching/components/radar-chart";
import { SkillBadge } from "@/features/shared/components/skill-badge";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

// Replicating schema types based on backend schemas
type SkillGapDetail = {
  skill: string;
  tier: "easy" | "medium" | "hard";
  omega: number;
  slwg_penalty: number;
  suggestion: string;
};

interface ExplanationPanelProps {
  matchData: {
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
      missing_required: SkillGapDetail[];
      missing_preferred: SkillGapDetail[];
    };
    explanation: string;
  };
}

export function ExplanationPanel({ matchData }: ExplanationPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  const { scores, skill_analysis, explanation } = matchData;

  const exportPDF = async () => {
    if (!panelRef.current) return;
    try {
      const canvas = await html2canvas(panelRef.current, { scale: 2 });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save("Bao_Cao_He_Thong.pdf");
    } catch (error) {
      console.error("Failed to export PDF", error);
    }
  };

  // Group missing skills by severity
  const criticalSkills = skill_analysis.missing_required.filter(
    (s) => s.tier === "hard" || s.slwg_penalty >= 5.0
  );
  const moderateSkills = [
    ...skill_analysis.missing_required.filter(
      (s) => s.tier !== "hard" && s.slwg_penalty < 5.0
    ),
    ...skill_analysis.missing_preferred.filter((s) => s.tier === "hard"),
  ];
  const niceToHaveSkills = skill_analysis.missing_preferred.filter(
    (s) => s.tier !== "hard"
  );

  const ProgressBar = ({ label, value }: { label: string; value: number }) => (
    <div className="mb-3">
      <div className="flex justify-between text-sm mb-1">
        <span className="font-semibold">{label}</span>
        <span>{Math.round(value * 100)}%</span>
      </div>
      <div className="w-full bg-slate-800 rounded-full h-2">
        <div
          className="bg-[#00ff00] h-2 rounded-full"
          style={{ width: `${Math.max(0, Math.min(100, value * 100))}%` }}
        />
      </div>
    </div>
  );

  return (
    <div className="p-4 bg-black text-white border border-[#333] rounded-lg max-w-4xl mx-auto shadow-xl">
      {/* Header */}
      <div className="flex justify-between items-center mb-6 border-b border-[#333] pb-4">
        <h2 className="text-xl font-bold font-mono tracking-tight text-[#00ff00]">
          GIẢI THÍCH MỨC ĐỘ PHÙ HỢP TỪ HỆ THỐNG
        </h2>
        <Button
          onClick={exportPDF}
          variant="outline"
          size="sm"
          className="bg-transparent border-[#333] hover:bg-[#111] hover:text-[#00ff00] text-sm"
        >
          <Download className="w-4 h-4 mr-2" />
          Export PDF
        </Button>
      </div>

      {/* Main Content to Export */}
      <div ref={panelRef} className="bg-black p-4 -m-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Left Column: Scores & Chart */}
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4 border-l-4 border-[#00ff00] pl-2">
                Score Breakdown
              </h3>
              <div className="bg-[#111] p-4 rounded-md border border-[#222]">
                <ProgressBar label="Overall Match" value={scores.overall} />
                <ProgressBar label="Skill Match" value={scores.skill_match} />
                <ProgressBar label="Experience Match" value={scores.experience_match} />
                <ProgressBar label="Salary Match" value={scores.salary_match} />
                <ProgressBar label="Location Match" value={scores.location_match} />
              </div>
            </div>

            <div className="bg-[#111] p-4 rounded-md border border-[#222]">
               <MatchRadarChart scores={scores} />
            </div>
          </div>

          {/* Right Column: Explanations & Gaps */}
          <div className="space-y-6">
            
            {/* Why you're a good fit */}
            <div>
              <h3 className="text-lg font-semibold mb-4 border-l-4 border-[#00ff00] pl-2">
                Why You're A Good Fit
              </h3>
              <p className="text-sm text-gray-300 leading-relaxed mb-4">
                {explanation}
              </p>
              <div>
                <span className="text-xs text-gray-500 uppercase tracking-wider mb-2 block">Matched Skills</span>
                <div className="flex flex-wrap gap-2">
                  {skill_analysis.matched_skills.map((skill) => (
                    <SkillBadge key={skill} skill={skill} matched={true} />
                  ))}
                  {skill_analysis.matched_skills.length === 0 && (
                    <span className="text-sm text-gray-500">None detected.</span>
                  )}
                </div>
              </div>
            </div>

            {/* Missing Skills by Severity */}
            <div>
              <h3 className="text-lg font-semibold mb-4 border-l-4 border-[#ff003c] pl-2">
                Skill Gaps (SLWG Severity)
              </h3>
              <div className="space-y-4">
                
                {/* CRITICAL */}
                {criticalSkills.length > 0 && (
                  <div>
                    <span className="text-xs text-[#ff003c] font-bold uppercase tracking-wider mb-2 block">
                      Critical Restrictions
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {criticalSkills.map((s) => (
                        <div key={s.skill} title={s.suggestion} className="cursor-help">
                          <SkillBadge skill={s.skill} tier={s.tier} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* MODERATE */}
                {moderateSkills.length > 0 && (
                  <div>
                    <span className="text-xs text-orange-400 font-bold uppercase tracking-wider mb-2 block">
                      Moderate Impact
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {moderateSkills.map((s) => (
                        <div key={s.skill} title={s.suggestion} className="cursor-help">
                          <SkillBadge skill={s.skill} tier={s.tier} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* NICE TO HAVE */}
                {niceToHaveSkills.length > 0 && (
                  <div>
                    <span className="text-xs text-yellow-400 font-bold uppercase tracking-wider mb-2 block">
                      Nice To Have (Bonus)
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {niceToHaveSkills.map((s) => (
                        <div key={s.skill} title={s.suggestion} className="cursor-help">
                          <SkillBadge skill={s.skill} tier={s.tier} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {criticalSkills.length === 0 && moderateSkills.length === 0 && niceToHaveSkills.length === 0 && (
                  <span className="text-sm text-[#00ff00]">You have all the requested skills!</span>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
