export default function StatsSection() {
    const stats = [
        {
            value: '100K+',
            label: 'CV đã phân tích',
        },
        {
            value: '5K+',
            label: 'Việc làm công nghệ',
        },
        {
            value: '95%',
            label: 'Độ chính xác AI',
        },
        {
            value: '24/7',
            label: 'AI hoạt động',
        },
    ]

    return (
        <section className="py-20">
            <div className="mx-auto max-w-7xl px-6">
                
                <div className="grid gap-6 md:grid-cols-4">
                    
                    {stats.map((item) => (
                        <div
                            key={item.label}
                            className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
                        >
                            <h3 className="bg-gradient-to-r from-indigo-600 to-cyan-500 bg-clip-text text-5xl font-black text-transparent">
                                {item.value}
                            </h3>

                            <p className="mt-4 text-lg text-slate-600">
                                {item.label}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    )
}