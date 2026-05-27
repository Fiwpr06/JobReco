'use client';

import { Heart, MapPin, DollarSign, Calendar, ChevronRight } from "lucide-react";
import { Job } from "@/lib/types";
import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

interface JobCardProps {
  job: Job;
}

export function JobCard({ job }: JobCardProps) {
  const router = useRouter();
  const [bookmarked, setBookmarked] = useState(false);

  const title = job.title_vi || job.title_en || 'Job Title';
  const companyName = job.company_name_vi || job.company_name_en || 'Company Name';
  const companyInitial = companyName.charAt(0).toUpperCase();

  const toggleBookmark = (e: React.MouseEvent) => {
    e.stopPropagation();
    setBookmarked(!bookmarked);
    if (!bookmarked) {
      toast.success("Đã lưu công việc thành công!");
    } else {
      toast.info("Đã hủy lưu công việc.");
    }
  };

  return (
    <motion.div 
      whileHover={{ y: -6, scale: 1.015 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      onClick={() => router.push(`/jobs/${job.id}`)}
      className="group relative cursor-pointer overflow-hidden rounded-[28px] border border-slate-200/80 bg-white p-6 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] transition-all hover:border-indigo-200 hover:shadow-[0_20px_40px_-15px_rgba(99,102,241,0.12)]"
    >
      {/* Decorative gradient glow on card hover */}
      <div className="absolute -right-20 -top-20 h-40 w-40 rounded-full bg-gradient-to-br from-indigo-500/10 to-purple-500/10 opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100" />

      {/* Header Info */}
      <div className="flex items-start justify-between gap-4 relative z-10">
        <div className="flex gap-4">
          {/* Logo container */}
          <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-100 bg-slate-50/50 p-2 shadow-inner group-hover:border-indigo-100 group-hover:bg-indigo-50/20 transition-all duration-300">
             {job.logo_url ? (
               <img src={job.logo_url} alt={companyName} className="h-full w-full object-contain" />
             ) : (
               <div className="flex h-full w-full items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-500/90 to-purple-500/90 text-white font-extrabold text-xl shadow-sm">
                 {companyInitial}
               </div>
             )}
          </div>
          <div>
            <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider bg-indigo-50/80 border border-indigo-100/50 px-2 py-0.5 rounded-md">
              {job.job_category || "Công nghệ"}
            </span>
            <h3 className="mt-1.5 line-clamp-2 text-md font-bold text-slate-900 leading-snug group-hover:text-indigo-600 transition-colors duration-300">
              {title}
            </h3>
            <p className="mt-1 text-xs font-semibold text-slate-500">
              {companyName}
            </p>
          </div>
        </div>

        {/* Bookmark Button */}
        <button 
          onClick={toggleBookmark}
          className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border transition-all duration-300 ${
            bookmarked 
              ? 'border-pink-200 bg-pink-50 text-pink-500 shadow-sm shadow-pink-100' 
              : 'border-slate-100 text-slate-400 hover:border-pink-200 hover:bg-pink-50 hover:text-pink-500'
          }`}
        >
          <Heart size={16} fill={bookmarked ? "currentColor" : "none"} className={bookmarked ? "scale-110" : "group-hover:scale-110 transition-transform"} />
        </button>
      </div>

      {/* Meta Specifications Tags */}
      <div className="mt-5 flex flex-wrap gap-2 relative z-10">
        <div className="flex items-center gap-1.5 rounded-xl bg-slate-50/80 border border-slate-100 px-3.5 py-1.5 text-xs font-bold text-slate-700">
          <DollarSign size={14} className="text-emerald-500" />
          <span>{job.salary_raw || 'Thỏa thuận'}</span>
        </div>
        <div className="flex items-center gap-1.5 rounded-xl bg-slate-50/80 border border-slate-100 px-3.5 py-1.5 text-xs font-bold text-slate-700">
          <MapPin size={14} className="text-indigo-500" />
          <span className="truncate max-w-[120px]">{job.job_address || 'Địa điểm'}</span>
        </div>
        {job.experience_min_years !== undefined && (
          <div className="flex items-center gap-1.5 rounded-xl bg-slate-50/80 border border-slate-100 px-3.5 py-1.5 text-xs font-bold text-slate-700">
            <Calendar size={14} className="text-amber-500" />
            <span>
              {job.experience_min_years === 0 && (!job.experience_max_years || job.experience_max_years <= 1)
                ? 'Fresher/Intern'
                : `${job.experience_min_years}-${job.experience_max_years || '5+'} năm exp`}
            </span>
          </div>
        )}
      </div>

      {/* Footer / Action */}
      <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4 relative z-10">
        <span className="text-[11px] font-bold text-slate-400 uppercase font-mono tracking-tight">
          {job.job_type || 'Full-time'}
        </span>
        <div className="flex items-center gap-1 text-xs font-bold text-indigo-600 group-hover:text-indigo-700 transition-colors">
          <span>Xem chi tiết</span>
          <ChevronRight size={14} className="transform transition-transform group-hover:translate-x-1" />
        </div>
      </div>
    </motion.div>
  );
}
