'use client';

import { useState, useEffect, useRef } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { JobCard } from "@/features/jobs/components/job-card";
import { JobCardSkeleton } from "@/components/skeleton/job-card-skeleton";
import { Search, MapPin, ChevronDown, Sparkles, SlidersHorizontal, DollarSign, Briefcase } from "lucide-react";
import { Job } from "@/lib/types";
import { motion, AnimatePresence } from "framer-motion";

export default function JobsBrowsePage() {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  
  // Filter states matching the backend parameters
  const [location, setLocation] = useState("Tất cả địa điểm");
  const [salaryRange, setSalaryRange] = useState("Mức lương");
  const [level, setLevel] = useState("Cấp bậc");

  // Custom Dropdown Open States
  const [locOpen, setLocOpen] = useState(false);
  const [salOpen, setSalOpen] = useState(false);
  const [lvlOpen, setLvlOpen] = useState(false);

  // Dropdown Refs for Click Outside
  const locRef = useRef<HTMLDivElement>(null);
  const salRef = useRef<HTMLDivElement>(null);
  const lvlRef = useRef<HTMLDivElement>(null);

  // Click outside to close dropdowns
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (locRef.current && !locRef.current.contains(event.target as Node)) setLocOpen(false);
      if (salRef.current && !salRef.current.contains(event.target as Node)) setSalOpen(false);
      if (lvlRef.current && !lvlRef.current.contains(event.target as Node)) setLvlOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Simple debounce logic for search
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedQuery(query), 400);
    return () => clearTimeout(handler);
  }, [query]);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, refetch } = useInfiniteQuery({
    queryKey: ['jobs', debouncedQuery, location, salaryRange, level],
    queryFn: async ({ pageParam = 0 }) => {
      try {
        // Map selected filter options to API parameters
        let expParam = "&min_experience=10"; // Default
        if (level === "Intern" || level === "Fresher" || level === "Cấp bậc") expParam = "&min_experience=0";
        if (level === "Junior") expParam = "&min_experience=2";
        if (level === "Senior") expParam = "&min_experience=5";
        if (level === "Leader/Manager") expParam = "&min_experience=8";

        let queryParam = debouncedQuery;
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

  const locationsList = ["Tất cả địa điểm", "Đà Nẵng", "Hồ Chí Minh", "Hà Nội"];
  const salaryList = ["Mức lương", "10 - 20 triệu", "20 - 30 triệu", "30+ triệu"];
  const levelsList = ["Cấp bậc", "Intern", "Fresher", "Junior", "Senior", "Leader/Manager"];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      
      {/* 1. HERO GRADIENT BANNER */}
      <div className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-indigo-50 via-white to-purple-50 px-8 py-16 text-center shadow-sm border border-slate-200 mb-12">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(99,102,241,0.05),transparent_60%)] pointer-events-none" />
        <div className="absolute -right-24 -bottom-24 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-100 border border-indigo-200 text-indigo-700 text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" /> Khám phá Cơ Hội Mới
          </div>
          <h1 className="font-fraunces text-4xl sm:text-5xl font-black text-slate-900 tracking-tight leading-tight">
            Tìm Kiếm Công Việc <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">Tương Lai</span>
          </h1>
          <p className="text-slate-700 font-medium text-base sm:text-lg max-w-2xl mx-auto leading-relaxed mt-4">
            Kết nối việc làm thông minh dựa trên Neural Network & Graph Neural Network (HGAT), giúp bạn tìm thấy vị trí tuyển dụng phù hợp nhất với kỹ năng và kinh nghiệm.
          </p>
        </div>
      </div>

      {/* 2. FILTER BAR */}
      <div className="relative z-50 rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] mb-10">
        <div className="grid gap-4 lg:grid-cols-5 items-center">
          
          {/* SEARCH INPUT */}
          <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-3.5 focus-within:border-indigo-300 focus-within:bg-white transition-all">
            <Search size={18} className="text-slate-400 shrink-0" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tìm kiếm công việc, kỹ năng..."
              className="w-full bg-transparent outline-none text-slate-800 text-sm font-semibold placeholder-slate-400"
            />
          </div>

          {/* CUSTOM LOCATION SELECTOR */}
          <div ref={locRef} className="relative">
            <button
              onClick={() => setLocOpen(!locOpen)}
              className="w-full flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-3.5 text-slate-800 text-sm font-semibold hover:border-slate-300 transition"
            >
              <div className="flex items-center gap-2 text-slate-700 truncate">
                <MapPin size={16} className="text-indigo-500 shrink-0" />
                <span className="truncate">{location}</span>
              </div>
              <ChevronDown size={16} className={`text-slate-400 transition-transform duration-300 ${locOpen ? 'rotate-180' : ''}`} />
            </button>
            <AnimatePresence>
              {locOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.98 }}
                  transition={{ duration: 0.15 }}
                  className="absolute z-30 mt-2 w-full rounded-2xl border border-slate-200 bg-white p-2 shadow-xl backdrop-blur-md"
                >
                  {locationsList.map((loc) => (
                    <button
                      key={loc}
                      onClick={() => {
                        setLocation(loc);
                        setLocOpen(false);
                      }}
                      className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-semibold transition ${
                        location === loc
                          ? "bg-indigo-50 text-indigo-600 font-bold"
                          : "text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      {loc}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* CUSTOM SALARY SELECTOR */}
          <div ref={salRef} className="relative">
            <button
              onClick={() => setSalOpen(!salOpen)}
              className="w-full flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-3.5 text-slate-800 text-sm font-semibold hover:border-slate-300 transition"
            >
              <div className="flex items-center gap-2 text-slate-700 truncate">
                <DollarSign size={16} className="text-emerald-500 shrink-0" />
                <span className="truncate">{salaryRange}</span>
              </div>
              <ChevronDown size={16} className={`text-slate-400 transition-transform duration-300 ${salOpen ? 'rotate-180' : ''}`} />
            </button>
            <AnimatePresence>
              {salOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.98 }}
                  transition={{ duration: 0.15 }}
                  className="absolute z-30 mt-2 w-full rounded-2xl border border-slate-200 bg-white p-2 shadow-xl backdrop-blur-md"
                >
                  {salaryList.map((sal) => (
                    <button
                      key={sal}
                      onClick={() => {
                        setSalaryRange(sal);
                        setSalOpen(false);
                      }}
                      className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-semibold transition ${
                        salaryRange === sal
                          ? "bg-emerald-50/50 text-emerald-600 font-bold"
                          : "text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      {sal}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* CUSTOM LEVEL SELECTOR */}
          <div ref={lvlRef} className="relative">
            <button
              onClick={() => setLvlOpen(!lvlOpen)}
              className="w-full flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-3.5 text-slate-800 text-sm font-semibold hover:border-slate-300 transition"
            >
              <div className="flex items-center gap-2 text-slate-700 truncate">
                <Briefcase size={16} className="text-amber-500 shrink-0" />
                <span className="truncate">{level}</span>
              </div>
              <ChevronDown size={16} className={`text-slate-400 transition-transform duration-300 ${lvlOpen ? 'rotate-180' : ''}`} />
            </button>
            <AnimatePresence>
              {lvlOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.98 }}
                  transition={{ duration: 0.15 }}
                  className="absolute z-30 mt-2 w-full rounded-2xl border border-slate-200 bg-white p-2 shadow-xl backdrop-blur-md"
                >
                  {levelsList.map((lvl) => (
                    <button
                      key={lvl}
                      onClick={() => {
                        setLevel(lvl);
                        setLvlOpen(false);
                      }}
                      className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-semibold transition ${
                        level === lvl
                          ? "bg-amber-50/50 text-amber-700 font-bold"
                          : "text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      {lvl}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* RESET / APPLY BUTTON */}
          <button 
            onClick={() => {
              setLocation("Tất cả địa điểm");
              setSalaryRange("Mức lương");
              setLevel("Cấp bậc");
              setQuery("");
            }}
            className="w-full flex items-center justify-center gap-2 rounded-2xl border-2 border-indigo-600/10 bg-indigo-50/30 px-5 py-3.5 font-bold text-indigo-600 hover:bg-indigo-50 hover:border-indigo-600/30 transition shadow-sm"
          >
            <SlidersHorizontal size={16} />
            <span>Xóa bộ lọc</span>
          </button>
        </div>
      </div>

      {/* 3. JOB LIST GRID */}
      {isLoading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <JobCardSkeleton />
          <JobCardSkeleton />
          <JobCardSkeleton />
        </div>
      ) : (
        <>
          {jobs.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-24 bg-white rounded-[32px] border border-dashed border-slate-200"
            >
              <Search className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-2 text-slate-800 font-fraunces">Không tìm thấy công việc</h3>
              <p className="text-slate-400 text-sm max-w-md mx-auto">
                Không tìm thấy kết quả phù hợp với các bộ lọc hiện tại. Hãy thử thay đổi từ khóa hoặc bộ lọc của bạn.
              </p>
            </motion.div>
          ) : (
            <motion.div 
              layout
              className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
            >
              {jobs.map((job) => (
                <JobCard key={job.job_id} job={job} />
              ))}
            </motion.div>
          )}
        </>
      )}

      {/* 4. LOAD MORE BUTTON */}
      {!isLoading && hasNextPage && (
        <div className="mt-14 flex items-center justify-center">
          <button 
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
            className="rounded-2xl border border-slate-200 bg-white hover:bg-slate-50/80 px-8 py-3.5 font-bold text-slate-800 shadow-[0_4px_15px_-3px_rgba(0,0,0,0.05)] transition-all hover:scale-[1.02] disabled:opacity-50 cursor-pointer"
          >
            {isFetchingNextPage ? 'Đang tải thêm...' : 'Tải thêm công việc'}
          </button>
        </div>
      )}
    </div>
  );
}
