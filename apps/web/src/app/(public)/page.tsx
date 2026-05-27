"use client";

import { motion } from "framer-motion";
import {
  Sparkles,
  Upload,
  BrainCircuit,
  Brain,
  FileSearch,
  BriefcaseBusiness,
  TrendingUp,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { TrendingSkill } from "@/lib/types";
import { Section } from "@/components/layout/section";
import { Container } from "@/components/layout/container";

export default function LandingPage() {
  const [trends, setTrends] = useState<TrendingSkill[]>([]);
  const [demoJobs, setDemoJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get("/api/v1/skills/trends").catch(() => ({
        data: [
          { name: "ReactJS", growth_rate: 95 },
          { name: "Next.js", growth_rate: 92 },
          { name: "NodeJS", growth_rate: 90 },
        ],
      })),
      api.get("/api/v1/jobs?limit=3").catch(() => ({
        data: [
          { title_vi: "Frontend Developer" },
          { title_vi: "ReactJS Engineer" },
          { title_vi: "UI/UX Developer" },
        ],
      })),
    ])
      .then(([trendsRes, jobsRes]) => {
        setTrends(trendsRes.data);
        setDemoJobs(jobsRes.data?.slice(0, 3) || []);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex-1 bg-base text-primary overflow-x-hidden">
      {/* HERO SECTION */}
      <Section className="relative overflow-hidden pt-32 pb-24">
        <div className="absolute left-0 top-0 h-96 w-96 rounded-full bg-indigo-500/10 blur-[100px] pointer-events-none"></div>
        <div className="absolute right-0 top-0 h-96 w-96 rounded-full bg-cyan-500/10 blur-[100px] pointer-events-none"></div>

        <Container className="grid min-h-[80vh] items-center gap-12 lg:grid-cols-2">
          {/* LEFT */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center lg:text-left"
          >
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-indigo-500/20 bg-indigo-500/5 dark:bg-indigo-500/10 px-4 py-2 text-sm font-medium text-indigo-600 dark:text-indigo-400">
              <Sparkles
                size={16}
                className="text-indigo-600 dark:text-indigo-400 animate-pulse"
              />
              Nền Tảng Đề Xuất Công Việc
            </div>

            <h1 className="text-5xl font-black leading-tight tracking-tight text-primary md:text-7xl">
              Tìm Công Việc
              <span className="font-bold bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
                {" "}
                Phù Hợp{" "}
              </span>
              Với CV Của Bạn
            </h1>

            <p className="mt-8 max-w-2xl text-lg leading-8 text-muted mx-auto lg:mx-0">
              Tải CV lên và để hệ thống phân tích kỹ năng, kinh nghiệm và định
              hướng nghề nghiệp dựa trên mạng thần kinh Graph neural network để
              gợi ý những công việc tốt nhất cho bạn.
            </p>

            <div className="mt-10 flex flex-col gap-4 sm:flex-row justify-center lg:justify-start">
              <Link href="/cv">
                <button className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-8 py-4 font-bold text-white shadow-xl shadow-indigo-200 transition hover:-translate-y-1 hover:bg-indigo-700">
                  Tải CV Lên Ngay <ArrowRight size={20} />
                </button>
              </Link>

              <Link href="/jobs">
                <button className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-2xl border border-border-mid bg-surface px-8 py-4 text-lg font-semibold text-primary transition hover:bg-elevated cursor-pointer">
                  Khám Phá Việc Làm
                  <ArrowRight size={18} />
                </button>
              </Link>
            </div>

            <div className="mt-10 flex items-center justify-center lg:justify-start gap-8">
              <div>
                <h3 className="text-3xl font-black text-primary">100K+</h3>
                <p className="text-muted">Ứng viên</p>
              </div>

              <div className="h-8 w-px bg-border-mid"></div>

              <div>
                <h3 className="text-3xl font-black text-primary">500+</h3>
                <p className="text-muted">Doanh nghiệp</p>
              </div>

              <div className="h-8 w-px bg-border-mid"></div>

              <div>
                <h3 className="text-3xl font-black text-primary">95%</h3>
                <p className="text-muted">Độ phù hợp</p>
              </div>
            </div>
          </motion.div>

          {/* RIGHT */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8 }}
            className="relative"
          >
            <div className="rounded-[32px] border border-border bg-surface/50 p-8 shadow-2xl backdrop-blur-xl">
              <div className="mb-8 flex items-center gap-3">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-r from-indigo-500 to-cyan-500 text-white">
                  <TrendingUp size={28} />
                </div>

                <div>
                  <h3 className="text-xl font-bold text-primary">
                    Xu Hướng Thị Trường
                  </h3>
                  <p className="text-muted">Cập nhật thời gian thực</p>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <h4 className="font-bold text-primary mb-4 flex items-center gap-2">
                    <FileSearch className="w-5 h-5 text-indigo-500" />
                    Kỹ năng được yêu cầu nhiều nhất
                  </h4>
                  <div className="space-y-4">
                    {[
                      { name: "Python", score: 98 },
                      { name: "ReactJS", score: 92 },
                      { name: "Node.js", score: 88 },
                    ].map((skill, idx) => (
                      <div key={idx}>
                        <div className="mb-2 flex justify-between">
                          <span className="font-medium text-primary">
                            {skill.name}
                          </span>
                          <span className="font-bold text-indigo-500">
                            {skill.score}%
                          </span>
                        </div>
                        <div className="h-3 rounded-full bg-elevated">
                          <div
                            className="h-3 rounded-full bg-gradient-to-r from-indigo-500 to-cyan-500"
                            style={{ width: `${skill.score}%` }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-8 rounded-2xl bg-elevated p-5 border border-border-mid">
                  <h4 className="font-bold text-primary mb-3 flex items-center gap-2">
                    <BriefcaseBusiness className="w-5 h-5 text-cyan-500" />
                    Công việc phổ biến
                  </h4>

                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full bg-indigo-500/10 border border-indigo-500/20 px-4 py-2 text-sm font-medium text-indigo-600 dark:text-indigo-400">
                      Software Engineer
                    </span>
                    <span className="rounded-full bg-indigo-500/10 border border-indigo-500/20 px-4 py-2 text-sm font-medium text-indigo-600 dark:text-indigo-400">
                      Data Scientist
                    </span>
                    <span className="rounded-full bg-indigo-500/10 border border-indigo-500/20 px-4 py-2 text-sm font-medium text-indigo-600 dark:text-indigo-400">
                      Frontend Developer
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </Container>
      </Section>

      {/* STATS SECTION */}
      <Section variant="alternate" border="both">
        <Container>
          <div className="grid gap-6 md:grid-cols-4">
            {[
              { value: "100K+", label: "CV đã phân tích" },
              { value: "5K+", label: "Việc làm công nghệ" },
              { value: "95%", label: "Độ chính xác" },
              { value: "24/7", label: "Hệ thống hoạt động liên tục" },
            ].map((item, idx) => (
              <motion.div
                key={idx}
                whileHover={{ y: -5 }}
                className="rounded-3xl border border-border bg-surface p-8 text-center shadow-lg transition-all duration-300"
              >
                <h3 className="bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-5xl font-black text-transparent">
                  {item.value}
                </h3>

                <p className="mt-4 text-lg text-muted">{item.label}</p>
              </motion.div>
            ))}
          </div>
        </Container>
      </Section>

      {/* DYNAMIC SKILL TRENDS SECTION */}
      <section className="py-12 border-b border-border bg-base/50">
        <div className="container mx-auto px-6 mb-6">
          <h3 className="text-sm font-medium text-muted uppercase tracking-widest text-center lg:text-left">
            Kỹ năng đang hot trong tuần
          </h3>
        </div>
        <div className="relative flex overflow-hidden whitespace-nowrap bg-base/50 pb-4 before:absolute before:left-0 before:top-0 before:z-10 before:h-full before:w-8 before:bg-gradient-to-r before:from-base before:to-transparent after:absolute after:right-0 after:top-0 after:z-10 after:h-full after:w-8 after:bg-gradient-to-l after:from-base after:to-transparent">
          {loading ? (
            <div className="flex gap-4 px-6 overflow-x-auto hide-scrollbar w-full">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="h-12 w-36 bg-elevated rounded-full animate-pulse flex-shrink-0"
                />
              ))}
            </div>
          ) : (
            <motion.div
              className="flex gap-4 min-w-max px-6"
              animate={{ x: ["0%", "-50%"] }}
              transition={{ ease: "linear", duration: 25, repeat: Infinity }}
            >
              {[...trends, ...trends].map((trend, i) => (
                <div
                  key={i}
                  className="flex-shrink-0 px-6 py-4 rounded-full border border-border-mid bg-surface flex items-center gap-3 hover:border-indigo-500/50 transition-colors shadow-sm"
                >
                  <span className="font-jetbrains-mono font-medium text-primary">
                    {trend.name}
                  </span>
                  <span className="w-2 h-2 rounded-full bg-success" />
                  <span className="text-xs text-muted">
                    Tăng trưởng: {trend.growth_rate}%
                  </span>
                </div>
              ))}
            </motion.div>
          )}
        </div>
      </section>

      {/* FEATURES SECTION */}
      <Section className="relative">
        <div className="absolute right-0 bottom-0 h-96 w-96 rounded-full bg-indigo-500/5 blur-[100px] pointer-events-none"></div>
        <Container>
          <div className="mx-auto max-w-3xl text-center">
            <div className="inline-flex rounded-full border border-indigo-500/20 bg-indigo-500/5 dark:bg-indigo-500/10 px-4 py-2 text-sm font-medium text-indigo-600 dark:text-indigo-400">
              Tính năng nổi bật
            </div>

            <h2 className="mt-6 text-5xl font-fraunces font-black tracking-tight text-primary">
              Hệ thống tuyển dụng thông minh
            </h2>

            <p className="mt-6 text-lg leading-8 text-muted">
              JobReco giúp ứng viên tìm việc nhanh hơn và doanh nghiệp tìm đúng
              người phù hợp nhất dựa trên năng lực.
            </p>
          </div>

          <div className="mt-20 grid gap-8 md:grid-cols-2 xl:grid-cols-4">
            {[
              {
                icon: Brain,
                title: "Đối sánh thông minh",
                description:
                  "Thuật toán Graph neural network so khớp kỹ năng và học vấn của bạn để lọc ra việc tương thích.",
              },
              {
                icon: FileSearch,
                title: "Phân tích CV",
                description:
                  "Tự động trích xuất thông tin, kỹ năng, kinh nghiệm từ CV PDF nhanh chóng và chính xác.",
              },
              {
                icon: BriefcaseBusiness,
                title: "Gợi ý việc làm",
                description:
                  "Bảng tin đề xuất được cá nhân hóa và xếp hạng theo điểm số tương thích thực tế.",
              },
              {
                icon: TrendingUp,
                title: "Phân tích lỗ hổng kỹ năng",
                description:
                  "Hiển thị trực quan những kỹ năng còn thiếu kèm theo lộ trình học tập tối ưu nhất.",
              },
            ].map((feature, idx) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={idx}
                  whileHover={{ y: -8 }}
                  className="group rounded-3xl border border-border bg-surface p-8 shadow-sm transition-all duration-300 hover:border-indigo-500/40 hover:shadow-indigo-500/5"
                >
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-r from-indigo-500 to-cyan-500 text-white shadow-lg">
                    <Icon size={30} />
                  </div>

                  <h3 className="mt-8 text-2xl font-bold text-primary">
                    {feature.title}
                  </h3>

                  <p className="mt-4 leading-7 text-muted">
                    {feature.description}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </Container>
      </Section>

      {/* HOW IT WORKS SECTION */}
      <Section variant="alternate" border="both">
        <Container>
          <div className="text-center">
            <h2 className="text-5xl font-fraunces font-black tracking-tight text-primary">
              JobReco hoạt động như thế nào?
            </h2>

            <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-muted">
              Chỉ với vài bước đơn giản, hệ thống thông minh của chúng tôi sẽ
              giúp bạn mở rộng cơ hội nghề nghiệp.
            </p>
          </div>

          <div className="mt-20 grid gap-8 md:grid-cols-3">
            {[
              {
                step: "01",
                title: "Tải lên CV",
                description:
                  "Tải CV PDF/DOCX hiện có của bạn lên hệ thống chỉ với một cú nhấp chuột.",
              },
              {
                step: "02",
                title: "Hệ Thống Phân Tích",
                description:
                  "Mô hình học máy tự động trích xuất từ khóa, sơ đồ kỹ năng và độ phủ kinh nghiệm thực tế.",
              },
              {
                step: "03",
                title: "Nhận Đề Xuất",
                description:
                  "Nhận ngay danh sách công việc đề xuất tối ưu cùng các kỹ năng cần bổ sung.",
              },
            ].map((step, idx) => (
              <div
                key={idx}
                className="relative rounded-3xl border border-border bg-surface p-10 hover:border-cyan-500/30 transition-colors"
              >
                <div className="absolute -top-5 left-8 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-r from-indigo-500 to-cyan-500 font-bold text-white shadow-md">
                  {step.step}
                </div>

                <h3 className="mt-8 text-3xl font-black text-primary">
                  {step.title}
                </h3>

                <p className="mt-6 text-lg leading-8 text-muted">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </Container>
      </Section>

      {/* TESTIMONIALS SECTION */}
      <Section className="relative">
        <div className="absolute left-0 bottom-0 h-96 w-96 rounded-full bg-cyan-500/5 blur-[100px] pointer-events-none"></div>
        <Container>
          <div className="text-center">
            <h2 className="text-5xl font-fraunces font-black tracking-tight text-primary">
              Được tin dùng bởi cộng đồng
            </h2>

            <p className="mt-6 text-lg text-muted">
              Xem ứng viên và doanh nghiệp nói gì về hiệu quả kết nối từ
              JobReco.
            </p>
          </div>

          <div className="mt-20 grid gap-8 md:grid-cols-3">
            {[
              {
                name: "Trần Minh Tuấn",
                role: "Frontend Developer",
                content:
                  "JobReco giúp tôi khớp chuẩn các kỹ năng React và Next.js. Tìm được job ưng ý chỉ sau 3 ngày upload CV!",
              },
              {
                name: "Nguyễn Thị Hương",
                role: "Data Analyst",
                content:
                  "Khả năng chỉ ra Skill Gap cực kỳ đáng giá. Nhờ hệ thống mà tôi biết mình cần bổ sung thêm kỹ năng Docker và SQL nâng cao.",
              },
              {
                name: "Lê Hoàng Nam",
                role: "Tech Lead @ KMS",
                content:
                  "Nền tảng giúp lọc đúng ứng viên có năng lực tương thích cao, giảm thiểu đáng kể thời gian phỏng vấn và đào tạo.",
              },
            ].map((item, idx) => (
              <div
                key={idx}
                className="rounded-3xl border border-border bg-surface p-8 shadow-md hover:border-indigo-500/30 transition-all duration-300"
              >
                <p className="text-lg leading-8 text-muted italic">
                  “{item.content}”
                </p>

                <div className="mt-8 border-t border-border-mid pt-4">
                  <h4 className="font-bold text-primary">{item.name}</h4>

                  <p className="text-indigo-600 dark:text-indigo-400 text-sm">
                    {item.role}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Container>
      </Section>

      {/* CTA SECTION */}
      <Section>
        <Container size="sm">
          <div
            className="overflow-hidden rounded-[40px] bg-cover bg-center shadow-2xl relative"
            style={{
              backgroundImage:
                "url('https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=1200&auto=format&fit=crop')",
            }}
          >
            <div className="absolute inset-0 bg-black/75 backdrop-blur-[1px]"></div>

            <div className="relative p-10 md:p-16">
              <div className="flex flex-col items-center gap-10 md:flex-row">
                <div className="w-full md:w-3/4 text-center md:text-left">
                  <h2 className="text-4xl font-fraunces font-black leading-tight text-white md:text-5xl">
                    Sẵn sàng tìm công việc phù hợp?
                  </h2>

                  <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-300">
                    Tải CV ngay hôm nay để hệ thống của chúng tôi
                    giúp bạn mở khóa những cơ hội nghề nghiệp tốt nhất thị
                    trường.
                  </p>
                </div>

                <div className="flex w-full justify-center md:w-1/4 md:justify-end">
                  <Link href="/cv">
                    <button className="flex items-center justify-center gap-2 rounded-2xl border-2 border-indigo-500 bg-indigo-600 px-8 py-4 text-lg font-black text-white shadow-xl transition hover:scale-105 hover:bg-indigo-500 cursor-pointer">
                      <Upload size={20} />
                      Tải lên CV
                    </button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </Container>
      </Section>
    </div>
  );
}
