export default function TestimonialSection() {
    const testimonials = [
        {
            name: 'Nguyễn Văn A',
            role: 'Frontend Developer',
            content: 'JobReco giúp mình tìm được công việc phù hợp chỉ sau vài ngày.',
        },
        {
            name: 'Trần Thị B',
            role: 'UI/UX Designer',
            content: 'Hệ thống phân tích CV rất chính xác và cho mình biết thiếu kỹ năng gì.',
        },
        {
            name: 'Lê Văn C',
            role: 'Sinh viên CNTT',
            content: 'Website đẹp, dễ dùng và định hướng nghề nghiệp rất hữu ích.',
        },
    ]

    return (
        <section className="py-24">
            <div className="mx-auto max-w-7xl px-6">
                
                <div className="text-center">
                
                    <h2 className="text-5xl font-black tracking-tight text-slate-900">
                        Người dùng nói gì?
                    </h2>

                    <p className="mt-6 text-lg text-slate-600">
                        Hàng nghìn ứng viên đã sử dụng JobReco.
                    </p>
                </div>

                <div className="mt-20 grid gap-8 md:grid-cols-3">
                
                    {testimonials.map((item) => (
                        <div
                            key={item.name}
                            className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm"
                        >
                            <p className="text-lg leading-8 text-slate-600">
                                “{item.content}”
                            </p>

                            <div className="mt-8">
                                <h4 className="font-bold text-slate-900">
                                    {item.name}
                                </h4>

                                <p className="text-slate-500">
                                    {item.role}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    )
}