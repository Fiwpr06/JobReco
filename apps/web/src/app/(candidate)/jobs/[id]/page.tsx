'use client';

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Job, MatchResult, SkillGap } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, MapPin, DollarSign, Briefcase, Calendar, Building2, Lock } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ApplyButton } from "@/features/jobs/components/apply-button";
import { MatchRadarChart } from "@/features/matching/components/radar-chart";
import { SkillBadge } from "@/features/shared/components/skill-badge";
import { useSession } from "next-auth/react";

export default function JobDetailPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = params.id as string;
  const { status } = useSession();

  // Fetch job details
  const { data: job, isLoading: jobLoading } = useQuery<Job>({
    queryKey: ['job', jobId],
    queryFn: async () => {
      try {
        const res = await api.get(`/api/v1/jobs/${jobId}`);
        return res.data;
      } catch (e) {
        throw new Error("Failed to load job details. Please ensure the backend is running.");
      }
    }
  });

  // Fetch match details for this specific job if logged in
  const { data: match, isLoading: matchLoading } = useQuery<MatchResult>({
    queryKey: ['jobMatch', jobId],
    queryFn: async () => {
      try {
        // Assume backend has an endpoint or we filter cv-to-jobs
        const res = await api.post(`/api/v1/matching/cv-to-jobs`, { top_k: 1 }); // Mocking the idea
        return res.data.results[0] as MatchResult;
      } catch (e) {
        return null;
      }
    },
    enabled: status === 'authenticated' && !!job
  });

  if (jobLoading) {
    return (
      <div className="max-w-6xl mx-auto flex gap-8">
        <div className="w-[60%] space-y-4"><Skeleton className="h-[500px] w-full bg-surface" /></div>
        <div className="w-[40%]"><Skeleton className="h-[400px] w-full bg-surface" /></div>
      </div>
    );
  }

  if (!job) return <div>Không tìm thấy công việc</div>;

  const title = job.title_en || job.title_vi || 'Job Title';
  const companyName = job.company_name_en || job.company_name_vi || 'Company Name';
  const requirements = (job.job_requirements_en || job.job_requirements_vi || '').split('\n').filter(s => s.trim().length > 0);
  const benefits = (job.benefit_en || job.benefit_vi || '').split('\n').filter(s => s.trim().length > 0);

  return (
    <div className="max-w-6xl mx-auto pb-12">
      <Button variant="ghost" onClick={() => router.back()} className="mb-6 -ml-4 text-muted hover:text-primary">
        <ArrowLeft className="w-4 h-4 mr-2" /> Quay lại kết quả
      </Button>

      <div className="flex flex-col lg:flex-row gap-8 items-start">
        {/* LEFT: JOB INFO PANEL (60%) */}
        <div className="w-full lg:w-[60%] space-y-8">
          {/* Header */}
          <div>
            <div className="w-16 h-16 bg-elevated rounded-xl flex items-center justify-center mb-6 border border-border">
              <Building2 className="w-8 h-8 text-muted" />
            </div>
            <h1 className="font-fraunces text-3xl font-bold text-primary mb-2">{title}</h1>
            <div className="text-lg text-muted mb-6">{companyName}</div>
            
            <div className="flex flex-wrap items-center gap-6 text-sm text-primary/80">
              <span className="flex items-center gap-2"><MapPin className="w-4 h-4 text-muted" /> {job.job_address || 'Từ xa'}</span>
              <span className="flex items-center gap-2"><DollarSign className="w-4 h-4 text-muted" /> {job.salary_raw || 'Thỏa thuận'}</span>
              <span className="flex items-center gap-2"><Briefcase className="w-4 h-4 text-muted" /> {job.job_type || 'Toàn thời gian'}</span>
              {job.experience_min_years !== undefined && (
                <span className="flex items-center gap-2"><Calendar className="w-4 h-4 text-muted" /> {job.experience_min_years} - {job.experience_max_years} năm</span>
              )}
            </div>
          </div>

          <hr className="border-border" />

          {/* Requirements Chips */}
          {requirements.length > 0 && (
            <div>
              <h3 className="font-fraunces text-xl font-bold mb-4">Yêu cầu công việc</h3>
              <div className="flex flex-wrap gap-2">
                {requirements.map((req, i) => (
                  <Badge key={i} variant="outline" className="bg-elevated border-border text-primary font-jetbrains-mono font-normal">
                    {req.replace(/^- /, '')}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Full Description */}
          <div>
            <h3 className="font-fraunces text-xl font-bold mb-4">Mô tả công việc</h3>
            <div className="prose prose-invert max-w-none text-muted leading-relaxed whitespace-pre-wrap font-dm-sans">
              {job.job_description_en || job.job_description_vi || 'Không có mô tả.'}
            </div>
          </div>

          {/* Benefits */}
          {benefits.length > 0 && (
            <div>
              <h3 className="font-fraunces text-xl font-bold mb-4">Quyền lợi</h3>
              <ul className="space-y-2">
                {benefits.map((ben, i) => (
                  <li key={i} className="flex items-start gap-3 text-muted">
                    <span className="text-success mt-1">•</span>
                    <span>{ben.replace(/^- /, '')}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          <div className="pt-4 flex gap-4">
            <Button variant="outline" onClick={() => router.back()} className="border-border">
              Quay lại
            </Button>
            <ApplyButton jobId={job.job_id} applyUrl={job.apply_url} className="px-8" />
          </div>
        </div>

        {/* RIGHT: MATCH PANEL (40%) - Sticky */}
        <div className="w-full lg:w-[40%] sticky top-24">
          {status !== 'authenticated' ? (
            <div className="bg-surface border border-border p-8 rounded-xl text-center">
              <Lock className="w-12 h-12 text-muted mx-auto mb-4 opacity-50" />
              <h3 className="font-fraunces text-xl font-bold mb-2">Đăng nhập để xem mức độ phù hợp</h3>
              <p className="text-muted text-sm mb-6">Hệ thống sẽ phân tích CV của bạn so với yêu cầu công việc để dự đoán mức độ thành công.</p>
              <Link href="/auth/login">
                <Button className="w-full bg-accent hover:bg-accent/90">Đăng nhập</Button>
              </Link>
            </div>
          ) : matchLoading ? (
            <Skeleton className="h-[500px] w-full bg-surface rounded-xl" />
          ) : match ? (
            <div className="bg-surface border border-border rounded-xl overflow-hidden shadow-2xl">
              <div className="p-6 border-b border-border bg-base/50 text-center relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-accent/10 to-transparent pointer-events-none" />
                <h3 className="font-fraunces text-lg font-bold text-primary relative z-10">Hệ thống Phân tích</h3>
                <div className="font-jetbrains-mono text-5xl font-bold text-accent mt-2 relative z-10">
                  {Math.min(100, Math.round(match.scores.overall > 1 ? match.scores.overall : match.scores.overall * 100))}%
                </div>
              </div>
              
              <div className="p-6">
                <div className="h-64 mb-6 -mt-4">
                  <MatchRadarChart scores={match.scores} />
                </div>

                <hr className="border-border mb-6" />

                <h4 className="font-medium text-sm text-primary mb-4 uppercase tracking-widest">Phân tích Kỹ năng thiếu sót</h4>
                
                {match.skill_analysis.missing_required.length === 0 ? (
                  <div className="text-sm text-success bg-success/10 p-3 rounded-md border border-success/20">
                    Không phát hiện thiếu sót kỹ năng quan trọng! Bạn đáp ứng tất cả yêu cầu cốt lõi.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {match.skill_analysis.missing_required.map(gap => (
                      <div key={gap.skill}>
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-medium text-primary text-sm flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-danger" />
                            {gap.skill}
                          </span>
                          <SkillBadge skill="" tier={gap.tier} />
                        </div>
                        <p className="text-xs text-muted ml-3.5 italic border-l-2 border-border-mid pl-3 mt-2">
                          {gap.suggestion}
                        </p>
                      </div>
                    ))}
                    <div className="mt-4 pt-4 border-t border-border border-dashed">
                      <p className="text-sm font-jetbrains-mono text-danger flex justify-between">
                        <span>Tổng điểm trừ kỹ năng:</span>
                        <span>-{match.scores.slwg_total_penalty.toFixed(2)}</span>
                      </p>
                    </div>
                  </div>
                )}

                <div className="mt-8">
                  <ApplyButton jobId={job.job_id} applyUrl={job.apply_url} className="w-full h-12 text-lg" />
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
