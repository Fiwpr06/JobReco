"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import {
  User,
  Mail,
  Briefcase,
  FileText,
  Star,
  CheckCircle,
  Edit3,
  Upload,
  ChevronRight,
  ChevronLeft,
  Award,
  MapPin,
  DollarSign,
  Brain,
  TrendingUp,
  Clock,
  Shield,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { CV, CVSkill } from "@/lib/types";

// Sub-components

function SkillPill({ skill }: { skill: CVSkill }) {
  const cfg = PROFICIENCY_CONFIG[skill.proficiency_level] ?? PROFICIENCY_CONFIG.beginner;
  return (
    <motion.div
      whileHover={{ scale: 1.04, y: -2 }}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-medium cursor-default select-none ${cfg.color}`}
    >
      <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
      <span>{skill.skill?.name || `Skill ${skill.skill_id}`}</span>
      {skill.years_experience !== undefined && skill.years_experience > 0 && (
        <span className="opacity-60 text-xs font-normal">{skill.years_experience}yr</span>
      )}
    </motion.div>
  );
}

function CvCard({ cv, isSelected, onSelect }: { cv: CV; isSelected: boolean; onSelect: () => void }) {
  return (
    <motion.div
      whileHover={{ y: -3 }}
      onClick={onSelect}
      className={`relative p-5 rounded-2xl border-2 cursor-pointer transition-all duration-200 ${
        isSelected
          ? "border-indigo-500 bg-indigo-50 shadow-lg shadow-indigo-100"
          : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-md"
      }`}
    >
      {cv.is_primary && (
        <div className="absolute top-3 right-3">
          <Badge className="bg-indigo-600 text-white text-xs px-2 py-0.5 hover:bg-indigo-600">
            <Star className="w-3 h-3 mr-1 fill-current" /> Chính
          </Badge>
        </div>
      )}
      <div className="flex items-start gap-3">
        <div className={`p-2.5 rounded-xl ${isSelected ? "bg-indigo-100" : "bg-slate-100"}`}>
          <FileText className={`w-5 h-5 ${isSelected ? "text-indigo-600" : "text-slate-500"}`} />
        </div>
        <div className="flex-1 min-w-0 pr-16">
          <h3 className="font-semibold text-slate-900 truncate">{cv.title_en}</h3>
          <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{cv.summary_en}</p>
          <div className="flex flex-wrap gap-2 mt-3">
            <span className="flex items-center gap-1 text-xs text-slate-600">
              <Briefcase className="w-3.5 h-3.5" /> {cv.experience_years} năm KN
            </span>
            <span className="flex items-center gap-1 text-xs text-slate-600">
              <Brain className="w-3.5 h-3.5" /> {cv.skills?.length || 0} kỹ năng
            </span>
            {cv.preferred_locations?.[0] && (
              <span className="flex items-center gap-1 text-xs text-slate-600">
                <MapPin className="w-3.5 h-3.5" /> {cv.preferred_locations[0]}
              </span>
            )}
          </div>
        </div>
      </div>
      {isSelected && (
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          className="absolute bottom-3 right-3"
        >
          <CheckCircle className="w-5 h-5 text-indigo-600" />
        </motion.div>
      )}
    </motion.div>
  );
}

// Stat Card

function StatCard({ icon: Icon, label, value, accent = false }: {
  icon: React.ElementType;
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className={`p-5 rounded-2xl border ${accent ? "border-indigo-200 bg-indigo-50" : "border-slate-200 bg-white"}`}>
      <div className={`inline-flex p-2.5 rounded-xl mb-3 ${accent ? "bg-indigo-100" : "bg-slate-100"}`}>
        <Icon className={`w-5 h-5 ${accent ? "text-indigo-600" : "text-slate-600"}`} />
      </div>
      <div className={`text-2xl font-bold ${accent ? "text-indigo-700" : "text-slate-900"}`}>{value}</div>
      <div className="text-sm text-slate-500 mt-0.5">{label}</div>
    </div>
  );
}

// Main Page

const PROFICIENCY_CONFIG = {
  beginner:     { label: "Cơ bản",    color: "bg-slate-700 text-white border-slate-700 shadow-sm",   dot: "bg-white" },
  intermediate: { label: "Trung bình", color: "bg-blue-600 text-white border-blue-600 shadow-sm",     dot: "bg-white" },
  advanced:     { label: "Nâng cao",   color: "bg-indigo-600 text-white border-indigo-600 shadow-sm", dot: "bg-white" },
  expert:       { label: "Chuyên gia", color: "bg-violet-600 text-white border-violet-600 shadow-sm", dot: "bg-white" },
} as const;

export default function ProfilePage() {
  const { data: session } = useSession();
  const user = session?.user;

  const { data: cvs = [], isLoading } = useQuery<CV[]>({
    queryKey: ["myCvs"],
    queryFn: async () => {
      try {
        const res = await api.get("/api/v1/cvs/");
        return res.data?.length ? res.data : [];
      } catch {
        return [];
      }
    },
    retry: 1,
  });

  const primaryCv = cvs.find((c) => c.is_primary) || cvs[0] || null;
  const [selectedCvId, setSelectedCvId] = useState<number | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const [cvPage, setCvPage] = useState(0);
  const itemsPerPage = 4;
  const maxPage = Math.max(0, Math.ceil(cvs.length / itemsPerPage) - 1);
  const activeCvPage = Math.min(cvPage, maxPage);
  const startIndex = activeCvPage * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedCvs = cvs.slice(startIndex, endIndex);

  const displayCv = selectedCvId
    ? cvs.find((c) => c.id === selectedCvId) || primaryCv
    : primaryCv;

  const totalSkills = displayCv?.skills?.length ?? 0;
  const expertSkills = displayCv?.skills?.filter((s) => s.proficiency_level === "expert").length ?? 0;

  const radarData = useMemo(() => {
    const defaultData = [
      { subject: "Ngôn ngữ", score: 0 },
      { subject: "Framework", score: 0 },
      { subject: "Công cụ", score: 0 },
      { subject: "Chuyên môn", score: 0 },
      { subject: "Kỹ năng mềm", score: 0 },
    ];

    if (!displayCv?.skills || displayCv.skills.length === 0) return defaultData;

    const scores: Record<string, { total: number, count: number }> = {
      language: { total: 0, count: 0 },
      framework: { total: 0, count: 0 },
      tool: { total: 0, count: 0 },
      domain: { total: 0, count: 0 },
      soft: { total: 0, count: 0 },
    };

    const proficiencyScore = {
      expert: 100,
      advanced: 75,
      intermediate: 50,
      beginner: 25,
    };

    displayCv.skills.forEach(skill => {
      const cat = skill.skill?.skill_category || "domain";
      const score = proficiencyScore[skill.proficiency_level] || 25;
      if (scores[cat]) {
        scores[cat].total += score;
        scores[cat].count += 1;
      }
    });

    return [
      { subject: "Ngôn ngữ", score: scores.language.count ? Math.round(scores.language.total / scores.language.count) : 0 },
      { subject: "Framework", score: scores.framework.count ? Math.round(scores.framework.total / scores.framework.count) : 0 },
      { subject: "Công cụ", score: scores.tool.count ? Math.round(scores.tool.total / scores.tool.count) : 0 },
      { subject: "Chuyên môn", score: scores.domain.count ? Math.round(scores.domain.total / scores.domain.count) : 0 },
      { subject: "Kỹ năng mềm", score: scores.soft.count ? Math.round(scores.soft.total / scores.soft.count) : 0 },
    ];
  }, [displayCv]);

  // Group skills by proficiency
  const skillsByLevel = {
    expert: displayCv?.skills?.filter((s) => s.proficiency_level === "expert") ?? [],
    advanced: displayCv?.skills?.filter((s) => s.proficiency_level === "advanced") ?? [],
    intermediate: displayCv?.skills?.filter((s) => s.proficiency_level === "intermediate") ?? [],
    beginner: displayCv?.skills?.filter((s) => s.proficiency_level === "beginner") ?? [],
  };

  return (
    <div className="max-w-6xl mx-auto pb-16">
      {/* Hero / Header */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-700 p-8 mb-8 text-white shadow-2xl"
      >
        {/* Background decoration */}
        <div className="absolute top-0 right-0 w-80 h-80 rounded-full bg-white/5 -translate-y-1/2 translate-x-1/3 pointer-events-none" />
        <div className="absolute bottom-0 left-24 w-48 h-48 rounded-full bg-white/5 translate-y-1/2 pointer-events-none" />

        <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-6">
          {/* Avatar */}
          <div className="relative">
            <div className="w-20 h-20 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center text-4xl font-bold shadow-xl ring-4 ring-white/30">
              {user?.name?.charAt(0) ?? "U"}
            </div>
            <div className="absolute -bottom-1.5 -right-1.5 w-6 h-6 rounded-full bg-emerald-400 border-2 border-white flex items-center justify-center">
              <CheckCircle className="w-3 h-3 text-white" />
            </div>
          </div>

          {/* Info */}
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold">{user?.name ?? "Ứng viên"}</h1>
              <Badge className="bg-white/20 text-white border-0 hover:bg-white/30">
                <Shield className="w-3 h-3 mr-1" /> Đã xác thực
              </Badge>
            </div>
            <div className="flex flex-wrap items-center gap-4 mt-2 text-white/75 text-sm">
              <span className="flex items-center gap-1.5">
                <Mail className="w-4 h-4" /> {user?.email ?? "email@example.com"}
              </span>
              {primaryCv && (
                <span className="flex items-center gap-1.5">
                  <Briefcase className="w-4 h-4" /> {primaryCv.experience_years} năm kinh nghiệm
                </span>
              )}
              {primaryCv?.preferred_locations?.[0] && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4" /> {primaryCv.preferred_locations[0]}
                </span>
              )}
            </div>
          </div>

          {/* Edit button */}
          <Link href="/cv/builder">
            <Button
              variant="outline"
              className="border-white/40 bg-white/10 text-white hover:bg-white/20 hover:text-white backdrop-blur"
            >
              <Edit3 className="w-4 h-4 mr-2" /> Chỉnh sửa hồ sơ
            </Button>
          </Link>
        </div>
      </motion.div>

      {/* Stat Row */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
      >
        <StatCard icon={FileText}   label="CV đã tải lên"      value={`${cvs.length}`}       />
        <StatCard icon={Brain}      label="Kỹ năng được hệ thống trích xuất" value={`${totalSkills}`}    accent />
        <StatCard icon={Award}      label="Kỹ năng chuyên gia"  value={`${expertSkills}`}     />
        <StatCard icon={TrendingUp} label="Công việc phù hợp"   value="10"                    accent />
      </motion.div>

      {/* Toggle Button */}
      <div className="flex justify-end mb-4">
        <Button variant="outline" className="bg-white" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
          {isSidebarOpen ? "Thu gọn cột Hồ Sơ" : "Mở rộng cột Hồ Sơ"}
        </Button>
      </div>

      {/* Main grid */}
      <div className={`grid ${isSidebarOpen ? 'lg:grid-cols-5' : 'lg:grid-cols-1'} gap-8`}>

        {/* LEFT COLUMN: CV list + Radar */}
        <AnimatePresence>
          {isSidebarOpen && (
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: "auto" }}
              exit={{ opacity: 0, width: 0 }}
              className="lg:col-span-2 space-y-6"
            >

              {/* CV List */}
          <motion.div
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden"
          >
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="font-bold text-slate-900">Hồ Sơ Của Tôi</h2>
                <p className="text-xs text-slate-500 mt-0.5">Chọn CV để xem kỹ năng tương ứng</p>
              </div>
              <Link href="/cv">
                <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl h-8 px-4 text-xs">
                  <Upload className="w-3.5 h-3.5 mr-1" /> Thêm CV
                </Button>
              </Link>
            </div>

            <div className="p-4 space-y-3">
              {isLoading ? (
                [1, 2].map((i) => (
                  <div key={i} className="h-24 bg-slate-100 rounded-2xl animate-pulse" />
                ))
              ) : (
                paginatedCvs.map((cv) => (
                  <CvCard
                    key={cv.id}
                    cv={cv}
                    isSelected={selectedCvId === cv.id || (!selectedCvId && cv.is_primary)}
                    onSelect={() => setSelectedCvId(cv.id === selectedCvId ? null : cv.id)}
                  />
                ))
              )}
            </div>

            {cvs.length > itemsPerPage && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/40">
                <button
                  disabled={activeCvPage === 0}
                  onClick={() => setCvPage((prev) => Math.max(0, prev - 1))}
                  className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 hover:text-indigo-600 disabled:opacity-40 disabled:hover:text-slate-500 disabled:hover:bg-white transition-all shadow-sm"
                  type="button"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs font-bold text-slate-500">
                  Trang {activeCvPage + 1} / {maxPage + 1}
                </span>
                <button
                  disabled={endIndex >= cvs.length}
                  onClick={() => setCvPage((prev) => Math.min(maxPage, prev + 1))}
                  className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 hover:text-indigo-600 disabled:opacity-40 disabled:hover:text-slate-500 disabled:hover:bg-white transition-all shadow-sm"
                  type="button"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </motion.div>

          {/* Skill Radar Chart */}
          <motion.div
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6"
          >
            <h2 className="font-bold text-slate-900 mb-1">Biểu Đồ Phân Bổ Kỹ Năng</h2>
            <p className="text-xs text-slate-500 mb-4">
              Được hệ thống phân tích từ CV chính của bạn
            </p>
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                  <PolarGrid stroke="#e2e8f0" />
                  <PolarAngleAxis
                    dataKey="subject"
                    tick={{ fill: "#64748b", fontSize: 11, fontFamily: "monospace" }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#fff",
                      borderColor: "#e2e8f0",
                      borderRadius: "12px",
                      fontSize: "13px",
                    }}
                    formatter={(val: any) => [`${val}%`, "Điểm kỹ năng"]}
                  />
                  <Radar
                    name="Kỹ năng"
                    dataKey="score"
                    stroke="#4f46e5"
                    fill="#4f46e5"
                    fillOpacity={0.2}
                    animationBegin={0}
                    animationDuration={900}
                    animationEasing="ease-out"
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2">
              {radarData.map((cat) => (
                <div key={cat.subject} className="flex flex-col items-center bg-slate-50 rounded-xl p-2">
                  <span className="text-xs text-slate-500 text-center">{cat.subject}</span>
                  <span className="text-sm font-bold text-indigo-600">{cat.score}%</span>
                </div>
              ))}
            </div>
          </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
        {/* RIGHT COLUMN: Skill breakdown */}
        <motion.div
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className={`${isSidebarOpen ? 'lg:col-span-3' : 'lg:col-span-1'} space-y-6 w-full`}
        >
          {/* CV Summary */}
          {displayCv?.summary_en && (
            <div className="bg-gradient-to-br from-slate-50 to-indigo-50/30 rounded-3xl border border-slate-200 p-6">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 bg-indigo-100 rounded-lg">
                  <User className="w-4 h-4 text-indigo-600" />
                </div>
                <h2 className="font-bold text-slate-900">Tóm tắt hồ sơ</h2>
                <Badge className="bg-indigo-100 text-indigo-700 border-0 text-xs hover:bg-indigo-100">
                  <Brain className="w-3 h-3 mr-1" /> Tạo bởi hệ thống
                </Badge>
              </div>
              <p className="text-slate-700 leading-relaxed text-sm">{displayCv.summary_en}</p>

              {/* Quick meta */}
              <div className="flex flex-wrap gap-3 mt-4">
                {displayCv.preferred_locations?.map((loc) => (
                  <span key={loc} className="flex items-center gap-1 bg-white border border-slate-200 rounded-full px-3 py-1 text-xs text-slate-600">
                    <MapPin className="w-3.5 h-3.5 text-indigo-500" /> {loc}
                  </span>
                ))}
                {displayCv.preferred_job_types?.map((jt) => (
                  <span key={jt} className="flex items-center gap-1 bg-white border border-slate-200 rounded-full px-3 py-1 text-xs text-slate-600">
                    <Clock className="w-3.5 h-3.5 text-emerald-500" /> {jt}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Skills by Level */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100">
              <h2 className="font-bold text-slate-900">Kỹ Năng Hệ Thống Trích Xuất</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Từ CV <span className="font-medium text-indigo-600">{displayCv?.title_en}</span> • {totalSkills} kỹ năng tổng cộng
              </p>
            </div>

            <div className="p-6 space-y-6">
              <AnimatePresence mode="wait">
                {Object.entries(skillsByLevel).map(([level, skills]) => {
                  if (skills.length === 0) return null;
                  const cfg = PROFICIENCY_CONFIG[level as keyof typeof PROFICIENCY_CONFIG];
                  return (
                    <motion.div
                      key={level}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                          {cfg.label} ({skills.length})
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {skills.map((sk) => (
                          <SkillPill key={sk.skill_id} skill={sk} />
                        ))}
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>

              {totalSkills === 0 && (
                <div className="text-center py-12">
                  <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Brain className="w-7 h-7 text-slate-400" />
                  </div>
                  <p className="text-slate-500 font-medium">Chưa có kỹ năng nào được trích xuất</p>
                  <p className="text-xs text-slate-400 mt-1">Hãy tải lên CV để hệ thống phân tích và trích xuất kỹ năng của bạn.</p>
                  <Link href="/cv" className="mt-4 inline-block">
                    <Button className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl">
                      <Upload className="w-4 h-4 mr-2" /> Tải CV ngay
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid sm:grid-cols-2 gap-4">
            <Link href="/for-you">
              <motion.div
                whileHover={{ y: -3, scale: 1.02 }}
                className="flex items-center justify-between p-5 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-2xl text-white shadow-lg shadow-indigo-200 cursor-pointer group"
              >
                <div>
                  <div className="font-bold">Tìm việc phù hợp</div>
                  <div className="text-xs text-white/75 mt-0.5">Hệ thống gợi ý dựa trên kỹ năng</div>
                </div>
                <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </motion.div>
            </Link>

            <Link href="/cv">
              <motion.div
                whileHover={{ y: -3, scale: 1.02 }}
                className="flex items-center justify-between p-5 bg-white border-2 border-slate-200 rounded-2xl text-slate-900 hover:border-indigo-300 transition-colors cursor-pointer group"
              >
                <div>
                  <div className="font-bold">Cập nhật CV</div>
                  <div className="text-xs text-slate-500 mt-0.5">Tải lên phiên bản mới nhất</div>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" />
              </motion.div>
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
