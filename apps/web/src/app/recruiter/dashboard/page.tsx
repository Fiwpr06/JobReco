"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { RecruiterSidebar } from "@/components/recruiter/sidebar";
import SkillHeatmap from "@/components/recruiter/skill-heatmap";
import { api } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { Briefcase, Users, Calendar, Award, ChevronRight, TrendingUp, Star } from "lucide-react";

interface JobPosting {
  id: number;
  job_id: string;
  title_en: string;
  company_name_en: string;
  is_active: boolean;
  created_at: string;
  job_category: string;
}

export default function RecruiterDashboard() {
  const [postings, setPostings] = useState<JobPosting[]>([]);
  const [heatmapData, setHeatmapData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState("");

  // Cập nhật giờ chỉ phía client để tránh lỗi Hydration
  useEffect(() => {
    const update = () => setCurrentTime(new Date().toLocaleTimeString("vi-VN"));
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, []);

  // Mocking charts trends data
  const appTrendsData = [
    { name: "Week 1", apps: 25 },
    { name: "Week 2", apps: 42 },
    { name: "Week 3", apps: 89 },
    { name: "Week 4", apps: 154 },
    { name: "Week 5", apps: 234 },
  ];

  useEffect(() => {
    async function loadData() {
      try {
        try {
          const res = await api.get("/api/v1/recruiter/jobs/my-postings");
          setPostings(res.data);
        } catch (e) {
          console.error("Failed to fetch my-postings", e);
        }

        try {
          const heatmapRes = await api.get("/api/v1/recruiter/analytics/skill-heatmap");
          setHeatmapData(heatmapRes.data);
        } catch (e) {
          // keep empty if heatmap fails
        }
      } catch (err) {
        console.error("Failed to load recruiter postings", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 overflow-hidden">
      <RecruiterSidebar />

      {/* Main Workspace content */}
      <main className="flex-1 p-8 overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8 border-b border-slate-200 pb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Tổng Quan Hệ Thống
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              Theo dõi tuyển dụng và đánh giá điểm phù hợp qua mô hình HGAT.
            </p>
          </div>
          <div className="text-right hidden md:block">
            <div className="text-xs text-slate-500 font-medium">
              {currentTime ? `GIỜ HỆ THỐNG: ${currentTime}` : ""}
            </div>
            <div className="text-emerald-600 text-xs font-bold mt-1">TRẠNG THÁI: SẴN SÀNG (ONLINE)</div>
          </div>
        </div>

        {/* Highlight Stats Dashboard Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm relative overflow-hidden group hover:border-indigo-300 transition-colors">
            <div className="flex justify-between items-start mb-4">
              <span className="text-slate-500 text-xs uppercase font-bold tracking-wider">
                Việc Đang Đăng
              </span>
              <div className="p-2 bg-indigo-50 rounded-lg">
                <Briefcase className="w-4 h-4 text-indigo-600" />
              </div>
            </div>
            <div className="text-3xl font-bold text-slate-900">{postings.length}</div>
            <span className="text-xs text-indigo-600 font-medium mt-1 block">Active on board</span>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm relative overflow-hidden group hover:border-blue-300 transition-colors">
            <div className="flex justify-between items-start mb-4">
              <span className="text-slate-500 text-xs uppercase font-bold tracking-wider">
                Tổng Ứng Viên
              </span>
              <div className="p-2 bg-blue-50 rounded-lg">
                <Users className="w-4 h-4 text-blue-600" />
              </div>
            </div>
            <div className="text-3xl font-bold text-slate-900">234</div>
            <span className="text-xs text-blue-600 font-medium mt-1 block">+12% tuần này</span>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm relative overflow-hidden group hover:border-amber-300 transition-colors">
            <div className="flex justify-between items-start mb-4">
              <span className="text-slate-500 text-xs uppercase font-bold tracking-wider">
                Tg Trung Bình
              </span>
              <div className="p-2 bg-amber-50 rounded-lg">
                <Calendar className="w-4 h-4 text-amber-600" />
              </div>
            </div>
            <div className="text-3xl font-bold text-slate-900">14.5 ngày</div>
            <span className="text-xs text-amber-600 font-medium mt-1 block">-3 ngày so với quý trước</span>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm relative overflow-hidden group hover:border-emerald-300 transition-colors">
            <div className="flex justify-between items-start mb-4">
              <span className="text-slate-500 text-xs uppercase font-bold tracking-wider">
                Chất Lượng Phù Hợp
              </span>
              <div className="p-2 bg-emerald-50 rounded-lg">
                <Award className="w-4 h-4 text-emerald-600" />
              </div>
            </div>
            <div className="text-3xl font-bold text-slate-900">82.4%</div>
            <span className="text-xs text-emerald-600 font-medium mt-1 block">Match score cao</span>
          </div>
        </div>

        {/* Charts & Trends */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          <div className="lg:col-span-2 bg-white border border-slate-200 shadow-sm rounded-2xl p-6">
            <h3 className="text-sm font-bold text-slate-900 mb-6 uppercase tracking-wider flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-indigo-600" />
              Lưu Lượng Ứng Tuyển
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={appTrendsData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="name" stroke="#94a3b8" tick={{ fill: "#64748b", fontSize: 12 }} axisLine={false} tickLine={false} dy={10} />
                  <YAxis stroke="#94a3b8" tick={{ fill: "#64748b", fontSize: 12 }} axisLine={false} tickLine={false} dx={-10} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#fff", borderColor: "#e2e8f0", color: "#0f172a", borderRadius: "8px", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
                    itemStyle={{ color: "#4f46e5", fontWeight: "bold" }}
                  />
                  <Line type="monotone" dataKey="apps" name="Ứng viên" stroke="#4f46e5" strokeWidth={3} activeDot={{ r: 6, fill: "#4f46e5", stroke: "#fff", strokeWidth: 2 }} dot={{ r: 4, fill: "#4f46e5" }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6 flex flex-col">
            <h3 className="text-sm font-bold text-slate-900 mb-6 uppercase tracking-wider flex items-center gap-2">
              <Star className="w-4 h-4 text-amber-500" />
              Công Việc Nổi Bật
            </h3>
            <div className="space-y-4 flex-1 overflow-y-auto pr-2">
              {postings.slice(0, 3).map((job) => (
                <div key={job.id} className="flex justify-between items-center p-4 rounded-xl bg-slate-50 border border-slate-100">
                  <div>
                    <h4 className="font-bold text-sm text-slate-900 truncate max-w-[150px]">{job.title_en}</h4>
                    <span className="text-xs text-slate-500 uppercase font-medium">{job.job_category}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold text-indigo-600">78 apps</span>
                    <div className="text-[10px] text-slate-500 mt-0.5">85% avg match</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Skill Heatmap Section */}
        {heatmapData.length > 0 && (
          <div className="mb-8">
            <SkillHeatmap data={heatmapData} onSkillSelect={() => {}} />
          </div>
        )}

        {/* Jobs Listing */}
        <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6">
          <h3 className="text-sm font-bold text-slate-900 mb-6 uppercase tracking-wider flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-indigo-600" />
            CÔNG VIỆC ĐANG TUYỂN
          </h3>
          {loading ? (
            <div className="text-center py-10 text-slate-500 text-sm">Đang tải dữ liệu...</div>
          ) : postings.length === 0 ? (
            <div className="text-center py-10 text-slate-500 text-sm">Bạn chưa có tin tuyển dụng nào.</div>
          ) : (
            <div className="space-y-4">
              {postings.map((job) => (
                <div
                  key={job.id}
                  className="flex flex-col md:flex-row justify-between items-start md:items-center p-5 rounded-2xl bg-slate-50 border border-slate-200 hover:border-indigo-300 hover:shadow-md transition-all"
                >
                  <div className="mb-4 md:mb-0">
                    <h4 className="font-bold text-base text-slate-900">{job.title_en}</h4>
                    <div className="flex flex-wrap gap-4 text-xs text-slate-500 mt-2 font-medium">
                      <span className="flex items-center gap-1.5"><Badge className="bg-slate-200 text-slate-700 hover:bg-slate-200 border-0">{job.job_category}</Badge></span>
                      <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> {new Date(job.created_at).toLocaleDateString()}</span>
                      <span className="flex items-center gap-1.5 font-mono text-slate-400">ID: {job.job_id}</span>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Link
                      href={`/recruiter/jobs/${job.id}/top-matches`}
                      className="px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 font-bold text-sm hover:bg-slate-50 hover:border-slate-300 transition-colors shadow-sm"
                    >
                      Top Matches
                    </Link>
                    <Link
                      href={`/recruiter/jobs/${job.id}/applicants`}
                      className="px-4 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 transition-colors flex items-center gap-1.5 shadow-sm"
                    >
                      Xem Hồ Sơ <ChevronRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
