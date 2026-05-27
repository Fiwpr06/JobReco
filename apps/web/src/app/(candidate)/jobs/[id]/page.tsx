'use client';

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Job, MatchResult } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, MapPin, DollarSign, Briefcase, Calendar, Building2, Lock, Sparkles, Building, Globe, CheckCircle2, ChevronLeft, ArrowUpRight, Award, ShieldAlert, Check } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ApplyButton } from "@/features/jobs/components/apply-button";
import { MatchRadarChart } from "@/features/matching/components/radar-chart";
import { SkillBadge } from "@/features/shared/components/skill-badge";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";

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
  const { data: match, isLoading: matchLoading } = useQuery<MatchResult | null>({
    queryKey: ['jobMatch', jobId],
    queryFn: async () => {
      try {
        const res = await api.post(`/api/v1/matching/cv-to-jobs`, { top_k: 1 });
        return res.data.results[0] as MatchResult;
      } catch (e) {
        return null;
      }
    },
    enabled: status === 'authenticated' && !!job
  });

  if (jobLoading) {
    return (
      <div className="max-w-6xl mx-auto flex flex-col lg:flex-row gap-8 py-10 px-4">
        <div className="w-full lg:w-[65%] space-y-6">
          <Skeleton className="h-12 w-48 bg-slate-100 rounded-xl" />
          <Skeleton className="h-48 w-full bg-slate-100 rounded-3xl" />
          <Skeleton className="h-[400px] w-full bg-slate-100 rounded-3xl" />
        </div>
        <div className="w-full lg:w-[35%]">
          <Skeleton className="h-[550px] w-full bg-slate-100 rounded-3xl" />
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="max-w-xl mx-auto text-center py-20 px-4">
        <div className="w-20 h-20 bg-slate-100 rounded-3xl flex items-center justify-center mx-auto mb-6">
          <Building2 className="w-10 h-10 text-slate-400" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2 font-fraunces">Không tìm thấy công việc</h2>
        <p className="text-slate-500 mb-6">Liên kết bạn theo dõi có thể đã hết hạn hoặc không tồn tại.</p>
        <Button onClick={() => router.push('/jobs')} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-2xl transition">
          Quay lại danh sách công việc
        </Button>
      </div>
    );
  }

  const title = job.title_vi || job.title_en || 'Job Title';
  const companyName = job.company_name_vi || job.company_name_en || 'Company Name';
  const companyInitial = companyName.charAt(0).toUpperCase();
  
  // Format requirements & benefits safely
  const rawRequirements = job.job_requirements_vi || job.job_requirements_en || '';
  const requirements = rawRequirements
    .split('\n')
    .map(s => s.trim())
    .filter(s => s.length > 0 && s !== '-');
    
  const rawBenefits = job.benefit_vi || job.benefit_en || '';
  const benefits = rawBenefits
    .split('\n')
    .map(s => s.trim())
    .filter(s => s.length > 0 && s !== '-');

  const overallScore = match ? Math.min(100, Math.round(match.scores.overall > 1 ? match.scores.overall : match.scores.overall * 100)) : 0;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 relative pb-24 md:pb-8">
      
      {/* 1. BREADCRUMBS & FLOATING/STICKY BACK NAVIGATION BAR */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
          <Link href="/jobs" className="hover:text-indigo-600 transition">Việc làm</Link>
          <span>/</span>
          <span className="text-slate-600 truncate max-w-[200px]">{title}</span>
        </div>
        
        <div className="flex items-center gap-4">
          <button 
            onClick={() => router.back()} 
            className="group flex items-center gap-2 px-4 py-2.5 rounded-2xl border border-slate-200 bg-white text-slate-700 font-bold text-sm shadow-sm transition-all hover:bg-slate-50 hover:border-slate-300 hover:shadow"
          >
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
            Quay lại danh sách
          </button>

          {job.apply_url && (
            <a 
              href={job.apply_url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-700 hover:underline"
            >
              Xem tin gốc tại nguồn <ArrowUpRight className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      </div>

      {/* 2. HERO CARD SECTION */}
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative overflow-hidden rounded-[32px] border border-slate-200 bg-white p-6 sm:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.03)] mb-8"
      >
        {/* Decorative background glow */}
        <div className="absolute -right-24 -top-24 w-96 h-96 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center gap-6 relative z-10">
          {/* Logo container */}
          <div className="w-20 h-20 bg-gradient-to-tr from-indigo-50 to-purple-50 border border-indigo-100 rounded-3xl flex items-center justify-center shadow-inner shrink-0">
            {job.logo_url ? (
              <img src={job.logo_url} alt={companyName} className="h-full w-full object-contain p-2" />
            ) : (
              <div className="font-extrabold text-2xl text-indigo-600">{companyInitial}</div>
            )}
          </div>

          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2.5 flex-wrap">
              <Badge className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-100 text-xs font-bold px-3 py-1 rounded-full">
                {job.job_category || "Công nghệ"}
              </Badge>
              {job.job_type && (
                <Badge variant="outline" className="text-slate-500 border-slate-200 text-xs font-semibold px-3 py-1 rounded-full">
                  {job.job_type}
                </Badge>
              )}
            </div>

            <h1 className="font-fraunces text-2xl sm:text-3xl font-black text-slate-900 leading-tight mb-2">
              {title}
            </h1>
            
            <p className="text-slate-700 font-bold text-base sm:text-lg flex items-center gap-2 mb-6">
              {companyName}
            </p>

            {/* Quick Specs Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-5 border-t border-slate-100 text-sm">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl text-slate-400">
                  <MapPin className="w-4 h-4 text-indigo-600" />
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Địa điểm</div>
                  <div className="font-bold text-slate-800 truncate max-w-[130px]">{job.job_address || 'Việt Nam'}</div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl text-slate-400">
                  <DollarSign className="w-4 h-4 text-emerald-500" />
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Lương</div>
                  <div className="font-bold text-slate-800">{job.salary_raw || 'Thỏa thuận'}</div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl text-slate-400">
                  <Calendar className="w-4 h-4 text-amber-500" />
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Kinh nghiệm</div>
                  <div className="font-bold text-slate-800">
                    {job.experience_min_years !== undefined 
                      ? `${job.experience_min_years} - ${job.experience_max_years || '5+'} năm` 
                      : 'Không yêu cầu'}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl text-slate-400">
                  <Briefcase className="w-4 h-4 text-purple-600" />
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Hình thức</div>
                  <div className="font-bold text-slate-800">{job.job_type || 'Full-time'}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* 3. MAIN CONTENT GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* LEFT COLUMN: DETAILED INFO (65%) */}
        <div className="lg:col-span-8 space-y-8">
          
          {/* Mô tả công việc */}
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.15 }}
            className="rounded-[32px] border border-slate-200 bg-white p-6 sm:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.02)]"
          >
            <h3 className="font-fraunces text-xl font-black text-slate-900 mb-5 flex items-center gap-2">
              <span className="w-1.5 h-6 bg-indigo-600 rounded-full" />
              Mô tả công việc
            </h3>
            <div className="text-slate-600 leading-relaxed whitespace-pre-wrap font-dm-sans text-sm sm:text-base">
              {job.job_description_vi || job.job_description_en || 'Chưa cập nhật chi tiết mô tả công việc.'}
            </div>
          </motion.div>

          {/* Yêu cầu tuyển dụng */}
          {requirements.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.25 }}
              className="rounded-[32px] border border-slate-200 bg-white p-6 sm:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.02)]"
            >
              <h3 className="font-fraunces text-xl font-black text-slate-900 mb-5 flex items-center gap-2">
                <span className="w-1.5 h-6 bg-indigo-600 rounded-full" />
                Yêu cầu ứng viên
              </h3>
              <div className="space-y-4">
                {requirements.map((req, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="p-1 bg-indigo-50 border border-indigo-100 rounded-lg text-indigo-600 shrink-0 mt-0.5">
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </div>
                    <span className="text-slate-600 font-medium text-sm sm:text-base leading-relaxed">
                      {req.replace(/^[-\*\•\s]+/, '')}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Quyền lợi & Chế độ */}
          {benefits.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.35 }}
              className="rounded-[32px] border border-slate-200 bg-white p-6 sm:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.02)]"
            >
              <h3 className="font-fraunces text-xl font-black text-slate-900 mb-5 flex items-center gap-2">
                <span className="w-1.5 h-6 bg-indigo-600 rounded-full" />
                Quyền lợi được hưởng
              </h3>
              <div className="space-y-4">
                {benefits.map((ben, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="p-1 bg-emerald-50 border border-emerald-100 rounded-lg text-emerald-600 shrink-0 mt-0.5">
                      <CheckCircle2 className="w-3.5 h-3.5 stroke-[2]" />
                    </div>
                    <span className="text-slate-600 font-medium text-sm sm:text-base leading-relaxed">
                      {ben.replace(/^[-\*\•\s]+/, '')}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* BACK & APPLY BUTTONS AT BOTTOM OF CONTENT */}
          <div className="flex items-center gap-4 pt-4 border-t border-slate-100">
            <button 
              onClick={() => router.back()} 
              className="px-6 py-3.5 rounded-2xl border border-slate-200 bg-white text-slate-700 font-bold text-sm shadow-sm transition hover:bg-slate-50 hover:scale-[1.02]"
            >
              Quay lại danh sách
            </button>
            <ApplyButton jobId={job.id} applyUrl={job.apply_url} className="px-8 py-3.5 font-bold rounded-2xl flex-1 md:flex-initial shadow-lg shadow-indigo-100 transition hover:scale-[1.02]" />
          </div>
        </div>

        {/* RIGHT COLUMN: AI MATCH & SIDEBAR (35%) */}
        <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-24">
          
          {/* AI MATCH PANEL */}
          {status !== 'authenticated' ? (
            <div className="rounded-[32px] border border-slate-200 bg-white p-6 sm:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] text-center relative overflow-hidden">
              <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-indigo-500 to-purple-500" />
              <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-indigo-100">
                <Lock className="w-6 h-6 text-indigo-600" />
              </div>
              <h3 className="font-fraunces text-lg font-bold text-slate-900 mb-2">Xem điểm phù hợp (AI Match)</h3>
              <p className="text-slate-500 text-xs leading-relaxed mb-6">
                Đăng nhập và tải lên CV để hệ thống Neural Network phân tích mức độ tương thích về kỹ năng & kinh nghiệm của bạn đối với công việc này.
              </p>
              <Link href="/auth/login" className="block">
                <Button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 rounded-2xl shadow-md transition hover:scale-[1.02]">
                  Đăng nhập ngay
                </Button>
              </Link>
            </div>
          ) : matchLoading ? (
            <div className="rounded-[32px] border border-slate-200 bg-white p-8 shadow-sm space-y-4">
              <Skeleton className="h-10 w-1/2 bg-slate-100 rounded-lg mx-auto" />
              <Skeleton className="h-40 w-40 rounded-full bg-slate-100 mx-auto" />
              <Skeleton className="h-20 w-full bg-slate-100 rounded-xl" />
            </div>
          ) : match ? (
            <div className="rounded-[32px] border border-slate-200 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden relative">
              <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-600" />
              
              {/* Score Header */}
              <div className="p-6 border-b border-slate-100 bg-slate-50/50 text-center relative">
                <span className="text-[10px] font-bold text-indigo-600 tracking-widest uppercase flex items-center justify-center gap-1.5 mb-2 bg-indigo-50/80 border border-indigo-100/50 w-fit mx-auto px-2.5 py-0.5 rounded-full">
                  <Sparkles className="w-3 h-3 text-indigo-500 animate-pulse" /> Neural Matching HGAT
                </span>
                <h3 className="font-fraunces text-base font-bold text-slate-800">Mức độ tương thích</h3>
                
                {/* SVG Radial Meter */}
                <div className="relative w-36 h-36 mx-auto mt-5 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                    {/* Background Arc */}
                    <circle 
                      cx="50" cy="50" r="40" 
                      stroke="#f1f5f9" strokeWidth="8" fill="none"
                      strokeDasharray="251.2"
                    />
                    {/* Colored Arc */}
                    <motion.circle 
                      cx="50" cy="50" r="40" 
                      stroke="url(#matchGradient)" strokeWidth="8" fill="none"
                      strokeDasharray="251.2"
                      initial={{ strokeDashoffset: 251.2 }}
                      animate={{ strokeDashoffset: 251.2 - (251.2 * overallScore) / 100 }}
                      transition={{ duration: 1.2, ease: "easeOut" }}
                      strokeLinecap="round"
                    />
                    {/* Gradients */}
                    <defs>
                      <linearGradient id="matchGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#6366f1" />
                        <stop offset="100%" stopColor="#a855f7" />
                      </linearGradient>
                    </defs>
                  </svg>
                  
                  {/* Inside Text */}
                  <div className="absolute text-center">
                    <div className="text-4xl font-extrabold text-slate-900 font-jetbrains-mono tracking-tighter">{overallScore}</div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">% phù hợp</div>
                  </div>
                </div>
              </div>
              
              {/* Progress bars & Skill analysis */}
              <div className="p-6 space-y-6">
                
                {/* Visual scores */}
                <div>
                  <h4 className="text-[10px] font-bold text-slate-400 tracking-wider uppercase mb-3 flex items-center gap-1.5">
                    <Award className="w-3.5 h-3.5 text-indigo-500" />
                    Thành phần điểm số
                  </h4>
                  <MatchRadarChart scores={match.scores} />
                </div>

                <hr className="border-slate-100" />

                {/* Skill gaps */}
                <div>
                  <h4 className="text-[10px] font-bold text-slate-400 tracking-wider uppercase mb-3 flex items-center gap-1.5">
                    <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
                    Kỹ năng còn thiếu (Skill Gaps)
                  </h4>
                  
                  {match.skill_analysis.missing_required.length === 0 ? (
                    <div className="text-xs font-semibold text-emerald-600 bg-emerald-50/50 border border-emerald-100 p-4 rounded-2xl flex gap-2">
                      <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-500" />
                      <span>Tuyệt vời! Bạn đáp ứng đầy đủ tất cả kỹ năng quan trọng mà nhà tuyển dụng yêu cầu.</span>
                    </div>
                  ) : (
                    <div className="space-y-3.5">
                      {match.skill_analysis.missing_required.map(gap => (
                        <div key={gap.skill} className="p-3 bg-slate-50/50 border border-slate-100 rounded-2xl">
                          <div className="flex justify-between items-center mb-1">
                            <span className="font-bold text-slate-800 text-xs">{gap.skill}</span>
                            <SkillBadge skill="" tier={gap.tier} />
                          </div>
                          {gap.suggestion && (
                            <p className="text-[11px] text-slate-500 mt-1 leading-relaxed border-l-2 border-slate-200 pl-2">
                              {gap.suggestion}
                            </p>
                          )}
                        </div>
                      ))}
                      
                      <div className="pt-3 border-t border-dashed border-slate-200 flex justify-between items-center text-[10px] text-slate-400 font-bold uppercase font-jetbrains-mono">
                        <span>Điểm trừ kỹ năng</span>
                        <span className="text-rose-500">-{match.scores.slwg_total_penalty.toFixed(1)}%</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Apply direct CTA */}
                <div className="pt-2">
                  <ApplyButton jobId={job.id} applyUrl={job.apply_url} className="w-full py-3.5 text-base font-bold rounded-2xl shadow-md" />
                </div>
              </div>
            </div>
          ) : null}

          {/* QUICK COMPANY STATS CARD */}
          <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.02)]">
            <h4 className="font-fraunces text-base font-black text-slate-900 mb-4 flex items-center gap-2">
              <Building className="w-4 h-4 text-slate-400" />
              Thông tin công ty
            </h4>
            <div className="space-y-4 text-sm">
              <div>
                <span className="text-slate-400 font-bold text-[10px] uppercase tracking-wider block mb-0.5">Tên doanh nghiệp</span>
                <span className="text-slate-800 font-semibold leading-snug block">{companyName}</span>
              </div>
              {job.company_size && (
                <div>
                  <span className="text-slate-400 font-bold text-[10px] uppercase tracking-wider block mb-0.5">Quy mô</span>
                  <span className="text-slate-800 font-semibold">{job.company_size} nhân viên</span>
                </div>
              )}
              {job.job_address_detail && (
                <div>
                  <span className="text-slate-400 font-bold text-[10px] uppercase tracking-wider block mb-0.5">Địa chỉ chi tiết</span>
                  <span className="text-slate-800 font-semibold leading-relaxed block">{job.job_address_detail}</span>
                </div>
              )}
              {job.apply_url && (
                <div className="pt-2 border-t border-slate-100">
                  <a 
                    href={job.apply_url} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-700 hover:underline flex items-center gap-1"
                  >
                    Xem tin gốc tuyển dụng <ArrowUpRight className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 4. RESPONSIVE STICKY ACTION BAR FOR MOBILE */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-4 py-3 flex gap-3 shadow-lg">
        <button 
          onClick={() => router.back()} 
          className="p-3.5 rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <ApplyButton jobId={job.id} applyUrl={job.apply_url} className="flex-1 py-3.5 text-sm font-bold rounded-xl" />
      </div>

    </div>
  );
}
