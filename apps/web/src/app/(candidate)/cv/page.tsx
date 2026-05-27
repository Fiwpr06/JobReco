"use client";

import { useCallback, useState, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import {
  UploadCloud,
  FileText,
  Brain,
  Sparkles,
  ChevronRight,
  CheckCircle,
  Loader2,
  Check,
  BrainCircuit
} from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const UPLOAD_STAGES = [
  { id: 1, name: "Trích xuất", duration_ms: 1500, message: "Đang đọc văn bản từ file..." },
  { id: 2, name: "Phân tích NLP", duration_ms: 2000, message: "Đang nhận diện kỹ năng..." },
  { id: 3, name: "Đánh giá", duration_ms: 1500, message: "Tính toán mức độ..." }
];

export default function UploadCVPage() {
  const router = useRouter();
  const { status: sessionStatus } = useSession();
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<'idle' | 'analyzing' | 'complete'>('idle');
  const [extractedCv, setExtractedCv] = useState<any>(null);
  const [cvType, setCvType] = useState<'intern' | 'experienced'>('experienced');
  
  const [currentStage, setCurrentStage] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const [graphData, setGraphData] = useState<any>(null);

  const addLog = (msg: string) => {
    setLogs(prev => [...prev, `[${new Date().toISOString().split('T')[1].substring(0, 8)}] ${msg}`]);
  };

  useEffect(() => {
    const el = document.getElementById('log-container');
    if (el) el.scrollTop = el.scrollHeight;
  }, [logs]);

  const startAnalysisSequence = async (uploadedFile: File) => {
    setStatus('analyzing');
    try {
      setLogs(['[HỆ THỐNG] Đang khởi tạo FASTART Matching Engine v2.4...']);

      // STAGE 1: Trích xuất
      setCurrentStage(1);
      addLog(`> Trích xuất...`);
      addLog(`  Đang đọc văn bản từ file...`);
      const formData = new FormData();
      formData.append("file", uploadedFile);
      const res = await fetch("/api/parse-cv", { method: "POST", body: formData });
      if (!res.ok) throw new Error("Lỗi khi parse file CV");
      const data = await res.json();
      const text = data.text || "";
      addLog(`> Trích xuất hoàn tất. (${text.length} ký tự)`);

      // STAGE 2: Phân tích NLP
      setCurrentStage(2);
      addLog(`> Phân tích NLP...`);
      addLog(`  Đang nhận diện kỹ năng...`);
      
      const payload = {
        title_en: "",
        raw_text_vi: text,
        raw_text_en: "",
        cv_type: cvType,
        experience_years: 0,
        current_salary_vnd: null,
        expected_salary_min_vnd: null,
        expected_salary_max_vnd: null,
        preferred_locations: [],
        preferred_job_types: [],
        is_primary: true, // Will be handled by backend, but we'll manually fetch matches below
        skills: [],
      };

      const { getSession } = await import("next-auth/react");
      const session = await getSession();

      let cvRes;
      if (session) {
        cvRes = await api.post("/api/v1/cvs", payload);
      } else {
        cvRes = await api.post("/api/v1/cvs/analyze", payload);
      }
      
      const createdCv = cvRes.data;
      setExtractedCv(createdCv);
      const extractedSkills = createdCv.skills?.map((s: any) => s.skill?.name || s.skill?.name_vi) || [];
      addLog(`> Phân tích hoàn tất. Đã trích xuất ${extractedSkills.length} kỹ năng.`);

      // Gửi Partial Data
      setGraphData({
        candidate: { name: session?.user?.name || "Ứng viên", major: cvType === 'intern' ? "Thực tập sinh" : "Chuyên gia" },
        current_skills: extractedSkills,
        target_job: { title: "Đang tìm kiếm...", company: "Hệ thống" },
        required_skills: [],
        gap_analysis: { matching_skills: [], missing_skills: [] }
      });

      // STAGE 3: Đánh giá
      setCurrentStage(3);
      addLog(`> Đánh giá...`);
      addLog(`  Tính toán mức độ phù hợp...`);
      
      if (createdCv.id) {
        // If logged in, we have a cv_id, we can match
        const matchRes = await api.post('/api/v1/matching/cv-to-jobs', { cv_id: createdCv.id, top_k: 5 });
        const matchData = matchRes.data;
        addLog(`> Xử lý hoàn tất. Đang xếp hạng Top ${matchData.results?.length || 0} công việc...`);

        if (matchData.results && matchData.results.length > 0) {
          const topMatch = matchData.results[0];
          setGraphData({
            candidate: { name: session?.user?.name || "Ứng viên", major: cvType === 'intern' ? "Thực tập sinh" : "Chuyên gia" },
            current_skills: extractedSkills,
            target_job: { title: topMatch.job_title, company: topMatch.company_name },
            required_skills: [
              ...(topMatch.skill_analysis?.matching_skills || []),
              ...(topMatch.skill_analysis?.missing_required?.map((s: any) => s.skill) || [])
            ],
            gap_analysis: {
              matching_skills: topMatch.skill_analysis?.matching_skills || [],
              missing_skills: (topMatch.skill_analysis?.missing_required || []).map((s: any) => ({
                skill: s.skill,
                estimated_time: s.estimated_learning_time || "2-4 tuần"
              }))
            }
          });
        }
      } else {
        // Guest mode
        addLog(`> Chế độ Khách: Hệ thống yêu cầu đăng nhập để tìm việc.`);
      }

      setStatus('complete');
    } catch (err: any) {
      toast.error(err.message || "Phân tích CV thất bại!");
      setStatus('idle');
    }
  };

  const processFile = async (uploadedFile: File) => {
    const name = uploadedFile.name.toLowerCase();
    const ext = name.split(".").pop();
    if (["pdf", "docx", "jpg", "jpeg", "png"].includes(ext || "")) {
      startAnalysisSequence(uploadedFile);
    } else {
      toast.error("Định dạng không được hỗ trợ. Vui lòng tải lên file .pdf, .docx, hoặc ảnh (.png, .jpg)");
    }
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles && acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
      processFile(acceptedFiles[0]);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
      "image/jpeg": [".jpg", ".jpeg"],
      "image/png": [".png"],
    },
    multiple: false,
  });

  return (
    <div className="mx-auto max-w-7xl px-2 pb-16 min-h-[80vh] flex flex-col">
      {/* HEADER */}
      <div className="mb-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-slate-900">
            Upload CV
          </h1>
          <p className="mt-4 text-lg text-slate-600">
            Upload CV để hệ thống phân tích kỹ năng và gợi ý công việc.
          </p>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {status === 'idle' && sessionStatus === 'unauthenticated' && (
          <motion.div
            key="locked"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="cursor-not-allowed rounded-[32px] border-2 border-slate-200 bg-slate-50 p-14 text-center transition flex flex-col items-center justify-center"
          >
            <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-slate-200 text-slate-500 mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
            </div>
            <h3 className="text-2xl font-black text-slate-900 mb-2">
              Đăng nhập để Upload CV
            </h3>
            <p className="text-lg text-slate-500 mb-6 max-w-md mx-auto">
              Tính năng phân tích CV bằng hệ thống hiện chỉ khả dụng cho thành viên. Vui lòng đăng nhập để sử dụng.
            </p>
            <Link href="/auth/login">
              <Button size="lg" className="rounded-xl px-8 font-bold bg-indigo-600 hover:bg-indigo-700">Đăng nhập ngay</Button>
            </Link>
          </motion.div>
        )}

        {status === 'idle' && sessionStatus === 'authenticated' && (
          <motion.div
            key="dropzone"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, filter: 'blur(10px)' }}
          >
            <div className="mb-6 rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="mb-4 text-lg font-bold text-slate-800">Xác nhận loại CV của bạn:</h3>
              <div className="flex flex-col sm:flex-row gap-4">
                <div
                  onClick={() => setCvType('intern')}
                  className={`flex-1 cursor-pointer rounded-2xl border-2 p-4 transition-all ${
                    cvType === 'intern'
                      ? 'border-indigo-600 bg-indigo-50 shadow-sm'
                      : 'border-slate-200 hover:border-indigo-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`flex h-6 w-6 items-center justify-center rounded-full border-2 ${cvType === 'intern' ? 'border-indigo-600' : 'border-slate-300'}`}>
                      {cvType === 'intern' && <div className="h-3 w-3 rounded-full bg-indigo-600" />}
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">Thực tập sinh (Intern) / Fresher</p>
                      <p className="text-sm text-slate-500">Chưa có hoặc có rất ít kinh nghiệm làm việc.</p>
                    </div>
                  </div>
                </div>

                <div
                  onClick={() => setCvType('experienced')}
                  className={`flex-1 cursor-pointer rounded-2xl border-2 p-4 transition-all ${
                    cvType === 'experienced'
                      ? 'border-indigo-600 bg-indigo-50 shadow-sm'
                      : 'border-slate-200 hover:border-indigo-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`flex h-6 w-6 items-center justify-center rounded-full border-2 ${cvType === 'experienced' ? 'border-indigo-600' : 'border-slate-300'}`}>
                      {cvType === 'experienced' && <div className="h-3 w-3 rounded-full bg-indigo-600" />}
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">Người có kinh nghiệm</p>
                      <p className="text-sm text-slate-500">Đã có kinh nghiệm làm việc thực tế.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div
              {...getRootProps()}
              className={`cursor-pointer rounded-[32px] border-2 border-dashed p-14 text-center transition ${
                isDragActive
                  ? "border-indigo-500 bg-indigo-50"
                  : "border-slate-300 bg-white hover:border-indigo-500/50"
              }`}
            >
              <input {...getInputProps()} />
              <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-r from-indigo-600 to-cyan-500 text-white">
                <UploadCloud size={38} />
              </div>
              <h3 className="mt-8 text-2xl font-black text-slate-900">
                Kéo & thả CV tại đây
              </h3>
              <p className="mt-4 text-lg text-slate-500">
                Hỗ trợ định dạng: pdf, docx, png, jpg
              </p>
            </div>
          </motion.div>
        )}

        {(status === 'analyzing' || status === 'complete') && (
          <motion.div
            key="analyzing-complete"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="flex flex-col xl:flex-row gap-8 w-full"
          >
            {/* Cột trái: Terminal & Actions */}
            <div className="w-full xl:w-1/2 flex flex-col gap-6">
                <div className="flex items-center gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                    <BrainCircuit className="w-8 h-8 text-indigo-600" />
                    <h2 className="text-xl font-bold text-slate-900 tracking-wide">
                        {status === 'complete' ? "PHÂN TÍCH HOÀN TẤT" : "HỆ THỐNG ĐANG PHÂN TÍCH"}
                    </h2>
                </div>

                {/* Stepper */}
                <div className="flex items-center justify-between bg-white border border-slate-200 rounded-2xl p-6 shadow-sm relative overflow-hidden">
                {UPLOAD_STAGES.map((stage, i) => {
                    const isActive = currentStage === stage.id;
                    const isPast = currentStage > stage.id;
                    return (
                    <div key={stage.id} className="flex items-center relative z-10 flex-col gap-3 flex-1">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-500 ${
                        isPast ? 'bg-indigo-100 text-indigo-600 border border-indigo-200' :
                        isActive ? 'bg-cyan-100 text-cyan-600 border border-cyan-200 shadow-lg' :
                        'bg-slate-100 text-slate-400 border border-slate-200'
                        }`}>
                        {isPast ? <Check className="w-6 h-6" /> : 
                        isActive ? <Loader2 className="w-6 h-6 animate-spin" /> : 
                        <span>{stage.id}</span>}
                        </div>
                        <div className={`text-xs font-bold text-center tracking-wider ${isActive ? 'text-cyan-600' : isPast ? 'text-indigo-600' : 'text-slate-400'}`}>
                        {stage.name.toUpperCase()}
                        </div>
                    </div>
                    );
                })}
                {/* Progress Line */}
                <div className="absolute top-[48px] left-[10%] right-[10%] h-1 bg-slate-100 -z-0 rounded-full">
                    <motion.div 
                    className="h-full bg-gradient-to-r from-indigo-500 to-cyan-400 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.max(0, (currentStage - 1) / (UPLOAD_STAGES.length - 1)) * 100}%` }}
                    transition={{ duration: 0.5 }}
                    />
                </div>
                </div>

                {/* Terminal */}
                <div className="bg-[#0f172a] rounded-2xl overflow-hidden shadow-xl flex-1 flex flex-col min-h-[320px]">
                    <div className="bg-[#1e293b] px-4 py-3 border-b border-[#334155] flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-500"></div>
                        <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                        <div className="w-3 h-3 rounded-full bg-green-500"></div>
                        <span className="text-xs text-slate-400 ml-4 font-mono">Terminal ~ fastart-engine-v2</span>
                    </div>
                    <div id="log-container" className="p-5 flex-1 overflow-y-auto font-mono text-sm space-y-2">
                        {logs.map((log, i) => (
                        <motion.div 
                            initial={{ opacity: 0, x: -10 }} 
                            animate={{ opacity: 1, x: 0 }} 
                            key={i} 
                            className={log.startsWith('>') ? 'text-cyan-400 mt-3 font-bold' : log.includes('Found') || log.includes('tìm thấy') || log.includes('Hoàn tất') || log.includes('xếp hạng') ? 'text-green-400' : 'text-slate-300'}
                        >
                            {log}
                        </motion.div>
                        ))}
                        {status === 'analyzing' && (
                          <div className="flex items-center gap-2 text-cyan-400 mt-2 animate-pulse">
                              <span className="w-2 h-4 bg-cyan-400"></span> Đang xử lý...
                          </div>
                        )}
                    </div>
                </div>

                {/* NÚT XEM CÔNG VIỆC KHI HOÀN THÀNH */}
                <AnimatePresence>
                    {status === 'complete' && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mt-2 bg-white border border-emerald-200 rounded-2xl p-6 shadow-sm flex flex-col items-center justify-center text-center"
                        >
                            <div className="flex items-center gap-2 text-emerald-600 mb-4">
                                <CheckCircle size={24} />
                                <span className="font-bold text-lg">
                                Đã phân tích hồ sơ thành công
                                </span>
                            </div>
                            <button
                                onClick={() => {
                                if (sessionStatus === 'unauthenticated') {
                                    router.push("/auth/login?callbackUrl=/for-you");
                                } else {
                                    router.push(extractedCv?.id ? `/for-you?cvId=${extractedCv.id}` : "/for-you");
                                }
                                }}
                                className="w-full max-w-sm rounded-2xl bg-indigo-600 px-8 py-4 font-bold text-white shadow-lg transition hover:-translate-y-1 hover:bg-indigo-700 flex items-center justify-center gap-2"
                            >
                                {sessionStatus === 'unauthenticated' ? "Đăng nhập để xem công việc" : "Xem công việc phù hợp nhất"} <ChevronRight size={20} />
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Cột phải: Kết quả trích xuất CV */}
            <motion.div 
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                className="w-full xl:w-1/2"
            >
                {!extractedCv ? (
                    // SKELETON LOADING KHI ĐANG TRÍCH XUẤT
                    <div className="rounded-[32px] border border-slate-200 bg-white p-8 sm:p-10 shadow-sm animate-pulse h-full">
                        <div className="flex items-center gap-5 mb-10">
                            <div className="h-20 w-20 rounded-3xl bg-slate-200 shrink-0"></div>
                            <div className="flex-1">
                                <div className="h-6 w-3/4 bg-slate-200 rounded mb-3"></div>
                                <div className="h-4 w-1/4 bg-slate-200 rounded"></div>
                            </div>
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2 mb-8">
                            <div className="h-24 bg-slate-100 rounded-2xl"></div>
                            <div className="h-24 bg-slate-100 rounded-2xl"></div>
                        </div>
                        <div className="h-4 w-full bg-slate-200 rounded mb-4"></div>
                        <div className="h-4 w-5/6 bg-slate-200 rounded mb-10"></div>
                        <div className="h-6 w-1/3 bg-slate-200 rounded mb-6"></div>
                        <div className="flex gap-3 flex-wrap">
                            <div className="h-10 w-24 bg-slate-200 rounded-full"></div>
                            <div className="h-10 w-32 bg-slate-200 rounded-full"></div>
                            <div className="h-10 w-20 bg-slate-200 rounded-full"></div>
                            <div className="h-10 w-28 bg-slate-200 rounded-full"></div>
                            <div className="h-10 w-32 bg-slate-200 rounded-full"></div>
                            <div className="h-10 w-24 bg-slate-200 rounded-full"></div>
                        </div>
                    </div>
                ) : (
                    // KẾT QUẢ ĐÃ TRÍCH XUẤT (BẮN DỮ LIỆU RA NGAY KHI CÓ)
                    <div className="rounded-[32px] border border-slate-200 bg-white p-8 sm:p-10 shadow-sm h-full">
                        <div className="flex items-center gap-5 mb-10">
                            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-3xl bg-indigo-100 text-indigo-600">
                                <FileText size={40} />
                            </div>
                            <div className="min-w-0">
                                <h3 className="text-xl font-bold text-slate-900 truncate">{file?.name || "Hồ sơ CV"}</h3>
                                <p className="mt-1 text-slate-500">
                                    {file ? (file.size / 1024).toFixed(2) : 0} KB
                                </p>
                            </div>
                        </div>
                        
                        {/* THÔNG TIN CHUNG */}
                        <div className="mb-8 grid gap-4 sm:grid-cols-2">
                            <div className="rounded-2xl bg-slate-50 p-5 border border-slate-100">
                                <p className="text-sm text-slate-500 mb-1">Vị trí công việc</p>
                                <p className="font-bold text-slate-900 text-lg line-clamp-2">{extractedCv.title_en || extractedCv.title_vi || "Chưa xác định"}</p>
                            </div>
                            <div className="rounded-2xl bg-slate-50 p-5 border border-slate-100">
                                <p className="text-sm text-slate-500 mb-1">Kinh nghiệm</p>
                                <p className="font-bold text-slate-900 text-lg">
                                    {extractedCv.experience_years ? `${extractedCv.experience_years} năm` : "Chưa có / Không xác định"}
                                </p>
                            </div>
                        </div>

                        {/* TÓM TẮT (nếu có) - Đã bỏ theo yêu cầu */}
                        
                        {/* SKILLS */}
                        <div className="rounded-3xl bg-slate-50 p-6 sm:p-8 border border-slate-100">
                            <div className="mb-6 flex items-center gap-3">
                                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-r from-indigo-600 to-cyan-500 text-white shadow-md">
                                    <Brain size={20} />
                                </div>
                                <h3 className="text-xl font-bold text-slate-900">
                                    Kỹ Năng Đã Trích Xuất ({extractedCv.skills?.length || 0})
                                </h3>
                            </div>

                            {extractedCv.skills && extractedCv.skills.length > 0 ? (
                                <div className="flex flex-wrap gap-2 sm:gap-3">
                                {extractedCv.skills.map((item: any, idx: number) => (
                                    <span
                                    key={idx}
                                    className="rounded-full bg-indigo-600 border border-indigo-600 px-4 py-2 sm:px-5 sm:py-2.5 text-sm sm:text-base font-semibold text-white shadow-sm"
                                    >
                                    {item.skill?.name_vi || item.skill?.name || "Kỹ năng"}
                                    </span>
                                ))}
                                </div>
                            ) : (
                                <p className="text-slate-500 italic font-medium">Không tìm thấy kỹ năng nào trong CV.</p>
                            )}
                        </div>
                    </div>
                )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
