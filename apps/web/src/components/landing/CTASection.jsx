import Link from 'next/link'
import { Upload } from 'lucide-react'

export default function CTASection() {
    return (
        <section className="py-24">
            <div className="mx-auto max-w-6xl px-6">
                
                <div
                    className="overflow-hidden rounded-[40px] bg-cover bg-center px-10 py-16 shadow-2xl"
                    style={{
                        backgroundImage:
                            "url('https://softviet.info/Content/uploads/images/133032048402816795_sanvl.png')",
                    }}
                >

                    <div className="rounded-[32px] bg-black/50 p-10 backdrop-blur-[2px]">
                        <div className="flex flex-col items-center gap-10 md:flex-row">
                            
                            <div className="w-full md:w-3/4">
                                <h2 className="text-4xl font-black leading-tight text-white md:text-5xl">
                                    Sẵn sàng tìm công việc phù hợp?
                                </h2>

                                <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-200">
                                    Upload CV ngay hôm nay và để <b>JobReco</b> giúp bạn
                                    khám phá cơ hội nghề nghiệp tốt nhất,
                                    phù hợp nhất với kỹ năng và định hướng của bạn.
                                </p>
                            </div>

                            <div className="flex w-full justify-center md:w-1/4 md:justify-end">
                                <Link href="/upload"
                                    className="flex items-center justify-center gap-2 rounded-2xl border-2 border-white bg-white/90 px-8 py-4 text-lg font-black text-black shadow-lg transition hover:scale-105 hover:bg-white"
                                >
                                    <Upload size={20} />
                                    Tải lên CV
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}