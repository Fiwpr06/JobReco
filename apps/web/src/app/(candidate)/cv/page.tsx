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
import SkillGraphVisualization from "@/components/demo/skill-graph-visualization";
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
  
  const [currentStage, setCurrentStage] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (msg: string) => {
    setLogs(prev => [...prev, `[${new Date().toISOString().split('T')[1].substring(0, 8)}] ${msg}`]);
  };

  useEffect(() => {
    const el = document.getElementById('log-container');
    if (el) el.scrollTop = el.scrollHeight;
  }, [logs]);

  const processText = async (text: string) => {
    if (!text.trim()) {
      toast.error("Không thể đọc nội dung CV!");
      setStatus('idle');
      return;
    }
    try {
      const payload = {
        title_en: "Uploaded Resume Profile",
        raw_text_vi: text,
        raw_text_en: "",
        experience_years: 0,
        current_salary_vnd: null,
        expected_salary_min_vnd: null,
        expected_salary_max_vnd: null,
        preferred_locations: [],
        preferred_job_types: [],
        is_primary: true,
        skills: [],
      };

      const { getSession } = await import("next-auth/react");
      const session = await getSession();

      let res;
      if (session) {
        res = await api.post("/api/v1/cvs", payload);
      } else {
        res = await api.post("/api/v1/cvs/analyze", payload);
      }

      setExtractedCv(res.data);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Phân tích CV thất bại!");
      setStatus('idle');
    }
  };

  const startAnalysisSequence = (uploadedFile: File) => {
    let delay = 0;
    setLogs(['[HỆ THỐNG] Đang khởi tạo FASTART Matching Engine v2.4...']);

    UPLOAD_STAGES.forEach((stage, index) => {
      setTimeout(() => {
        setCurrentStage(stage.id);
        addLog(`> ${stage.name}...`);
        if (stage.message) addLog(`  ${stage.message}`);
      }, delay);
      delay += stage.duration_ms;
    });

    // Complete
    setTimeout(() => {
      addLog('> Xử lý hoàn tất.');
      setStatus('complete');
    }, delay + 500);
  };

  const processFile = async (uploadedFile: File) => {
    setStatus('analyzing');
    startAnalysisSequence(uploadedFile);

    const name = uploadedFile.name.toLowerCase();
    const ext = name.split(".").pop();
    if (["pdf", "docx", "jpg", "jpeg", "png"].includes(ext || "")) {
      try {
        const formData = new FormData();
        formData.append("file", uploadedFile);
        const res = await fetch("/api/parse-cv", {
          method: "POST",
          body: formData,
        });
        if (res.ok) {
          const data = await res.json();
          await processText(data.text || "");
        } else {
          toast.error("Lỗi khi parse file CV.");
          setStatus('idle');
        }
      } catch (err) {
        console.error(err);
        toast.error("Không thể kết nối đến server phân tích.");
        setStatus('idle');
      }
    } else {
      toast.error(
        "Định dạng không được hỗ trợ. Vui lòng tải lên file .pdf, .docx, hoặc ảnh (.png, .jpg)"
      );
      setStatus('idle');
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
            Upload CV để AI phân tích kỹ năng và gợi ý công việc.
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
              Tính năng phân tích CV bằng AI hiện chỉ khả dụng cho thành viên. Vui lòng đăng nhập để sử dụng.
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

        {status === 'analyzing' && (
          <motion.div
            key="analyzing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="flex flex-col xl:flex-row gap-8 w-full"
          >
            {/* Cột trái: Terminal */}
            <div className="w-full xl:w-1/2 space-y-6">
                <div className="flex items-center gap-3 mb-6 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                    <BrainCircuit className="w-8 h-8 text-indigo-600" />
                    <h2 className="text-xl font-bold text-slate-900 tracking-wide">
                    HỆ THỐNG ĐANG PHÂN TÍCH
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
                <div className="bg-[#0f172a] rounded-2xl overflow-hidden shadow-xl">
                    <div className="bg-[#1e293b] px-4 py-3 border-b border-[#334155] flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-500"></div>
                        <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                        <div className="w-3 h-3 rounded-full bg-green-500"></div>
                        <span className="text-xs text-slate-400 ml-4 font-mono">Terminal ~ fastart-engine-v2</span>
                    </div>
                    <div id="log-container" className="p-5 h-[320px] overflow-y-auto font-mono text-sm space-y-2">
                        {logs.map((log, i) => (
                        <motion.div 
                            initial={{ opacity: 0, x: -10 }} 
                            animate={{ opacity: 1, x: 0 }} 
                            key={i} 
                            className={log.startsWith('>') ? 'text-cyan-400 mt-3 font-bold' : log.includes('Found') || log.includes('tìm thấy') ? 'text-green-400' : 'text-slate-300'}
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
            </div>

            {/* Cột phải: Graph */}
            <motion.div 
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                className="w-full xl:w-1/2 flex items-center justify-center overflow-hidden rounded-3xl"
            >
                <div className="w-full h-full min-h-[500px]">
                    <SkillGraphVisualization />
                </div>
            </motion.div>
          </motion.div>
        )}

        {status === 'complete' && file && extractedCv && (
          <motion.div
            key="complete"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mt-2 rounded-[32px] border border-slate-200 bg-white p-10 shadow-sm"
          >
            <div className="flex items-center gap-5">
              <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-indigo-100 text-indigo-600">
                <FileText size={40} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">{file.name}</h3>
                <p className="mt-2 text-slate-500">
                  {(file.size / 1024).toFixed(2)} KB
                </p>
              </div>
            </div>

            {/* AI ANALYSIS */}
            <div className="mt-10 grid gap-8 lg:grid-cols-1">
              {/* SKILLS */}
              <div className="rounded-3xl bg-slate-50 p-8">
                <div className="mb-6 flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-r from-indigo-600 to-cyan-500 text-white">
                    <Brain size={20} />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900">
                    Kỹ Năng Đã Trích Xuất ({extractedCv.skills?.length || 0})
                  </h3>
                </div>

                {extractedCv.skills && extractedCv.skills.length > 0 ? (
                  <div className="flex flex-wrap gap-3">
                    {extractedCv.skills.map((item: any, idx: number) => (
                      <span
                        key={idx}
                        className="rounded-full bg-indigo-100 px-5 py-3 font-medium text-indigo-600"
                      >
                        {item.skill?.name_vi || item.skill?.name || "Kỹ năng"}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-500 italic">Không tìm thấy kỹ năng nào trong CV.</p>
                )}
              </div>
            </div>

            {/* RECOMMENDATIONS LINK */}
            <div className="mt-10 border-t border-slate-200 pt-8 flex items-center justify-between">
              <div className="flex items-center gap-2 text-emerald-600">
                <CheckCircle size={20} />
                <span className="font-bold text-lg">
                  Đã phân tích hồ sơ thành công
                </span>
              </div>
              <button
                onClick={() => router.push("/for-you")}
                className="rounded-2xl bg-indigo-600 px-8 py-4 font-bold text-white shadow-lg transition hover:-translate-y-1 hover:bg-indigo-700 flex items-center gap-2"
              >
                Xem công việc phù hợp nhất <ChevronRight size={20} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
