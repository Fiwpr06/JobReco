import Link from 'next/link';

export default function Footer() {
    return (
        <footer className="border-t border-slate-200 bg-white">
            <div className="mx-auto max-w-7xl px-6 py-14">
                
                <div className="grid gap-10 md:grid-cols-4">
                
                    <div className="md:col-span-2">
                        
                        <h2 className="text-3xl font-black text-slate-900">
                            JobReco
                        </h2>

                        <p className="mt-4 max-w-md leading-7 text-slate-600">
                            Nền tảng hệ thống giúp phân tích CV và gợi ý công việc
                            phù hợp dành cho sinh viên và người đi làm.
                        </p>
                    </div>

                    <div>
                        <h3 className="font-bold text-slate-900">
                            Sản phẩm
                        </h3>

                        <div className="mt-4 space-y-3 text-slate-600">
                            <p>Hệ thống Đánh giá</p>
                            <p>Skill Gap</p>
                            <p>Dashboard</p>
                            <Link href="/pricing" className="hover:text-indigo-600 transition">Bảng giá</Link>
                        </div>
                    </div>

                    <div>
                        <h3 className="font-bold text-slate-900">
                            Liên hệ
                        </h3>

                        <div className="mt-4 space-y-3 text-slate-600">
                            <p>Email</p>
                            <p>Facebook</p>
                            <p>LinkedIn</p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-center mt-14 border-t border-slate-200 pt-8 text-sm text-slate-500">
                    © 2026 JobReco. All rights reserved.
                </div>
            </div>
        </footer>
    )
}