"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { RecruiterSidebar } from "@/components/recruiter/sidebar";
import { RankingTable } from "@/components/recruiter/ranking-table";
import { api } from "@/lib/api";
import { ChevronLeft, Columns, Check, X, Award, Eye, Briefcase, Calendar, Search } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

interface Candidate {
  id: number;
  cv_id: number;
  applicant_id: number;
  candidate_name: string;
  match_score: number;
  status: string;
  applied_at: string;
  cv_title: string;
  manual_rank?: number | null;
  cv_url?: string | null;
  is_owner?: boolean;
}



export default function JobApplicantsPage() {
  const { id: jobId } = useParams();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCandidates, setSelectedCandidates] = useState<Candidate[]>([]);
  const [isCompareOpen, setIsCompareOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    async function fetchApplicants() {
      try {
        const res = await api.get(`/api/v1/recruiter/jobs/${jobId}/applications`);
        setCandidates(res.data);
      } catch (err) {
        console.error("Failed to load applicants", err);
      } finally {
        setLoading(false);
      }
    }
    fetchApplicants();
  }, [jobId]);

  const handleStatusUpdate = async (appId: number, nextStatus: string) => {
    try {
      await api.post(`/api/v1/recruiter/applications/${appId}/update-status`, { status: nextStatus });
      setCandidates(prev =>
        prev.map(cand => (cand.id === appId ? { ...cand, status: nextStatus } : cand))
      );
    } catch (err) {
      console.error("Failed to update status", err);
      alert("Cập nhật trạng thái thất bại.");
    }
  };

  const toggleCandidateSelection = (cand: Candidate) => {
    if (selectedCandidates.find(c => c.id === cand.id)) {
      setSelectedCandidates(prev => prev.filter(c => c.id !== cand.id));
    } else {
      if (selectedCandidates.length >= 2) {
        alert("Chỉ được so sánh tối đa 2 ứng viên cùng lúc.");
        return;
      }
      setSelectedCandidates(prev => [...prev, cand]);
    }
  };

  const getScoreColor = (score: number) => {
    const normalized = score <= 1 ? score * 100 : score;
    if (normalized >= 90) return "bg-emerald-100 text-emerald-700 border-emerald-200";
    if (normalized >= 75) return "bg-blue-100 text-blue-700 border-blue-200";
    if (normalized >= 60) return "bg-amber-100 text-amber-700 border-amber-200";
    return "bg-slate-100 text-slate-600 border-slate-200";
  };

  const filteredCandidates = candidates.filter(cand => {
    if (statusFilter === "all") return true;
    return cand.status === statusFilter;
  });

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 font-sans overflow-hidden">
      <RecruiterSidebar />

      {/* Main Workspace content */}
      <main className="flex-1 p-8 overflow-y-auto">
        {/* Back Link */}
        <Link href="/recruiter/dashboard" className="inline-flex items-center gap-2 text-slate-500 hover:text-indigo-600 transition-colors text-sm font-semibold mb-6">
          <ChevronLeft className="w-4 h-4" /> Quay lại Dashboard
        </Link>

        {/* Header */}
        <div className="flex justify-between items-center mb-8 border-b border-slate-200 pb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
              Danh sách Ứng Viên <Badge className="bg-indigo-100 text-indigo-700 hover:bg-indigo-200 border-0">JOB-{jobId}</Badge>
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              Xem trước, đánh giá mức độ phù hợp (Match Score) và sàng lọc ứng viên.
            </p>
          </div>
          {selectedCandidates.length === 2 && (
            <button
              onClick={() => setIsCompareOpen(true)}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 font-bold text-sm text-white flex items-center gap-2 shadow-md shadow-indigo-200 transition-all"
            >
              <Columns className="w-4 h-4" /> So sánh 2 Ứng viên
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-wrap gap-3 items-center">
          <span className="text-sm font-bold text-slate-600 mr-2 flex items-center gap-2"><Search className="w-4 h-4"/> Lọc Trạng Thái:</span>
          {["all", "pending", "reviewed", "shortlisted", "rejected", "hired"].map(st => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold capitalize transition-all duration-200 shadow-sm ${
                statusFilter === st
                  ? "bg-indigo-600 text-white shadow-indigo-200"
                  : "bg-white border border-slate-200 text-slate-600 hover:border-indigo-300 hover:text-indigo-600"
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-10 text-slate-500 text-sm font-medium animate-pulse">Đang tải dữ liệu ứng viên...</div>
        ) : (
          <div className="space-y-8">
            
            {/* List Pipeline View */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="bg-slate-50 p-4 border-b border-slate-200 flex justify-between items-center">
                <h3 className="font-bold text-slate-900 text-sm tracking-wide uppercase flex items-center gap-2">
                  <Users className="w-4 h-4 text-indigo-600" />
                  Danh Sách Ứng Viên Đã Ứng Tuyển
                </h3>
                <span className="text-xs font-semibold text-slate-500 bg-slate-200 px-2.5 py-1 rounded-lg">Tổng cộng: {filteredCandidates.length} CV</span>
              </div>
              
              <div className="divide-y divide-slate-100">
                {filteredCandidates.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 text-sm">Không tìm thấy ứng viên nào.</div>
                ) : filteredCandidates.map((cand) => {
                  const isSelected = !!selectedCandidates.find(c => c.id === cand.id);
                  return (
                    <div key={cand.id} className="p-5 flex flex-col lg:flex-row items-start lg:items-center justify-between hover:bg-indigo-50/50 transition-colors gap-4">
                      <div className="flex items-center gap-4">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleCandidateSelection(cand)}
                          className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        />
                        <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm bg-slate-200 text-slate-600">
                          {cand.candidate_name.charAt(0)}
                        </div>
                        <div>
                          <h4 className="font-bold text-base text-slate-900 flex items-center gap-2">
                            {cand.candidate_name}
                          </h4>
                          <span className="text-xs text-slate-500 flex items-center gap-1.5 mt-1 font-medium">
                            <Briefcase className="w-3.5 h-3.5" /> {cand.cv_title}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-4 lg:gap-6">
                        {/* Match Meter */}
                        <div className="flex flex-col items-center">
                          <span className="text-[10px] text-slate-400 font-bold uppercase mb-1">Mức Độ Phù Hợp</span>
                          <div className={`px-3 py-1 rounded-lg border text-sm font-bold shadow-sm ${getScoreColor(cand.match_score)}`}>
                            {(cand.match_score <= 1 ? cand.match_score * 100 : cand.match_score).toFixed(0)}%
                          </div>
                        </div>

                        {/* Status Badge */}
                        <div className="flex flex-col items-center w-24">
                          <span className="text-[10px] text-slate-400 font-bold uppercase mb-1">Status</span>
                          <span className={`text-xs font-bold capitalize px-3 py-1 rounded-lg border shadow-sm w-full text-center ${
                            cand.status === "shortlisted"
                              ? "border-emerald-200 text-emerald-700 bg-emerald-100"
                              : cand.status === "rejected"
                              ? "border-rose-200 text-rose-700 bg-rose-100"
                              : "border-slate-200 text-slate-600 bg-slate-100"
                          }`}>
                            {cand.status}
                          </span>
                        </div>

                        {/* Decision actions */}
                        <div className="flex gap-2">
                          <Link
                            href={cand.cv_url ? cand.cv_url : `/recruiter/cv/${cand.cv_id}`}
                            target={cand.cv_url ? "_blank" : "_self"}
                            rel={cand.cv_url ? "noopener noreferrer" : ""}
                            className="p-2.5 rounded-xl border border-slate-200 bg-white text-slate-400 hover:border-indigo-400 hover:bg-indigo-50 hover:text-indigo-600 shadow-sm transition-colors"
                            title="Xem CV"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>
                          <button
                            onClick={() => handleStatusUpdate(cand.id, "shortlisted")}
                            className="p-2.5 rounded-xl border border-slate-200 bg-white hover:border-emerald-400 hover:bg-emerald-50 hover:text-emerald-600 text-slate-400 transition-colors shadow-sm"
                            title="Chấp nhận (Shortlist)"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleStatusUpdate(cand.id, "rejected")}
                            className="p-2.5 rounded-xl border border-slate-200 bg-white hover:border-rose-400 hover:bg-rose-50 hover:text-rose-600 text-slate-400 transition-colors shadow-sm"
                            title="Từ chối (Reject)"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        )}
      </main>

      {/* Side-by-side Candidate Comparison Modal */}
      {isCompareOpen && selectedCandidates.length === 2 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white border border-slate-200 shadow-2xl rounded-3xl w-full max-w-4xl p-8 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsCompareOpen(false)}
              className="absolute top-6 right-6 p-2 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-500 hover:text-slate-700 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-base font-bold text-indigo-600 tracking-wide uppercase mb-8 border-b border-slate-100 pb-4 flex items-center gap-2">
              <Columns className="w-5 h-5" /> BẢNG SO SÁNH ỨNG VIÊN (HỆ THỐNG)
            </h2>

            <div className="grid grid-cols-2 gap-8 divide-x divide-slate-100">
              {selectedCandidates.map((cand, idx) => (
                <div key={cand.id} className={idx === 1 ? "pl-8" : ""}>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs text-slate-400 uppercase font-bold bg-slate-100 px-2.5 py-1 rounded-md">Candidate #{idx + 1}</span>
                    <div className={`px-3 py-1 rounded-lg border text-sm font-bold shadow-sm ${getScoreColor(cand.match_score)}`}>
                      {(cand.match_score <= 1 ? cand.match_score * 100 : cand.match_score).toFixed(0)}% Match
                    </div>
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-1">{cand.candidate_name}</h3>
                  <p className="text-sm text-indigo-600 mb-6 font-medium">{cand.cv_title}</p>

                  <div className="space-y-4 text-sm">
                    <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100">
                      <h4 className="font-bold text-xs text-indigo-600 uppercase mb-2 flex items-center gap-2"><Check className="w-4 h-4"/> Điểm Mạnh & Phù Hợp</h4>
                      <p className="text-slate-700 leading-relaxed">Phù hợp tuyệt vời với yêu cầu cốt lõi. Có nền tảng vững chắc và kinh nghiệm được hệ thống trích xuất đánh giá cao với vị trí này.</p>
                    </div>

                    <div className="p-5 rounded-2xl bg-amber-50 border border-amber-100">
                      <h4 className="font-bold text-xs text-amber-600 uppercase mb-2 flex items-center gap-2"><Search className="w-4 h-4"/> Điểm Cần Cải Thiện / Rủi Ro</h4>
                      <p className="text-slate-700 leading-relaxed">Cần thời gian làm quen văn hóa và một số tech-stack phụ. Thiếu một vài kỹ năng mềm/leadership theo yêu cầu.</p>
                    </div>

                    <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm mt-6">
                      <h4 className="font-bold text-xs text-slate-500 uppercase mb-4 text-center">Đánh giá nhanh</h4>
                      <div className="flex gap-3">
                        <button
                          onClick={() => {
                            handleStatusUpdate(cand.id, "shortlisted");
                            setIsCompareOpen(false);
                          }}
                          className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 transition-colors shadow-sm shadow-indigo-200"
                        >
                          Duyệt (Shortlist)
                        </button>
                        <button
                          onClick={() => {
                            handleStatusUpdate(cand.id, "rejected");
                            setIsCompareOpen(false);
                          }}
                          className="flex-1 py-2.5 rounded-xl bg-white border border-rose-200 text-rose-600 font-bold text-sm hover:bg-rose-50 hover:border-rose-300 transition-colors shadow-sm"
                        >
                          Loại
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Users(props: any) {
  return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
}
