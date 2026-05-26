import { Brain, FileSearch, BriefcaseBusiness, TrendingUp, } from 'lucide-react'

export default function FeaturesSection() {
    const features = [
        {
            icon: Brain,
            title: 'Hệ thống Đánh giá Mức độ Phù hợp',
            description: 'Hệ thống phân tích kỹ năng và kinh nghiệm để tìm công việc phù hợp nhất.',
        },
        {
            icon: FileSearch,
            title: 'Phân tích CV',
            description: 'Tự động đọc CV và trích xuất kỹ năng, học vấn, kinh nghiệm.',
        },
        {
            icon: BriefcaseBusiness,
            title: 'Gợi ý việc làm',
            description: 'Đề xuất công việc theo mức độ tương thích thực tế.',
        },
        {
            icon: TrendingUp,
            title: 'Skill Gap',
            description: 'Phân tích kỹ năng còn thiếu để cải thiện cơ hội nghề nghiệp.',
        },
    ]

    return (
        <section className="py-24">
            <div className="mx-auto max-w-7xl px-6">
                
                <div className="mx-auto max-w-3xl text-center">
                
                    <div className="inline-flex rounded-full border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-medium text-indigo-700">
                        Tính năng nổi bật
                    </div>

                    <h2 className="mt-6 text-5xl font-black tracking-tight text-slate-900">
                        Hệ thống tuyển dụng thông minh
                    </h2>

                    <p className="mt-6 text-lg leading-8 text-slate-600">
                        JobReco giúp ứng viên tìm việc nhanh hơn
                        và doanh nghiệp tìm đúng người phù hợp.
                    </p>
                </div>

                <div className="mt-20 grid gap-8 md:grid-cols-2 xl:grid-cols-4">
                
                    {features.map((feature) => {
                        const Icon = feature.icon

                        return (
                            <div
                                key={feature.title}
                                className="group rounded-3xl border border-slate-200 bg-white p-8 shadow-sm transition hover:-translate-y-2 hover:shadow-xl"
                            >
                                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-r from-indigo-600 to-cyan-500 text-white">
                                    <Icon size={30} />
                                </div>

                                <h3 className="mt-8 text-2xl font-bold text-slate-900">
                                    {feature.title}
                                </h3>

                                <p className="mt-4 leading-7 text-slate-600">
                                    {feature.description}
                                </p>
                            </div>
                        )
                    })}
                </div>
            </div>
        </section>
    )
}