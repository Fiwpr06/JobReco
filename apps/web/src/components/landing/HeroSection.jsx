import { motion } from 'framer-motion'
import { Sparkles, Upload, BrainCircuit } from 'lucide-react'

export default function HeroSection() {
    return (
        <section className="relative overflow-hidden">
        
            <div className="absolute left-0 top-0 h-96 w-96 rounded-full bg-indigo-300/20 blur-3xl"></div>

            <div className="absolute right-0 top-0 h-96 w-96 rounded-full bg-cyan-300/20 blur-3xl"></div>

            <div className="mx-auto grid min-h-[90vh] max-w-7xl items-center gap-12 px-6 py-20 lg:grid-cols-2">
                
                {/* LEFT */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                >
                    <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-medium text-indigo-700">
                        <Sparkles size={16} />
                        Nền Tảng Đề Xuất Công Việc
                    </div>

                    <h1 className="text-5xl font-black leading-tight tracking-tight text-slate-900 md:text-7xl">
                        Tìm Công Việc
                        <span className="font-bold text-indigo-700">
                            {' '}Phù Hợp{' '}
                        </span>
                        Với CV
                    </h1>

                    <p className="mt-8 max-w-2xl text-lg leading-8 text-slate-600">
                        Upload CV và để JobReco phân tích kỹ năng,
                        kinh nghiệm và định hướng nghề nghiệp để
                        gợi ý những công việc phù hợp nhất dành cho bạn.
                    </p>

                    <div className="mt-10 flex flex-col gap-4 sm:flex-row">
                        
                        <button className="flex items-center justify-center gap-2 rounded-2xl border-2 border-indigo-600 bg-white px-8 py-4 text-lg font-black text-black shadow-md transition hover:scale-105 hover:bg-slate-50">
                            <Upload size={20} />
                            Upload CV
                        </button>

                        <button className="rounded-2xl border border-slate-300 bg-white px-8 py-4 text-lg font-semibold text-slate-700 transition hover:bg-slate-100">
                            Khám Phá Việc Làm
                        </button>
                    </div>

                    <div className="mt-10 flex items-center gap-8">
                        
                        <div>
                            <h3 className="text-3xl font-black text-slate-900">
                                10K+
                            </h3>

                            <p className="text-slate-500">
                                Ứng viên
                            </p>
                        </div>

                        <div>
                            <h3 className="text-3xl font-black text-slate-900">
                                500+
                            </h3>

                            <p className="text-slate-500">
                                Doanh nghiệp
                            </p>
                        </div>

                        <div>
                            <h3 className="text-3xl font-black text-slate-900">
                                95%
                            </h3>

                            <p className="text-slate-500">
                                Match Accuracy
                            </p>
                        </div>
                    </div>
                </motion.div>

                {/* RIGHT */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.8 }}
                    className="relative"
                >
                
                    <div className="rounded-[32px] border border-slate-200 bg-white p-8 shadow-2xl shadow-indigo-500/10">
                        
                        <div className="mb-8 flex items-center gap-3">
                            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-r from-indigo-600 to-cyan-500 text-white">
                                <BrainCircuit size={28} />
                            </div>

                            <div>
                                <h3 className="text-xl font-bold text-slate-900">
                                    Phân tích Công việc
                                </h3>

                                <p className="text-slate-500">
                                    Phân tích CV thông minh
                                </p>
                            </div>
                        </div>

                        <div className="space-y-6">
                        
                            <div>
                                <div className="mb-2 flex justify-between">
                                    <span className="font-medium text-slate-700">
                                        Frontend Developer
                                    </span>

                                    <span className="font-bold text-emerald-500">
                                        92%
                                    </span>
                                </div>

                                <div className="h-3 rounded-full bg-slate-100">
                                    <div className="h-3 w-[92%] rounded-full bg-gradient-to-r from-indigo-600 to-cyan-500"></div>
                                </div>
                            </div>

                            <div>
                                <div className="mb-2 flex justify-between">
                                    <span className="font-medium text-slate-700">
                                        ReactJS Engineer
                                    </span>

                                    <span className="font-bold text-emerald-500">
                                        89%
                                    </span>
                                </div>

                                <div className="h-3 rounded-full bg-slate-100">
                                    <div className="h-3 w-[89%] rounded-full bg-gradient-to-r from-indigo-600 to-cyan-500"></div>
                                </div>
                            </div>

                            <div>
                                <div className="mb-2 flex justify-between">
                                    <span className="font-medium text-slate-700">
                                        UI/UX Developer
                                    </span>

                                    <span className="font-bold text-amber-500">
                                        75%
                                    </span>
                                </div>

                                <div className="h-3 rounded-full bg-slate-100">
                                    <div className="h-3 w-[75%] rounded-full bg-gradient-to-r from-indigo-600 to-cyan-500"></div>
                                </div>
                            </div>
                        </div>

                        <div className="mt-8 rounded-2xl bg-slate-50 p-5">
                            <h4 className="font-bold text-slate-900">
                                Kỹ năng còn thiếu
                            </h4>

                            <div className="mt-4 flex flex-wrap gap-3">
                                <span className="rounded-full bg-orange-100 px-4 py-2 text-sm font-medium text-orange-600">
                                    Docker
                                </span>

                                <span className="rounded-full bg-orange-100 px-4 py-2 text-sm font-medium text-orange-600">
                                    CI/CD
                                </span>

                                <span className="rounded-full bg-orange-100 px-4 py-2 text-sm font-medium text-orange-600">
                                    Unit Testing
                                </span>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>
        </section>
    )
}