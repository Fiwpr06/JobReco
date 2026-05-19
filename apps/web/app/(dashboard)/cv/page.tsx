'use client';

import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { UploadCloud, FileText, Brain, Sparkles, ChevronRight, CheckCircle } from 'lucide-react'
import { api } from "@/lib/api";
import { toast } from "sonner";
import Link from "next/link";
import { useRouter } from 'next/navigation';

export default function UploadCVPage() {
    const router = useRouter();
    const [file, setFile] = useState<File | null>(null)
    const [loading, setLoading] = useState(false);
    const [analyzed, setAnalyzed] = useState(false);
    const [extractedCv, setExtractedCv] = useState<any>(null);

    const processText = async (text: string) => {
      if (!text.trim()) {
        toast.error("Không thể đọc nội dung CV!");
        setLoading(false);
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
          preferred_locations: ["Hồ Chí Minh"],
          preferred_job_types: ["Full-time"],
          is_primary: true,
          skills: []
        };

        const { getSession } = await import('next-auth/react');
        const session = await getSession();
        
        let res;
        if (session) {
          res = await api.post('/api/v1/cvs', payload);
          toast.success("AI đã phân tích và lưu CV thành công!");
        } else {
          res = await api.post('/api/v1/cvs/analyze', payload);
          toast.success("AI đã phân tích CV thành công!");
        }
        
        setExtractedCv(res.data);
        setAnalyzed(true);
      } catch (err: any) {
        toast.error("Phân tích thất bại. Sử dụng chế độ demo.");
        setExtractedCv({
          title_en: "Frontend React Developer",
          experience_years: 2.5,
          skills: [
            { skill: { name: "ReactJS", name_vi: "ReactJS" } },
            { skill: { name: "JavaScript", name_vi: "JavaScript" } },
            { skill: { name: "Next.js", name_vi: "Next.js" } },
            { skill: { name: "TailwindCSS", name_vi: "TailwindCSS" } },
            { skill: { name: "NodeJS", name_vi: "NodeJS" } },
          ]
        });
        setAnalyzed(true);
      } finally {
        setLoading(false);
      }
    };

    const processFile = async (uploadedFile: File) => {
      setLoading(true);
      const name = uploadedFile.name.toLowerCase();
      const ext = name.split('.').pop();
      if (['pdf', 'docx', 'jpg', 'jpeg', 'png'].includes(ext || '')) {
        const loadingToast = toast.loading(`Đang đọc file ${ext?.toUpperCase()}...`);
        try {
          const formData = new FormData();
          formData.append('file', uploadedFile);
          const res = await fetch('/api/parse-cv', {
            method: 'POST',
            body: formData,
          });
          if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(`CV parse failed: ${errData.error || res.statusText}`);
          }
          const data = await res.json();
          toast.success("Đã trích xuất nội dung thành công! Đang chuyển cho AI...", { id: loadingToast });
          await processText(data.text || '');
        } catch (err) {
          console.error(err);
          toast.error("Lỗi đọc file. Vui lòng thử lại.", { id: loadingToast });
          setLoading(false);
        }
      } else {
        toast.error("Định dạng không được hỗ trợ. Vui lòng tải lên file .pdf, .docx, hoặc ảnh (.png, .jpg)");
        setLoading(false);
      }
    };

    const onDrop = useCallback((acceptedFiles: File[]) => {
        if (acceptedFiles && acceptedFiles.length > 0) {
            setFile(acceptedFiles[0]);
            setAnalyzed(false);
            processFile(acceptedFiles[0]);
        }
    }, [])

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'application/pdf': ['.pdf'],
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
            'image/jpeg': ['.jpg', '.jpeg'],
            'image/png': ['.png']
        },
        multiple: false,
    })

    return (
        <div className="mx-auto max-w-7xl px-2 pb-16">
        
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

            {/* DROPZONE */}
            <div
                {...getRootProps()}
                className={`cursor-pointer rounded-[32px] border-2 border-dashed p-14 text-center transition ${
                isDragActive
                    ? 'border-indigo-500 bg-indigo-50'
                    : 'border-slate-300 bg-white hover:border-indigo-500/50'
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

            {/* LOADING STATE */}
            {loading && (
                <div className="mt-10 rounded-[32px] border border-slate-200 bg-white p-10 shadow-sm flex flex-col items-center justify-center py-20">
                    <Sparkles size={48} className="text-indigo-500 animate-pulse mb-6" />
                    <h3 className="text-xl font-bold text-slate-900 mb-2">AI Đang Phân Tích...</h3>
                    <p className="text-slate-500 text-sm max-w-xs text-center">
                        Hệ thống đang trích xuất kỹ năng và đối sánh với hàng ngàn công việc phù hợp.
                    </p>
                </div>
            )}

            {/* FILE PREVIEW & ANALYSIS RESULTS */}
            {!loading && file && analyzed && extractedCv && (
                <div className="mt-10 rounded-[32px] border border-slate-200 bg-white p-10 shadow-sm animate-in fade-in zoom-in-95 duration-300">
                
                    <div className="flex items-center gap-5">
                        
                        <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-indigo-100 text-indigo-600">
                            <FileText size={40} />
                        </div>

                        <div>
                        
                            <h3 className="text-xl font-bold text-slate-900">
                                {file.name}
                            </h3>

                            <p className="mt-2 text-slate-500">
                                {(file.size / 1024).toFixed(2)} KB
                            </p>
                        </div>
                    </div>

                    {/* AI ANALYSIS */}
                    <div className="mt-10 grid gap-8 lg:grid-cols-2">
                        
                        {/* SKILLS */}
                        <div className="rounded-3xl bg-slate-50 p-8">
                        
                            <div className="mb-6 flex items-center gap-3">
                                
                                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-r from-indigo-600 to-cyan-500 text-white">
                                    <Brain size={20} />
                                </div>

                                <h3 className="text-xl font-bold text-slate-900">
                                    Kỹ Năng Đã Trích Xuất ({extractedCv.skills?.length || 5})
                                </h3>
                            </div>

                            <div className="flex flex-wrap gap-3">
                                {extractedCv.skills?.map((item: any, idx: number) => (
                                    <span
                                        key={idx}
                                        className="rounded-full bg-indigo-100 px-5 py-3 font-medium text-indigo-600"
                                    >
                                        {item.skill?.name_vi || item.skill?.name || "Kỹ năng"}
                                    </span>
                                )) || (
                                    [
                                        'ReactJS',
                                        'JavaScript',
                                        'TailwindCSS',
                                        'NodeJS',
                                        'Git',
                                        'REST API',
                                    ].map((skill) => (
                                        <span
                                            key={skill}
                                            className="rounded-full bg-indigo-100 px-5 py-3 font-medium text-indigo-600"
                                        >
                                            {skill}
                                        </span>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* MATCH SCORE */}
                        <div className="rounded-3xl bg-slate-50 p-8">
                        
                            <div className="mb-6 flex items-center gap-3">
                                
                                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-r from-indigo-600 to-cyan-500 text-white">
                                    <Sparkles size={20} />
                                </div>

                                <h3 className="text-xl font-bold text-slate-900">
                                    Phân Tích Mức Độ Phù Hợp
                                </h3>
                            </div>

                            <div className="flex items-center gap-6">
                                
                                <div className="flex h-32 w-38 items-center justify-center rounded-full border-[12px] border-indigo-500 text-3xl font-black text-indigo-600">
                                    92%
                                </div>

                                <div>
                                
                                    <h4 className="text-xl font-bold text-slate-900">
                                        Rất phù hợp
                                    </h4>

                                    <p className="mt-3 leading-7 text-slate-600">
                                        Hồ sơ của bạn phù hợp với định hướng công việc {extractedCv.title_en || "Developer"}.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* RECOMMENDATIONS LINK */}
                    <div className="mt-10 border-t border-slate-200 pt-8 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-emerald-600">
                          <CheckCircle size={20} />
                          <span className="font-bold text-lg">Đã phân tích hồ sơ thành công</span>
                        </div>
                        <button onClick={() => router.push('/for-you')} className="rounded-2xl bg-indigo-600 px-8 py-4 font-bold text-white shadow-lg transition hover:-translate-y-1 hover:bg-indigo-700 flex items-center gap-2">
                            Xem công việc phù hợp nhất <ChevronRight size={20} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
