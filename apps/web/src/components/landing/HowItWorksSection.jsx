export default function HowItWorksSection() {
    const steps = [
        {
            step: '01',
            title: 'Upload CV',
            description: 'Người dùng tải CV PDF/DOCX lên hệ thống.',
        },
        {
            step: '02',
            title: 'Hệ thống Phân Tích',
            description: 'Hệ thống phân tích kỹ năng, kinh nghiệm và định hướng nghề nghiệp.',
        },
        {
            step: '03',
            title: 'Job Matching',
            description: 'Hệ thống gợi ý công việc phù hợp theo độ tương thích.',
        },
    ]

    return (
        <section className="bg-white py-24">
            <div className="mx-auto max-w-7xl px-6">
                
                <div className="text-center">
                
                    <h2 className="text-5xl font-black tracking-tight text-slate-900">
                        JobReco hoạt động như thế nào?
                    </h2>

                    <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-600">
                        Chỉ với vài bước đơn giản,
                        Hệ thống sẽ giúp bạn tìm công việc phù hợp nhất.
                    </p>
                </div>

                <div className="mt-20 grid gap-8 md:grid-cols-3">
                
                    {steps.map((step) => (
                        <div
                            key={step.step}
                            className="relative rounded-3xl border border-slate-200 bg-slate-50 p-10"
                        >
                            <div className="absolute -top-5 left-8 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-r from-indigo-600 to-cyan-500 font-bold text-white">
                                {step.step}
                            </div>

                            <h3 className="mt-8 text-3xl font-black text-slate-900">
                                {step.title}
                            </h3>

                            <p className="mt-6 text-lg leading-8 text-slate-600">
                                {step.description}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    )
}