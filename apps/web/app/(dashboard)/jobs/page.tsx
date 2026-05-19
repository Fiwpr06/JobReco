'use client';

'use client';

import { useState, useEffect } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { JobCard } from "@/components/job-card";
import { JobCardSkeleton } from "@/components/skeleton/job-card-skeleton";
import { Search, MapPin, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { Job } from "@/lib/types";

export default function JobsBrowsePage() {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  
  // Filter states matching the jobreco-fe select items
  const [location, setLocation] = useState("Tất cả địa điểm");
  const [salaryRange, setSalaryRange] = useState("Mức lương");
  const [level, setLevel] = useState("Level");

  // Simple debounce logic for search
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedQuery(query), 400);
    return () => clearTimeout(handler);
  }, [query]);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useInfiniteQuery({
    queryKey: ['jobs', debouncedQuery, location, salaryRange, level],
    queryFn: async ({ pageParam = 0 }) => {
      try {
        // Map selected filter options to API parameters
        let expParam = "&min_experience=10"; // Default
        if (level === "Intern" || level === "Fresher") expParam = "&min_experience=0";
        if (level === "Junior") expParam = "&min_experience=2";
        if (level === "Senior") expParam = "&min_experience=5";
        if (level === "Leader/Manager") expParam = "&min_experience=8";

        let queryParam = debouncedQuery;
        // If location is specific, we can append it to the search query if backend doesn't support a separate location param
        if (location !== "Tất cả địa điểm") {
          queryParam = `${queryParam} ${location}`.trim();
        }

        const res = await api.get(`/api/v1/jobs?query=${encodeURIComponent(queryParam)}&skip=${pageParam}&limit=12${expParam}`);
        return res.data as Job[];
      } catch (e) {
        // Mock fallback jobs for presentations
        return [
          {
            id: 1, job_id: 'job-1', apply_url: '#', title_vi: 'Tổng Đài Viên Tư Vấn/ Telesales Tại Bình Thạnh', 
            company_name_vi: 'CÔNG TY TNHH IT-COMMUNICATIONS VIỆT NAM', job_address: 'Hồ Chí Minh', salary_raw: '10 - 20 triệu', 
            experience_min_years: 0, experience_max_years: 1, job_type: 'Toàn thời gian',
            job_requirements_vi: 'Giao tiếp tốt\nBán hàng\nTelesales', is_active: true,
            salary_is_negotiable: false
          },
          {
            id: 2, job_id: 'job-2', apply_url: '#', title_vi: 'Senior Frontend Developer ReactJS', 
            company_name_vi: 'FPT Software', job_address: 'Đà Nẵng', salary_raw: '15 - 25 triệu', 
            experience_min_years: 3, experience_max_years: 5, job_type: 'Toàn thời gian',
            job_requirements_vi: 'ReactJS\nJavaScript\nCSS', is_active: true,
            salary_is_negotiable: false
          },
          {
            id: 3, job_id: 'job-3', apply_url: '#', title_vi: 'UI/UX Designer', 
            company_name_vi: 'VNG Corporation', job_address: 'Hồ Chí Minh', salary_raw: '18 - 30 triệu', 
            experience_min_years: 2, experience_max_years: 4, job_type: 'Toàn thời gian',
            job_requirements_vi: 'Figma\nPhotoshop\nDesign', is_active: true,
            salary_is_negotiable: false
          }
        ];
      }
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => Array.isArray(lastPage) && lastPage.length === 12 ? allPages.length * 12 : undefined,
  });

  const jobs = data?.pages.flat() || [];

  return (
    <div>
        {/* HEADER */}
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <h1 className="text-3xl font-black tracking-tight text-slate-900">
                Danh sách công việc
            </h1>
        </div>

        {/* FILTER BAR */}
        <div className="mt-10 rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="grid gap-4 lg:grid-cols-5">
            
                {/* SEARCH */}
                <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                    <Search size={20} className="text-slate-400" />
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Tìm kiếm công việc..."
                        className="w-full bg-transparent outline-none text-slate-900"
                    />
                </div>

                {/* LOCATION */}
                <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                    <MapPin size={20} className="text-slate-400" />
                    <select 
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      className="w-full bg-transparent outline-none text-slate-900"
                    >
                        <option>Tất cả địa điểm</option>
                        <option>Đà Nẵng</option>
                        <option>Hồ Chí Minh</option>
                        <option>Hà Nội</option>
                    </select>
                </div>

                {/* SALARY */}
                <select 
                  value={salaryRange}
                  onChange={(e) => setSalaryRange(e.target.value)}
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 outline-none text-slate-900"
                >
                    <option>Mức lương</option>
                    <option>10 - 20 triệu</option>
                    <option>20 - 30 triệu</option>
                    <option>30+ triệu</option>
                </select>

                <select 
                  value={level}
                  onChange={(e) => setLevel(e.target.value)}
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 outline-none text-slate-900"
                >
                    <option>Level</option>
                    <option>Intern</option>
                    <option>Fresher</option>
                    <option>Junior</option>
                    <option>Senior</option>
                    <option>Leader/Manager</option>
                </select>

                {/* BUTTON */}
                <button className="rounded-2xl border-2 border-indigo-600 bg-white px-5 py-3 font-bold text-indigo-600 shadow-md transition hover:scale-[1.02] hover:bg-indigo-50">
                    Áp dụng bộ lọc
                </button>
            </div>
        </div>

        {/* JOB LIST GRID */}
        {isLoading ? (
            <div className="mt-10 grid gap-6 lg:grid-cols-3">
              <JobCardSkeleton />
              <JobCardSkeleton />
              <JobCardSkeleton />
            </div>
          ) : (
            <>
              {jobs.length === 0 ? (
                <div className="mt-10 text-center py-24 bg-white rounded-[32px] border border-dashed border-slate-300">
                  <Search className="w-12 h-12 text-slate-400 mx-auto mb-4 opacity-50" />
                  <h3 className="text-xl font-bold mb-2 text-slate-900">Không tìm thấy công việc</h3>
                  <p className="text-slate-500">Thử điều chỉnh bộ lọc hoặc từ khóa tìm kiếm của bạn.</p>
                </div>
              ) : (
                <div className="mt-10 grid gap-6 lg:grid-cols-3">
                  {jobs.map(job => (
                    <JobCard key={job.job_id} job={job} />
                  ))}
                </div>
              )}
            </>
        )}

        {/* LOAD MORE / PAGINATION REPLACEMENT */}
        {!isLoading && hasNextPage && (
            <div className="mt-14 flex items-center justify-center gap-3">
                <button 
                  onClick={() => fetchNextPage()}
                  disabled={isFetchingNextPage}
                  className="rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 px-8 py-3.5 font-bold text-slate-900 shadow transition hover:scale-[1.02] disabled:opacity-50 cursor-pointer"
                >
                  {isFetchingNextPage ? 'Đang tải thêm...' : 'Tải thêm công việc'}
                </button>
            </div>
        )}
    </div>
  );
}
