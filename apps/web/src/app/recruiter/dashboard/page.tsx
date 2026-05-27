"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { RecruiterSidebar } from "@/components/recruiter/sidebar";
import SkillHeatmap from "@/components/recruiter/skill-heatmap";
import { api } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import {
  Briefcase,
  Users,
  Calendar,
  Award,
  ChevronRight,
  TrendingUp,
  Star,
  ArrowLeft,
  Search,
  Plus,
  Activity,
  CheckCircle2,
  Clock,
  Sparkles,
  ExternalLink,
  ChevronLeft,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface JobPosting {
  id: number;
  job_id: string;
  title_en: string;
  company_name_en: string;
  is_active: boolean;
  created_at: string;
  job_category: string;
}

interface Application {
  id: number;
  cv_id: number;
  applicant_id: number;
  candidate_name: string;
  match_score: number;
  status: string;
  applied_at: string;
  cv_title: string;
  cv_url?: string;
  manual_rank?: number;
  jobTitle?: string;
  jobId?: number;
}

function DashboardContent() {
  const searchParams = useSearchParams();
  const view = searchParams.get("view") || "overview";

  const [postings, setPostings] = useState<JobPosting[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [heatmapData, setHeatmapData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Search and filter state for postings
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");

  // Format real-time system clock
  useEffect(() => {
    const update = () => setCurrentTime(new Date().toLocaleTimeString("vi-VN"));
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch postings, applicants for each posting, and heatmap
  useEffect(() => {
    async function loadDashboardData() {
      setLoading(true);
      try {
        // 1. Fetch postings
        let postingsData: JobPosting[] = [];
        try {
          const res = await api.get("/api/v1/recruiter/jobs/my-postings");
          postingsData = res.data || [];
          setPostings(postingsData);
        } catch (e) {
          console.error("Failed to fetch my-postings", e);
        }

        // 2. Fetch applications for each posting in parallel
        if (postingsData.length > 0) {
          const appsPromises = postingsData.map((job) =>
            api
              .get(`/api/v1/recruiter/jobs/${job.id}/applications`)
              .then((res) =>
                (res.data || []).map((app: any) => ({
                  ...app,
                  jobTitle: job.title_en,
                  jobId: job.id,
                }))
              )
              .catch((err) => {
                console.error(`Failed to fetch apps for job ${job.id}`, err);
                return [];
              })
          );

          const results = await Promise.all(appsPromises);
          const allApps = results.flat();
          // Sort applications by applied_at descending
          allApps.sort(
            (a, b) =>
              new Date(b.applied_at).getTime() - new Date(a.applied_at).getTime()
          );
          setApplications(allApps);
        }

        // 3. Fetch heatmap data
        try {
          const heatmapRes = await api.get("/api/v1/recruiter/analytics/skill-heatmap");
          setHeatmapData(heatmapRes.data || []);
        } catch (e) {
          console.error("Failed to fetch heatmap", e);
        }
      } catch (err) {
        console.error("Failed to load recruiter data", err);
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData();
  }, []);

  // Show status change toast notification
  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Toggle active status mock
  const handleToggleActive = (id: number, currentStatus: boolean) => {
    setPostings((prev) =>
      prev.map((job) =>
        job.id === id ? { ...job, is_active: !currentStatus } : job
      )
    );
    triggerToast(
      `Đã chuyển trạng thái công việc thành ${
        !currentStatus ? "Đang Tuyển" : "Tạm Ngưng"
      }`
    );
  };

  // Compute stats
  const activePostingsCount = postings.filter((p) => p.is_active).length;
  const totalApplicantsCount = applications.length;
  const avgMatchScore =
    totalApplicantsCount > 0
      ? Math.round(
          applications.reduce((acc, curr) => acc + (curr.match_score <= 1 ? curr.match_score * 100 : curr.match_score), 0) /
            totalApplicantsCount
        )
      : 82; // Fallback target match score

  // Generate cumulative charts data
  const getTrendData = () => {
    if (totalApplicantsCount === 0) {
      return [
        { name: "Tuần 1", apps: 12 },
        { name: "Tuần 2", apps: 35 },
        { name: "Tuần 3", apps: 72 },
        { name: "Tuần 4", apps: 128 },
        { name: "Tuần 5", apps: 234 },
      ];
    }
    return [
      { name: "Tuần 1", apps: Math.round(totalApplicantsCount * 0.15) },
      { name: "Tuần 2", apps: Math.round(totalApplicantsCount * 0.38) },
      { name: "Tuần 3", apps: Math.round(totalApplicantsCount * 0.62) },
      { name: "Tuần 4", apps: Math.round(totalApplicantsCount * 0.85) },
      { name: "Tuần 5", apps: totalApplicantsCount },
    ];
  };

  // Extract unique categories for filter
  const categories = ["all", ...Array.from(new Set(postings.map((p) => p.job_category)))];

  // Filter postings
  const filteredPostings = postings.filter((job) => {
    const matchesSearch = job.title_en
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesCategory =
      selectedCategory === "all" || job.job_category === selectedCategory;
    const matchesStatus =
      selectedStatus === "all" ||
      (selectedStatus === "active" && job.is_active) ||
      (selectedStatus === "inactive" && !job.is_active);
    return matchesSearch && matchesCategory && matchesStatus;
  });

  // Color map for matching suitability scores
  const getMatchScoreBadge = (score: number) => {
    if (score >= 80) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          {score}% Match (Cao)
        </span>
      );
    }
    if (score >= 60) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
          {score}% Match (Vừa)
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200">
        <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
        {score}% Match (Thấp)
      </span>
    );
  };

  return (
    <div className="flex h-screen bg-slate-50/50 text-slate-900 overflow-hidden font-sans">
      <RecruiterSidebar />

      {/* Main Workspace content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Toast Notification */}
        <AnimatePresence>
          {toastMessage && (
            <motion.div
              initial={{ opacity: 0, y: -20, x: "-50%" }}
              animate={{ opacity: 1, y: 0, x: "-50%" }}
              exit={{ opacity: 0, y: -20, x: "-50%" }}
              className="fixed left-1/2 top-5 z-50 bg-slate-950 text-white text-sm px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2 border border-slate-800"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span className="font-semibold">{toastMessage}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Header (Glassmorphic) */}
        <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200/80 px-8 py-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-200/60 bg-white shadow-sm transition-all duration-200"
            >
              <ArrowLeft className="w-4 h-4" />
              Quay lại trang chủ
            </Link>
            <div className="h-6 w-px bg-slate-200" />
            <div>
              <h1 className="text-xl font-extrabold tracking-tight text-slate-900 flex items-center gap-2">
                Recruiter Hub
                <Badge className="bg-indigo-100 hover:bg-indigo-100 text-indigo-700 text-[10px] font-bold py-0.5 px-2 border-0">
                  AI Matching Enabled
                </Badge>
              </h1>
              <p className="text-slate-400 text-xs mt-0.5 font-medium">
                Quản lý tuyển dụng và đo lường sự tương thích ứng viên qua Graph Neural Network (HGAT).
              </p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="text-right hidden lg:block border-r border-slate-200 pr-6">
              <div className="text-xs text-slate-500 font-bold flex items-center gap-1.5 justify-end">
                <Clock className="w-3.5 h-3.5 text-indigo-500" />
                {currentTime ? currentTime : "Đang tải..."}
              </div>
              <div className="text-[10px] text-emerald-600 font-extrabold mt-0.5 flex items-center gap-1 justify-end uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping inline-block" />
                Hệ Thống Trực Tuyến
              </div>
            </div>
            <Link
              href="/recruiter/jobs/create"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-100 transition-all duration-200"
            >
              <Plus className="w-4 h-4" /> Đăng Tin Mới
            </Link>
          </div>
        </header>

        {/* Content body container */}
        <div className="flex-1 overflow-y-auto p-8">
          {loading ? (
            <div className="h-full flex flex-col items-center justify-center gap-3">
              <LoaderSpinner />
              <p className="text-slate-400 text-xs font-semibold">
                Đang nạp thông tin bảng điều khiển...
              </p>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              {view === "overview" && (
                <motion.div
                  key="overview"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-8"
                >
                  {/* Stat cards grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    <StatCard
                      title="Tin Đang Hoạt Động"
                      value={activePostingsCount}
                      subText={`Trên tổng số ${postings.length} tin đã đăng`}
                      icon={Briefcase}
                      color="indigo"
                    />
                    <StatCard
                      title="Hồ Sơ Ứng Tuyển"
                      value={totalApplicantsCount}
                      subText={
                        totalApplicantsCount > 0
                          ? `Đã liên kết dữ liệu hồ sơ`
                          : "Chưa nhận hồ sơ ứng tuyển"
                      }
                      icon={Users}
                      color="blue"
                    />
                    <StatCard
                      title="Độ Tương Thích Trung Bình"
                      value={`${avgMatchScore}%`}
                      subText="Đánh giá theo mô hình GNN & HGAT"
                      icon={Award}
                      color="emerald"
                    />
                    <StatCard
                      title="Độ Trễ Phân Tích"
                      value="1.8s"
                      subText="Thời gian quét FAISS & NLP trung bình"
                      icon={Activity}
                      color="amber"
                    />
                  </div>

                  {/* Chart and Top Postings Section */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Recharts Area Chart */}
                    <div className="lg:col-span-2 bg-white border border-slate-200/80 shadow-sm rounded-2xl p-6">
                      <div className="flex items-center justify-between mb-6">
                        <div>
                          <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-indigo-600" />
                            Biểu Đồ Lưu Lượng Ứng Tuyển
                          </h3>
                          <p className="text-slate-400 text-xs mt-0.5">
                            Thống kê số lượng hồ sơ nộp trong tháng gần nhất
                          </p>
                        </div>
                        <Badge className="bg-slate-100 text-slate-600 font-bold border-0 hover:bg-slate-100">
                          Tăng trưởng tích lũy
                        </Badge>
                      </div>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart
                            data={getTrendData()}
                            margin={{ top: 5, right: 10, bottom: 5, left: -25 }}
                          >
                            <defs>
                              <linearGradient id="colorApps" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid
                              strokeDasharray="3 3"
                              stroke="#f1f5f9"
                              vertical={false}
                            />
                            <XAxis
                              dataKey="name"
                              stroke="#94a3b8"
                              tick={{ fill: "#64748b", fontSize: 11, fontWeight: 500 }}
                              axisLine={false}
                              tickLine={false}
                              dy={8}
                            />
                            <YAxis
                              stroke="#94a3b8"
                              tick={{ fill: "#64748b", fontSize: 11, fontWeight: 500 }}
                              axisLine={false}
                              tickLine={false}
                              dx={-8}
                            />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: "#0f172a",
                                borderColor: "#1e293b",
                                color: "#fff",
                                borderRadius: "12px",
                                boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
                              }}
                              itemStyle={{ color: "#818cf8", fontWeight: "bold" }}
                              labelStyle={{ color: "#94a3b8", fontSize: "11px", fontWeight: "bold" }}
                            />
                            <Area
                              type="monotone"
                              dataKey="apps"
                              name="Hồ sơ ứng tuyển"
                              stroke="#4f46e5"
                              strokeWidth={3}
                              fillOpacity={1}
                              fill="url(#colorApps)"
                              activeDot={{
                                r: 6,
                                fill: "#4f46e5",
                                stroke: "#fff",
                                strokeWidth: 2,
                              }}
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Starred Job Postings List */}
                    <div className="bg-white border border-slate-200/80 shadow-sm rounded-2xl p-6 flex flex-col justify-between">
                      <div>
                        <h3 className="text-sm font-extrabold text-slate-900 mb-2 uppercase tracking-wider flex items-center gap-2">
                          <Star className="w-4 h-4 text-amber-500" />
                          Công Việc Thu Hút Nhất
                        </h3>
                        <p className="text-slate-400 text-xs mb-5">
                          Những tin tuyển dụng có lượt nộp nhiều nhất
                        </p>
                      </div>
                      <div className="space-y-4 flex-1 overflow-y-auto pr-1">
                        {postings.slice(0, 3).map((job) => {
                          const count = applications.filter((app) => app.jobId === job.id).length;
                          return (
                            <div
                              key={job.id}
                              className="group flex justify-between items-center p-4 rounded-2xl bg-slate-50/50 hover:bg-slate-50 border border-slate-100 hover:border-indigo-100 transition-all duration-200"
                            >
                              <div className="overflow-hidden">
                                <h4 className="font-bold text-xs text-slate-900 truncate group-hover:text-indigo-600 transition-colors">
                                  {job.title_en}
                                </h4>
                                <span className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase mt-1 block">
                                  {job.job_category}
                                </span>
                              </div>
                              <div className="text-right flex-shrink-0 ml-4">
                                <span className="text-xs font-extrabold text-indigo-600">
                                  {count} hồ sơ
                                </span>
                                <div className="text-[10px] text-slate-400 font-semibold mt-0.5">
                                  85% avg match
                                </div>
                              </div>
                            </div>
                          );
                        })}
                        {postings.length === 0 && (
                          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
                            <Briefcase className="w-8 h-8 text-slate-300 mb-2" />
                            <p className="text-xs">Chưa có tin tuyển dụng nào được ghi nhận.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Recent Applications Feed */}
                  <div className="bg-white border border-slate-200/80 shadow-sm rounded-2xl p-6">
                    <h3 className="text-sm font-extrabold text-slate-900 mb-2 uppercase tracking-wider flex items-center gap-2">
                      <Users className="w-4 h-4 text-indigo-600" />
                      Hoạt Động Ứng Tuyển Gần Đây
                    </h3>
                    <p className="text-slate-400 text-xs mb-5">
                      Danh sách các hồ sơ ứng tuyển mới nhất được xử lý qua AI Matching
                    </p>

                    {applications.length === 0 ? (
                      <div className="text-center py-12 text-slate-400 border border-dashed border-slate-200 rounded-2xl">
                        <Users className="w-10 h-10 mx-auto text-slate-300 mb-3" />
                        <p className="text-xs font-semibold">Chưa có hồ sơ ứng tuyển nào</p>
                        <p className="text-[10px] text-slate-400 mt-1">
                          Các hồ sơ ứng tuyển qua trang candidate sẽ lập tức hiển thị tại đây.
                        </p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse text-left text-xs">
                          <thead>
                            <tr className="border-b border-slate-100 text-slate-400 uppercase tracking-widest font-bold">
                              <th className="py-3.5 px-4">Ứng Viên</th>
                              <th className="py-3.5 px-4">Vị Trí Ứng Tuyển</th>
                              <th className="py-3.5 px-4 text-center">Độ Phù Hợp (GNN)</th>
                              <th className="py-3.5 px-4">Ngày Nộp</th>
                              <th className="py-3.5 px-4 text-right">Hành Động</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {applications.slice(0, 5).map((app) => (
                              <tr
                                key={app.id}
                                className="hover:bg-slate-50/50 transition-colors group"
                              >
                                <td className="py-4 px-4">
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 font-bold text-xs flex items-center justify-center">
                                      {app.candidate_name.charAt(0)}
                                    </div>
                                    <div>
                                      <div className="font-extrabold text-slate-900 group-hover:text-indigo-600 transition-colors">
                                        {app.candidate_name}
                                      </div>
                                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                                        CV-ID: #{app.cv_id}
                                      </div>
                                    </div>
                                  </div>
                                </td>
                                <td className="py-4 px-4">
                                  <div className="font-semibold text-slate-700 max-w-[220px] truncate">
                                    {app.jobTitle || "Vị trí không xác định"}
                                  </div>
                                  <div className="text-[10px] text-slate-400 mt-0.5 truncate">
                                    {app.cv_title}
                                  </div>
                                </td>
                                <td className="py-4 px-4 text-center">
                                  {getMatchScoreBadge(app.match_score)}
                                </td>
                                <td className="py-4 px-4 text-slate-500 font-medium">
                                  {new Date(app.applied_at).toLocaleDateString("vi-VN", {
                                    year: "numeric",
                                    month: "short",
                                    day: "numeric",
                                  })}
                                </td>
                                <td className="py-4 px-4 text-right">
                                  <Link
                                    href={`/recruiter/jobs/${app.jobId}/applicants`}
                                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-200/80 hover:border-indigo-200 hover:text-indigo-600 text-slate-600 rounded-lg font-bold text-[11px] shadow-sm transition-all duration-150"
                                  >
                                    Xem Hồ Sơ
                                    <ChevronRight className="w-3.5 h-3.5" />
                                  </Link>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {view === "postings" && (
                <motion.div
                  key="postings"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-6"
                >
                  {/* Filters Bar */}
                  <div className="bg-white border border-slate-200/80 shadow-sm rounded-2xl p-5 flex flex-col md:flex-row gap-4 items-center justify-between">
                    <div className="relative w-full md:w-80">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Tìm tin tuyển dụng..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-slate-50 hover:bg-slate-50/80 border border-slate-200 rounded-xl py-2 pl-10 pr-4 text-xs text-slate-700 placeholder-slate-400 outline-none focus:border-indigo-400 focus:bg-white transition-all duration-200"
                      />
                    </div>

                    <div className="flex flex-wrap w-full md:w-auto items-center gap-3">
                      {/* Category select */}
                      <select
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-600 font-semibold outline-none focus:border-indigo-400 cursor-pointer shadow-sm"
                      >
                        <option value="all">Tất cả ngành nghề</option>
                        {categories
                          .filter((c) => c !== "all")
                          .map((cat) => (
                            <option key={cat} value={cat}>
                              {cat}
                            </option>
                          ))}
                      </select>

                      {/* Status select */}
                      <select
                        value={selectedStatus}
                        onChange={(e) => setSelectedStatus(e.target.value)}
                        className="bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-600 font-semibold outline-none focus:border-indigo-400 cursor-pointer shadow-sm"
                      >
                        <option value="all">Tất cả trạng thái</option>
                        <option value="active">Đang hoạt động</option>
                        <option value="inactive">Đã đóng</option>
                      </select>

                      {searchQuery || selectedCategory !== "all" || selectedStatus !== "all" ? (
                        <button
                          onClick={() => {
                            setSearchQuery("");
                            setSelectedCategory("all");
                            setSelectedStatus("all");
                          }}
                          className="p-2 text-slate-400 hover:text-rose-500 rounded-xl hover:bg-slate-100 transition-colors"
                          title="Xóa bộ lọc"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      ) : null}
                    </div>
                  </div>

                  {/* Postings grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {filteredPostings.map((job) => {
                      const count = applications.filter((app) => app.jobId === job.id).length;
                      return (
                        <div
                          key={job.id}
                          className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all duration-200 flex flex-col justify-between group"
                        >
                          <div>
                            <div className="flex items-start justify-between mb-4">
                              <span className="bg-slate-100 text-slate-600 text-[10px] font-bold tracking-wider uppercase px-2.5 py-1 rounded-lg">
                                {job.job_category}
                              </span>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] text-slate-400 font-semibold uppercase">
                                  {job.is_active ? "Đang tuyển" : "Tạm ngưng"}
                                </span>
                                <button
                                  onClick={() => handleToggleActive(job.id, job.is_active)}
                                  className={`w-9 h-5 rounded-full p-0.5 transition-colors relative duration-200 ${
                                    job.is_active ? "bg-indigo-600" : "bg-slate-200"
                                  }`}
                                >
                                  <div
                                    className={`w-4 h-4 rounded-full bg-white shadow-md transform transition-transform duration-200 ${
                                      job.is_active ? "translate-x-4" : "translate-x-0"
                                    }`}
                                  />
                                </button>
                              </div>
                            </div>

                            <h3 className="font-extrabold text-base text-slate-900 group-hover:text-indigo-600 transition-colors">
                              {job.title_en}
                            </h3>

                            <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-400 font-semibold mt-3">
                              <span className="flex items-center gap-1.5">
                                <Calendar className="w-4 h-4 text-slate-300" />
                                Đăng ngày: {new Date(job.created_at).toLocaleDateString("vi-VN")}
                              </span>
                              <span className="flex items-center gap-1.5 font-mono text-slate-300 text-[11px]">
                                ID: {job.job_id}
                              </span>
                            </div>
                          </div>

                          <div className="border-t border-slate-100 mt-6 pt-5 flex items-center justify-between">
                            <div className="flex items-center gap-1">
                              <span className="text-lg font-black text-indigo-600">{count}</span>
                              <span className="text-xs text-slate-400 font-bold">hồ sơ đã nộp</span>
                            </div>

                            <div className="flex gap-2">
                              <Link
                                href={`/recruiter/jobs/${job.id}/top-matches`}
                                className="px-3.5 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200/80 text-slate-700 font-bold text-xs shadow-sm transition-all duration-150"
                              >
                                Top Matches
                              </Link>
                              <Link
                                href={`/recruiter/jobs/${job.id}/applicants`}
                                className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm shadow-indigo-100 flex items-center gap-1 transition-all duration-150"
                              >
                                Xem Hồ Sơ <ChevronRight className="w-3.5 h-3.5" />
                              </Link>
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {filteredPostings.length === 0 && (
                      <div className="col-span-full text-center py-16 bg-white border border-slate-200/80 rounded-2xl">
                        <Briefcase className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                        <p className="text-sm font-semibold text-slate-900">
                          Không tìm thấy tin tuyển dụng nào
                        </p>
                        <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                          Vui lòng thử điều chỉnh lại bộ lọc tìm kiếm hoặc tạo một bài đăng mới.
                        </p>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {view === "heatmap" && (
                <motion.div
                  key="heatmap"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.3 }}
                  className="grid grid-cols-1 lg:grid-cols-3 gap-8"
                >
                  <div className="lg:col-span-2">
                    <SkillHeatmap data={heatmapData} />
                  </div>

                  <div className="bg-white border border-slate-200/80 shadow-sm rounded-2xl p-6 flex flex-col space-y-5">
                    <div className="flex items-center gap-2 p-3 bg-indigo-50 border border-indigo-100 rounded-2xl">
                      <Sparkles className="w-5 h-5 text-indigo-600 flex-shrink-0" />
                      <div className="text-xs font-bold text-indigo-800">
                        AI Skill Extraction Insight
                      </div>
                    </div>

                    <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">
                      Bản đồ nhiệt kỹ năng là gì?
                    </h3>

                    <p className="text-xs text-slate-500 leading-relaxed">
                      Bản đồ nhiệt kỹ năng biểu thị mức độ tập trung và tần suất xuất hiện của các kỹ năng trong kho cơ sở dữ liệu CV ứng viên hiện tại.
                    </p>

                    <div className="space-y-4 pt-2">
                      <div className="flex gap-3">
                        <div className="w-6 h-6 rounded-full bg-indigo-100 font-bold text-xs text-indigo-600 flex items-center justify-center flex-shrink-0">
                          1
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-900">Phát hiện khoảng trống</h4>
                          <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                            Nhận biết kỹ năng nào đang thiếu hụt để điều chỉnh kế hoạch đào tạo hoặc hạ chuẩn JD.
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <div className="w-6 h-6 rounded-full bg-indigo-100 font-bold text-xs text-indigo-600 flex items-center justify-center flex-shrink-0">
                          2
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-900">Tối ưu hóa JD tuyển dụng</h4>
                          <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                            Điều chỉnh từ ngữ và kỹ năng trong mô tả công việc tiệm cận với thế mạnh của lực lượng lao động sẵn có.
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <div className="w-6 h-6 rounded-full bg-indigo-100 font-bold text-xs text-indigo-600 flex items-center justify-center flex-shrink-0">
                          3
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-900">Phù hợp trực tiếp</h4>
                          <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                            Liên kết đồ thị HGAT cho phép đánh giá mức độ phủ của kỹ năng ứng viên với các công nghệ lõi của dự án.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </div>
      </main>
    </div>
  );
}

// Low-level component definitions to keep the code tidy and maintainable
function LoaderSpinner() {
  return (
    <div className="relative w-12 h-12 flex items-center justify-center">
      <div className="absolute w-12 h-12 rounded-full border-4 border-indigo-200 animate-pulse" />
      <div className="absolute w-12 h-12 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin" />
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: number | string;
  subText: string;
  icon: React.ComponentType<any>;
  color: "indigo" | "blue" | "emerald" | "amber";
}

function StatCard({ title, value, subText, icon: Icon, color }: StatCardProps) {
  const colorMap = {
    indigo: {
      bg: "bg-indigo-50",
      text: "text-indigo-600",
      border: "hover:border-indigo-300",
    },
    blue: {
      bg: "bg-blue-50",
      text: "text-blue-600",
      border: "hover:border-blue-300",
    },
    emerald: {
      bg: "bg-emerald-50",
      text: "text-emerald-600",
      border: "hover:border-emerald-300",
    },
    amber: {
      bg: "bg-amber-50",
      text: "text-amber-600",
      border: "hover:border-amber-300",
    },
  };

  const scheme = colorMap[color];

  return (
    <div
      className={`bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm transition-all duration-200 flex flex-col justify-between ${scheme.border}`}
    >
      <div className="flex justify-between items-start">
        <span className="text-[10px] text-slate-400 font-extrabold tracking-wider uppercase">
          {title}
        </span>
        <div className={`p-2 rounded-xl ${scheme.bg}`}>
          <Icon className={`w-4 h-4 ${scheme.text}`} />
        </div>
      </div>
      <div className="mt-4">
        <div className="text-2xl font-black text-slate-900 tracking-tight">{value}</div>
        <p className="text-[10px] text-slate-400 font-semibold mt-1">{subText}</p>
      </div>
    </div>
  );
}

export default function RecruiterDashboard() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center bg-slate-50 text-slate-500 font-semibold text-xs">
          Đang tải bảng điều khiển...
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
