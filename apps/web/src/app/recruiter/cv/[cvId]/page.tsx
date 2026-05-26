"use client";

import React, { useState } from "react";
import { useParams } from "next/navigation";
import { RecruiterSidebar } from "@/components/recruiter/sidebar";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ChevronLeft, FileText, Download, Check, X,
  ZoomIn, ZoomOut, Star, ShieldCheck, Award
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

// Map cv_id -> thông tin ứng viên và đường dẫn PDF
const CV_DATABASE: Record<number, {
  name: string;
  title: string;
  match_score: number;
  pdf_url: string;
  skills: string[];
  note: string;
}> = {
  999: {
    name: "Ha Trong Phi",
    title: "Bachelor of Science in Information Technology",
    match_score: 0.98,
    pdf_url: "/cv-owner.pdf",
    skills: ["ReactJS", "TypeScript", "NextJS", "SQL", "Git", "HTML/CSS"],
    note: "Hồ sơ học thuật xuất sắc và kỹ năng Frontend rất tốt, hoàn toàn đáp ứng 98% yêu cầu cho vị trí Frontend Developer (Intern/Fresher)."
  },
};

export default function CvViewerPage() {
  const { cvId } = useParams();
  const cv = CV_DATABASE[Number(cvId)];
  const [zoom, setZoom] = useState(100);
  const [shortlisted, setShortlisted] = useState(false);

  if (!cv) {
    return (
      <div className="flex h-screen bg-slate-50 overflow-hidden">
        <RecruiterSidebar />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8 text-slate-400" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">Không tìm thấy CV</h2>
            <p className="text-slate-500 text-sm mb-6">CV này chưa được tải lên hệ thống.</p>
            <Link href="/recruiter/dashboard" className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-colors">
              Quay lại Dashboard
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const scoreColor =
    cv.match_score >= 0.95 ? "text-emerald-700 bg-emerald-100 border-emerald-200" :
    cv.match_score >= 0.75 ? "text-blue-700 bg-blue-100 border-blue-200" :
    "text-amber-700 bg-amber-100 border-amber-200";

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <RecruiterSidebar />

      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <div className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-4">
            <Link
              href={`/recruiter/dashboard`}
              className="inline-flex items-center gap-2 text-slate-500 hover:text-indigo-600 transition-colors text-sm font-semibold"
            >
              <ChevronLeft className="w-4 h-4" /> Quay lại
            </Link>
            <div className="w-px h-6 bg-slate-200" />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-slate-900 text-lg">{cv.name}</h1>
              </div>
              <p className="text-slate-500 text-sm">{cv.title}</p>
            </div>
          </div>

          {/* Action bar */}
          <div className="flex items-center gap-3">
            {/* Zoom controls */}
            <div className="flex items-center gap-2 border border-slate-200 rounded-xl px-3 py-2 bg-slate-50">
              <button
                onClick={() => setZoom(z => Math.max(60, z - 10))}
                className="text-slate-500 hover:text-slate-900 transition-colors"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="text-sm font-semibold text-slate-700 w-10 text-center">{zoom}%</span>
              <button
                onClick={() => setZoom(z => Math.min(150, z + 10))}
                className="text-slate-500 hover:text-slate-900 transition-colors"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
            </div>

            {/* Download */}
            <a
              href={cv.pdf_url}
              download
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-700 font-semibold text-sm hover:bg-slate-50 hover:border-slate-300 transition-colors shadow-sm"
            >
              <Download className="w-4 h-4" /> Tải xuống
            </a>

            {/* Shortlist */}
            <button
              onClick={() => setShortlisted(s => !s)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-sm ${
                shortlisted
                  ? "bg-emerald-600 text-white shadow-emerald-200 hover:bg-emerald-700"
                  : "bg-indigo-600 text-white shadow-indigo-200 hover:bg-indigo-700"
              }`}
            >
              {shortlisted ? <><Check className="w-4 h-4" /> Đã Duyệt</> : <><Check className="w-4 h-4" /> Duyệt Ứng Viên</>}
            </button>
          </div>
        </div>

        {/* Content area: PDF viewer + sidebar */}
        <div className="flex-1 flex overflow-hidden">
          {/* PDF Panel */}
          <div className="flex-1 overflow-auto bg-slate-200 p-6 flex justify-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              style={{ width: `${zoom}%`, maxWidth: "900px", minWidth: "400px" }}
              className="shadow-2xl"
            >
              <iframe
                src={`${cv.pdf_url}#view=FitH`}
                className="w-full rounded-2xl bg-white"
                style={{ height: "calc(100vh - 200px)", minHeight: "600px" }}
                title={`CV của ${cv.name}`}
              />
            </motion.div>
          </div>

          {/* Info Sidebar */}
          <div className="w-80 flex-shrink-0 bg-white border-l border-slate-200 overflow-y-auto p-6">
            {/* Match Score */}
            <div className="mb-6 p-5 rounded-2xl border border-slate-100 bg-gradient-to-br from-slate-50 to-white text-center">
              <p className="text-xs font-bold uppercase text-slate-400 mb-2">Điểm Phù Hợp từ Hệ Thống</p>
              <div className={`text-5xl font-bold ${scoreColor.split(" ")[0]}`}>
                {(cv.match_score * 100).toFixed(0)}%
              </div>
              <div className={`inline-flex items-center gap-1.5 mt-3 px-3 py-1 rounded-full border text-xs font-bold ${scoreColor}`}>
                <Award className="w-3.5 h-3.5" />
                {cv.match_score >= 0.95 ? "Xuất Sắc" : cv.match_score >= 0.75 ? "Tốt" : "Trung Bình"}
              </div>
            </div>

            {/* AI Note */}
            <div className="mb-6 p-4 rounded-2xl bg-indigo-50 border border-indigo-100">
              <div className="flex items-center gap-2 mb-2">
                <ShieldCheck className="w-4 h-4 text-indigo-600" />
                <span className="text-xs font-bold text-indigo-600 uppercase">Hệ Thống Nhận Xét</span>
              </div>
              <p className="text-sm text-slate-700 leading-relaxed">{cv.note}</p>
            </div>

            {/* Skills */}
            <div className="mb-6">
              <h3 className="text-xs font-bold uppercase text-slate-400 mb-3">Kỹ Năng Nổi Bật</h3>
              <div className="flex flex-wrap gap-2">
                {cv.skills.map(s => (
                  <span key={s} className="px-2.5 py-1 bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-semibold">
                    {s}
                  </span>
                ))}
              </div>
            </div>

            {/* Decision buttons */}
            <div className="space-y-3 pt-4 border-t border-slate-100">
              <h3 className="text-xs font-bold uppercase text-slate-400 mb-3">Quyết Định</h3>
              <button
                onClick={() => setShortlisted(true)}
                className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm flex items-center justify-center gap-2 transition-colors shadow-sm shadow-emerald-200"
              >
                <Check className="w-4 h-4" /> Duyệt (Shortlist)
              </button>
              <button className="w-full py-3 rounded-xl bg-white border border-slate-200 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600 text-slate-600 font-bold text-sm flex items-center justify-center gap-2 transition-colors shadow-sm">
                <X className="w-4 h-4" /> Từ Chối
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
