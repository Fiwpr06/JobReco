'use client';

import { Heart } from "lucide-react";
import { Job } from "@/lib/types";
import { ApplyButton } from "./apply-button";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

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
      toast.success("Đã lưu công việc này!");
    } else {
      toast.info("Đã bỏ lưu công việc!");
    }
  };

  return (
    <div 
      onClick={() => router.push(`/jobs/${job.job_id}`)}
      className="cursor-pointer rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
    >
      {/* TOP */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex gap-4">
          {/* LOGO */}
          <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-white p-2">
             {job.logo_url ? (
               <img src={job.logo_url} alt={companyName} className="h-full w-full object-contain" />
             ) : (
               <div className="flex h-full w-full items-center justify-center rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 text-white font-black text-2xl">
                 {companyInitial}
               </div>
             )}
          </div>
          <div>
            <h3 className="line-clamp-2 text-xl font-bold text-slate-900">{title}</h3>
            <p className="mt-2 text-slate-500">{companyName}</p>
          </div>
        </div>
        <button 
          onClick={toggleBookmark}
          className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl border transition ${
            bookmarked 
              ? 'border-emerald-300 bg-emerald-50 text-emerald-500' 
              : 'border-slate-200 text-slate-400 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-500'
          }`}
        >
          <Heart size={20} fill={bookmarked ? "currentColor" : "none"} />
        </button>
      </div>

      {/* TAGS */}
      <div className="mt-6 flex flex-wrap gap-3">
        <span className="rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700">
          {job.salary_raw || 'Thương lượng'}
        </span>
        <span className="rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700">
          {job.job_address || 'Địa điểm'}
        </span>
        {job.experience_min_years !== undefined && (
          <span className="rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700">
            {job.experience_min_years} - {job.experience_max_years} năm
          </span>
        )}
      </div>

      {/* BUTTONS */}
      <div className="mt-7 flex gap-3">
        <button 
          className="w-fit rounded-2xl border-2 border-indigo-600 bg-white px-6 py-3 font-bold text-indigo-600 transition hover:scale-[1.02] hover:bg-indigo-50"
        >
          Xem chi tiết
        </button>
        {/* We can still keep Apply Button if needed, or rely on job details page */}
      </div>
    </div>
  );
}
